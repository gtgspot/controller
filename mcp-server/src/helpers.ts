import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DOMAINS = ["technical", "legal", "reasoning_heavy", "mixed"] as const;
export type Domain = (typeof DOMAINS)[number];

export const DIMENSIONS = [
  "accuracy",
  "completeness",
  "clarity",
  "relevance",
  "reasoning_depth",
  "citation_quality",
  "bias_detection",
  "safety",
] as const;

export const FAILURE_MODES = [
  "hallucination",
  "omission",
  "contradiction",
  "over_generalisation",
  "false_confidence",
  "unsafe_content",
] as const;

export const VERDICTS = ["claude_wins", "gpt_wins", "tie", "both_fail"] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DimensionScore {
  dimension: string;
  score: number;
  justification: string;
}

export interface MatrixResult {
  query: string;
  domain: Domain;
  claude_scores: DimensionScore[];
  gpt_scores: DimensionScore[];
  failure_modes_detected: string[];
  verdict: string;
  summary: string;
}

export interface SingleScoreResult {
  query: string;
  domain: Domain;
  scores: DimensionScore[];
  failure_modes_detected: string[];
  overall_score: number;
  summary: string;
}

// ---------------------------------------------------------------------------
// AI Client helpers
// ---------------------------------------------------------------------------

export function getAnthropicClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  return new Anthropic({ apiKey: key });
}

export function getOpenAIClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY environment variable is not set");
  return new OpenAI({ apiKey: key });
}

/** Build a domain-aware system prompt. */
export function systemPrompt(domain: Domain): string {
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

export async function queryAnthropic(query: string, domain: Domain): Promise<string> {
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

export async function queryOpenAI(query: string, domain: Domain): Promise<string> {
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

/** Use Claude as the evaluator to score a response against the matrix. */
export async function evaluateResponse(
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
  const parsed = JSON.parse(jsonMatch[0]) as {
    scores?: DimensionScore[];
    failure_modes?: string[];
  };
  return {
    scores: parsed.scores ?? [],
    failureModes: parsed.failure_modes ?? [],
  };
}

export function determineVerdict(
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
