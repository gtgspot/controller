import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import {
  DOMAINS,
  DIMENSIONS,
  FAILURE_MODES,
  VERDICTS,
  type Domain,
  type DimensionScore,
  type MatrixResult,
  type SingleScoreResult,
  getAnthropicClient,
  systemPrompt,
  queryAnthropic,
  queryOpenAI,
  evaluateResponse,
  determineVerdict,
} from "./helpers.js";

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "dual-ai-eval",
  version: "1.0.0",
});

// 1. eval_classify_domain
server.tool(
  "eval_classify_domain",
  "Classify a query as technical, legal, reasoning_heavy, or mixed",
  { query: z.string().describe("The query to classify") },
  async ({ query }) => {
    const client = getAnthropicClient();
    const result = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: `Classify this query into exactly one domain: technical, legal, reasoning_heavy, or mixed. Return ONLY the domain name, nothing else.\n\nQuery: ${query}`,
        },
      ],
    });
    const text = result.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim()
      .toLowerCase();

    const domain = DOMAINS.includes(text as Domain) ? text : "mixed";
    return {
      content: [
        { type: "text" as const, text: JSON.stringify({ query, domain }, null, 2) },
      ],
    };
  }
);

// 2. eval_dispatch
server.tool(
  "eval_dispatch",
  "Send query to Claude and GPT simultaneously with domain-aware prompts",
  {
    query: z.string().describe("The query to dispatch"),
    domain: z
      .enum(DOMAINS)
      .optional()
      .describe("Domain classification (auto-detected if omitted)"),
  },
  async ({ query, domain }) => {
    const effectiveDomain: Domain = domain ?? "mixed";

    const [claudeResponse, gptResponse] = await Promise.all([
      queryAnthropic(query, effectiveDomain),
      queryOpenAI(query, effectiveDomain),
    ]);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              query,
              domain: effectiveDomain,
              claude_response: claudeResponse,
              gpt_response: gptResponse,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// 3. eval_matrix_evaluate
server.tool(
  "eval_matrix_evaluate",
  "Run 8-dimension adversarial matrix evaluation on two responses",
  {
    query: z.string().describe("The original query"),
    claude_response: z.string().describe("Claude's response"),
    gpt_response: z.string().describe("GPT's response"),
    domain: z.enum(DOMAINS).optional().describe("Domain classification"),
  },
  async ({ query, claude_response, gpt_response, domain }) => {
    const effectiveDomain: Domain = domain ?? "mixed";

    const [claudeEval, gptEval] = await Promise.all([
      evaluateResponse(query, claude_response, effectiveDomain, "Claude"),
      evaluateResponse(query, gpt_response, effectiveDomain, "GPT"),
    ]);

    const verdict = determineVerdict(claudeEval.scores, gptEval.scores);
    const allFailures = [
      ...new Set([...claudeEval.failureModes, ...gptEval.failureModes]),
    ];

    const result: MatrixResult = {
      query,
      domain: effectiveDomain,
      claude_scores: claudeEval.scores,
      gpt_scores: gptEval.scores,
      failure_modes_detected: allFailures,
      verdict,
      summary: `Verdict: ${verdict}. Failure modes: ${allFailures.length > 0 ? allFailures.join(", ") : "none detected"}.`,
    };

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

// 4. eval_synthesise
server.tool(
  "eval_synthesise",
  "Produce single expert output from evaluation results",
  {
    query: z.string().describe("The original query"),
    claude_response: z.string().describe("Claude's response"),
    gpt_response: z.string().describe("GPT's response"),
    evaluation: z.string().describe("JSON string of the matrix evaluation result"),
    domain: z.enum(DOMAINS).optional().describe("Domain classification"),
  },
  async ({ query, claude_response, gpt_response, evaluation, domain }) => {
    const effectiveDomain: Domain = domain ?? "mixed";
    const client = getAnthropicClient();

    const synthesisPrompt = `You are an expert synthesiser. Given a query, two AI responses, and their evaluation, produce a single authoritative answer that takes the best elements from both responses and corrects any identified failures.

Query: ${query}
Domain: ${effectiveDomain}

Claude's response:
${claude_response}

GPT's response:
${gpt_response}

Evaluation results:
${evaluation}

Produce the best possible synthesised answer:`;

    const result = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: synthesisPrompt }],
    });

    const text = result.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            { query, domain: effectiveDomain, synthesised_response: text },
            null,
            2
          ),
        },
      ],
    };
  }
);

// 5. eval_run_pipeline
server.tool(
  "eval_run_pipeline",
  "Execute the full 5-stage pipeline end-to-end (classify → dispatch → evaluate → synthesise → report)",
  {
    query: z.string().describe("The query to evaluate"),
    domain: z
      .enum(DOMAINS)
      .optional()
      .describe("Domain override (auto-classified if omitted)"),
  },
  async ({ query, domain }) => {
    // Stage 1: Classify
    let effectiveDomain: Domain = domain ?? "mixed";
    if (!domain) {
      const client = getAnthropicClient();
      const classifyResult = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: `Classify this query into exactly one domain: technical, legal, reasoning_heavy, or mixed. Return ONLY the domain name.\n\nQuery: ${query}`,
          },
        ],
      });
      const classified = classifyResult.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim()
        .toLowerCase();
      if (DOMAINS.includes(classified as Domain)) {
        effectiveDomain = classified as Domain;
      }
    }

    // Stage 2: Dispatch
    const [claudeResponse, gptResponse] = await Promise.all([
      queryAnthropic(query, effectiveDomain),
      queryOpenAI(query, effectiveDomain),
    ]);

    // Stage 3: Evaluate
    const [claudeEval, gptEval] = await Promise.all([
      evaluateResponse(query, claudeResponse, effectiveDomain, "Claude"),
      evaluateResponse(query, gptResponse, effectiveDomain, "GPT"),
    ]);

    const verdict = determineVerdict(claudeEval.scores, gptEval.scores);
    const allFailures = [
      ...new Set([...claudeEval.failureModes, ...gptEval.failureModes]),
    ];

    const evaluation: MatrixResult = {
      query,
      domain: effectiveDomain,
      claude_scores: claudeEval.scores,
      gpt_scores: gptEval.scores,
      failure_modes_detected: allFailures,
      verdict,
      summary: `Verdict: ${verdict}. Failure modes: ${allFailures.length > 0 ? allFailures.join(", ") : "none detected"}.`,
    };

    // Stage 4: Synthesise
    const client = getAnthropicClient();
    const synthesisResult = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `You are an expert synthesiser. Given a query, two AI responses, and their evaluation, produce a single authoritative answer.

Query: ${query}
Domain: ${effectiveDomain}

Claude's response:
${claudeResponse}

GPT's response:
${gptResponse}

Evaluation:
${JSON.stringify(evaluation, null, 2)}

Produce the best possible synthesised answer:`,
        },
      ],
    });

    const synthesised = synthesisResult.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    // Stage 5: Report
    const report = {
      pipeline: "dual-ai-eval",
      stages_completed: [
        "classify",
        "dispatch",
        "evaluate",
        "synthesise",
        "report",
      ],
      query,
      domain: effectiveDomain,
      claude_response: claudeResponse,
      gpt_response: gptResponse,
      evaluation,
      synthesised_response: synthesised,
      verdict,
    };

    return {
      content: [{ type: "text" as const, text: JSON.stringify(report, null, 2) }],
    };
  }
);

// 6. eval_score_single
server.tool(
  "eval_score_single",
  "Score a single response against the evaluation matrix (no comparison)",
  {
    query: z.string().describe("The original query"),
    response: z.string().describe("The response to score"),
    domain: z.enum(DOMAINS).optional().describe("Domain classification"),
  },
  async ({ query, response, domain }) => {
    const effectiveDomain: Domain = domain ?? "mixed";
    const evalResult = await evaluateResponse(
      query,
      response,
      effectiveDomain,
      "Response"
    );

    const overallScore =
      evalResult.scores.reduce((s, d) => s + d.score, 0) /
      (evalResult.scores.length || 1);

    const result: SingleScoreResult = {
      query,
      domain: effectiveDomain,
      scores: evalResult.scores,
      failure_modes_detected: evalResult.failureModes,
      overall_score: Math.round(overallScore * 100) / 100,
      summary: `Overall score: ${overallScore.toFixed(2)}/10. Failure modes: ${evalResult.failureModes.length > 0 ? evalResult.failureModes.join(", ") : "none detected"}.`,
    };

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

// 7. eval_list_capabilities
server.tool(
  "eval_list_capabilities",
  "List all dimensions, failure modes, domains, and verdicts",
  {},
  async () => {
    const capabilities = {
      dimensions: [...DIMENSIONS],
      failure_modes: [...FAILURE_MODES],
      domains: [...DOMAINS],
      verdicts: [...VERDICTS],
      tools: [
        {
          name: "eval_classify_domain",
          description: "Classify a query into a domain",
        },
        {
          name: "eval_dispatch",
          description:
            "Send query to Claude and GPT simultaneously with domain-aware prompts",
        },
        {
          name: "eval_matrix_evaluate",
          description:
            "Run 8-dimension adversarial matrix evaluation on two responses",
        },
        {
          name: "eval_synthesise",
          description:
            "Produce single expert output from evaluation results",
        },
        {
          name: "eval_run_pipeline",
          description: "Execute the full 5-stage pipeline end-to-end",
        },
        {
          name: "eval_score_single",
          description:
            "Score a single response against the matrix (no comparison)",
        },
        {
          name: "eval_list_capabilities",
          description:
            "List all dimensions, failure modes, domains, and verdicts",
        },
      ],
    };

    return {
      content: [
        { type: "text" as const, text: JSON.stringify(capabilities, null, 2) },
      ],
    };
  }
);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("dual-ai-eval MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
