import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { mapDeliberationToSemantic } from "./deliberationMapper.js";

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DOMAINS = ["technical", "legal", "reasoning_heavy", "mixed"] as const;
type Domain = (typeof DOMAINS)[number];

const DIMENSIONS = [
  "accuracy",
  "completeness",
  "clarity",
  "relevance",
  "reasoning_depth",
  "citation_quality",
  "bias_detection",
  "safety",
] as const;

const FAILURE_MODES = [
  "hallucination",
  "omission",
  "contradiction",
  "over_generalisation",
  "false_confidence",
  "unsafe_content",
] as const;

const VERDICTS = ["claude_wins", "gpt_wins", "tie", "both_fail"] as const;

// ---------------------------------------------------------------------------
// AI Client helpers
// ---------------------------------------------------------------------------

function getAnthropicClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  return new Anthropic({ apiKey: key });
}

function getOpenAIClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY environment variable is not set");
  return new OpenAI({ apiKey: key });
}

/** Build a domain-aware system prompt. */
function systemPrompt(domain: Domain): string {
  const domainGuidance: Record<Domain, string> = {
    technical:
      "You are an expert technical assistant. Provide precise, well-structured answers with code examples where appropriate. Cite sources and specifications.",
    legal:
      "You are a legal analysis assistant. Provide thorough analysis of legal principles, cite relevant legislation and case law, and note jurisdictional differences.",
    reasoning_heavy:
      "You are an analytical reasoning assistant. Break down complex problems step-by-step, show your working, and validate conclusions.",
    mixed:
      "You are a knowledgeable assistant. Provide comprehensive, well-reasoned answers drawing on multiple disciplines as needed.",
  };
  return domainGuidance[domain];
}

async function queryAnthropic(query: string, domain: Domain): Promise<string> {
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt(domain),
    messages: [{ role: "user", content: query }],
  });
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

async function queryOpenAI(query: string, domain: Domain): Promise<string> {
  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4096,
    messages: [
      { role: "system", content: systemPrompt(domain) },
      { role: "user", content: query },
    ],
  });
  return response.choices[0]?.message?.content ?? "";
}

// ---------------------------------------------------------------------------
// Evaluation helpers
// ---------------------------------------------------------------------------

interface DimensionScore {
  dimension: string;
  score: number;
  justification: string;
}

interface MatrixResult {
  query: string;
  domain: Domain;
  claude_scores: DimensionScore[];
  gpt_scores: DimensionScore[];
  failure_modes_detected: string[];
  verdict: string;
  summary: string;
}

interface SingleScoreResult {
  query: string;
  domain: Domain;
  scores: DimensionScore[];
  failure_modes_detected: string[];
  overall_score: number;
  summary: string;
}

/** Use Claude as the evaluator to score a response against the matrix. */
async function evaluateResponse(
  query: string,
  response: string,
  domain: Domain,
  label: string
): Promise<{ scores: DimensionScore[]; failureModes: string[] }> {
  const client = getAnthropicClient();
  const evalPrompt = `You are an impartial AI response evaluator. Score the following response on each dimension (1-10) and detect any failure modes.

Query: ${query}
Domain: ${domain}
Response (${label}):
${response}

Dimensions to evaluate: ${DIMENSIONS.join(", ")}
Possible failure modes: ${FAILURE_MODES.join(", ")}

Return ONLY valid JSON in this exact format:
{
  "scores": [{"dimension": "<name>", "score": <1-10>, "justification": "<brief reason>"}],
  "failure_modes": ["<mode1>", ...]
}`;

  const result = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [{ role: "user", content: evalPrompt }],
  });

  const text = result.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { scores: [], failureModes: [] };
  }
  const parsed = JSON.parse(jsonMatch[0]);
  return {
    scores: parsed.scores ?? [],
    failureModes: parsed.failure_modes ?? [],
  };
}

function determineVerdict(
  claudeScores: DimensionScore[],
  gptScores: DimensionScore[]
): string {
  const claudeAvg =
    claudeScores.reduce((s, d) => s + d.score, 0) / (claudeScores.length || 1);
  const gptAvg =
    gptScores.reduce((s, d) => s + d.score, 0) / (gptScores.length || 1);

  const diff = claudeAvg - gptAvg;
  if (claudeAvg < 4 && gptAvg < 4) return "both_fail";
  if (Math.abs(diff) < 0.5) return "tie";
  return diff > 0 ? "claude_wins" : "gpt_wins";
}

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
        {
          name: "eval_deliberate",
          description:
            "Escalate a hard query to the multi-model bridge deliberator and map the result onto controller findings/trace/adequacy",
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

// 8. eval_deliberate
//
// Escalate a hard query to the external multi-model bridge deliberator
// (Claude + ChatGPT + DeepSeek) and map its semantics-free result onto
// controller findings / trace / adequacy via mapDeliberationToSemantic.
//
// Runtime validation of the bridge's DeliberationResult wire contract. Kept in
// lockstep with DeliberationResult.json (root) and the generated types.
const DeliberationResultSchema = z.object({
  run_id: z.string(),
  task: z.string(),
  completed: z.boolean(),
  agreement_reached: z.boolean(),
  stop_reason: z.union([z.string(), z.null()]).optional(),
  turns_completed: z.number(),
  safety_events_count: z.number(),
  final_answer: z.string(),
  turns: z.array(
    z.object({
      turn: z.number().optional(),
      role: z.string().optional(),
      provider: z.string().optional(),
      content: z.string().optional(),
    })
  ),
  cost_totals: z.record(z.unknown()),
  by_provider: z.record(z.unknown()),
  by_purpose: z.record(z.unknown()),
  error: z.string().optional(),
});

server.tool(
  "eval_deliberate",
  "Escalate a hard query to the multi-model bridge deliberator (Claude+ChatGPT+DeepSeek) and map the result onto controller findings/trace/adequacy",
  {
    text: z.string().describe("The hard query to deliberate on"),
    objective: z.string().optional().describe("What a good answer must achieve"),
    domain: z.string().optional().describe("Domain hint for the deliberator"),
    constraints: z
      .array(z.string())
      .optional()
      .describe("Hard constraints the answer must respect"),
    mode: z
      .enum(["standard", "deepseek_solo"])
      .optional()
      .describe("Deliberation mode"),
    max_iterations: z
      .number()
      .optional()
      .describe("Maximum deliberation rounds"),
    max_tokens: z
      .number()
      .optional()
      .describe("Per-turn token cap"),
    final_max_tokens: z
      .number()
      .optional()
      .describe("Token cap for the final synthesised answer"),
    use_context: z
      .boolean()
      .optional()
      .describe("Whether the bridge may use prior context"),
    web_search_enabled: z
      .boolean()
      .optional()
      .describe("Whether the bridge may perform web search"),
  },
  async (input) => {
    const py = process.env.BRIDGE_PYTHON ?? "/Users/spot/bridge/.venv/bin/python";
    const entry = process.env.BRIDGE_ENTRY ?? "/Users/spot/bridge/deliberate.py";

    try {
      const exec = execFileAsync(py, [entry], {
        maxBuffer: 64 * 1024 * 1024,
        timeout: 600000,
        env: process.env,
      });

      // Feed the DeliberateInput JSON to the child over STDIN.
      exec.child.stdin?.end(JSON.stringify(input));

      const { stdout } = await exec;

      // The bridge streams progress; the LAST non-empty stdout line is the
      // JSON DeliberationResult.
      const lines = stdout.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const lastLine = lines[lines.length - 1];
      if (!lastLine) {
        throw new Error("bridge produced no output on stdout");
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(lastLine);
      } catch (parseErr) {
        throw new Error(
          `failed to parse bridge output as JSON: ${(parseErr as Error).message}`
        );
      }

      const result = DeliberationResultSchema.parse(parsed);
      const semantic = mapDeliberationToSemantic(result);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ result, semantic }, null, 2),
          },
        ],
      };
    } catch (err) {
      const e = err as NodeJS.ErrnoException & {
        stdout?: string;
        stderr?: string;
        code?: number | string;
      };
      // On a handled bridge failure, deliberate.py writes {"error": ...} to
      // STDOUT (not stderr) then exits non-zero. execFile rejects on that exit,
      // so recover the bridge's own diagnostic from the last non-empty stdout
      // line rather than losing it behind the generic "Command failed" message.
      let bridgeError: string | undefined;
      if (typeof e?.stdout === "string" && e.stdout.length > 0) {
        const lastOut = e.stdout
          .split(/\r?\n/)
          .filter((l) => l.trim().length > 0)
          .pop();
        if (lastOut) {
          try {
            const parsedErr = JSON.parse(lastOut) as { error?: unknown };
            if (typeof parsedErr?.error === "string") {
              bridgeError = parsedErr.error;
            }
          } catch {
            // stdout tail was not JSON; leave bridgeError undefined.
          }
        }
      }
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                error: "eval_deliberate_failed",
                message: e?.message ?? String(err),
                bridge_error: bridgeError,
                code: e?.code,
                stderr:
                  typeof e?.stderr === "string" && e.stderr.length > 0
                    ? e.stderr
                    : undefined,
              },
              null,
              2
            ),
          },
        ],
      };
    }
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
