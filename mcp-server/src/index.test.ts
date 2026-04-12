/**
 * Unit tests for mcp-server helper functions.
 * Run with: npx tsx --test src/index.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DOMAINS,
  DIMENSIONS,
  FAILURE_MODES,
  VERDICTS,
  systemPrompt,
  determineVerdict,
  getAnthropicClient,
  getOpenAIClient,
} from "./helpers.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe("DOMAINS constant", () => {
  it("contains exactly the four expected domains", () => {
    assert.deepEqual([...DOMAINS], ["technical", "legal", "reasoning_heavy", "mixed"]);
  });
});

describe("DIMENSIONS constant", () => {
  it("contains exactly 8 evaluation dimensions", () => {
    assert.equal(DIMENSIONS.length, 8);
  });

  it("includes all expected dimension names", () => {
    const expected = [
      "accuracy",
      "completeness",
      "clarity",
      "relevance",
      "reasoning_depth",
      "citation_quality",
      "bias_detection",
      "safety",
    ];
    assert.deepEqual([...DIMENSIONS], expected);
  });
});

describe("FAILURE_MODES constant", () => {
  it("contains exactly 6 failure modes", () => {
    assert.equal(FAILURE_MODES.length, 6);
  });

  it("includes all expected failure mode names", () => {
    const expected = [
      "hallucination",
      "omission",
      "contradiction",
      "over_generalisation",
      "false_confidence",
      "unsafe_content",
    ];
    assert.deepEqual([...FAILURE_MODES], expected);
  });
});

describe("VERDICTS constant", () => {
  it("contains exactly the four expected verdicts", () => {
    assert.deepEqual([...VERDICTS], ["claude_wins", "gpt_wins", "tie", "both_fail"]);
  });
});

// ---------------------------------------------------------------------------
// systemPrompt
// ---------------------------------------------------------------------------

describe("systemPrompt()", () => {
  it("returns a non-empty string for every domain", () => {
    for (const domain of DOMAINS) {
      const prompt = systemPrompt(domain);
      assert.ok(typeof prompt === "string" && prompt.length > 0, `empty prompt for ${domain}`);
    }
  });

  it("returns distinct prompts for each domain", () => {
    const prompts = DOMAINS.map((d) => systemPrompt(d));
    const unique = new Set(prompts);
    assert.equal(unique.size, DOMAINS.length);
  });

  it("technical prompt mentions code examples", () => {
    assert.ok(systemPrompt("technical").toLowerCase().includes("code"));
  });

  it("legal prompt mentions legislation or case law", () => {
    const p = systemPrompt("legal").toLowerCase();
    assert.ok(p.includes("legislation") || p.includes("case law"));
  });

  it("reasoning_heavy prompt mentions step-by-step", () => {
    assert.ok(systemPrompt("reasoning_heavy").toLowerCase().includes("step"));
  });

  it("mixed prompt does not reference a single specific domain", () => {
    const p = systemPrompt("mixed").toLowerCase();
    assert.ok(!p.includes("legislation") && !p.includes("code example"));
  });
});

// ---------------------------------------------------------------------------
// determineVerdict
// ---------------------------------------------------------------------------

describe("determineVerdict()", () => {
  const mkScores = (score: number, count = 8) =>
    Array.from({ length: count }, (_, i) => ({
      dimension: DIMENSIONS[i % DIMENSIONS.length] as string,
      score,
      justification: "test",
    }));

  it("returns 'claude_wins' when Claude scores clearly higher", () => {
    assert.equal(determineVerdict(mkScores(8), mkScores(5)), "claude_wins");
  });

  it("returns 'gpt_wins' when GPT scores clearly higher", () => {
    assert.equal(determineVerdict(mkScores(5), mkScores(8)), "gpt_wins");
  });

  it("returns 'tie' when scores are within 0.5 of each other", () => {
    assert.equal(determineVerdict(mkScores(7), mkScores(7)), "tie");
    assert.equal(determineVerdict(mkScores(7.2), mkScores(7)), "tie");
  });

  it("returns 'both_fail' when both averages are below 4", () => {
    assert.equal(determineVerdict(mkScores(2), mkScores(3)), "both_fail");
  });

  it("'both_fail' takes priority over individual win even if scores differ", () => {
    // Both averages are below 4, so both_fail regardless of diff
    assert.equal(determineVerdict(mkScores(3.9), mkScores(1)), "both_fail");
  });

  it("handles empty score arrays gracefully (divides by 0 → 0 average → both_fail)", () => {
    assert.equal(determineVerdict([], []), "both_fail");
  });

  it("returns one of the four valid VERDICT values", () => {
    const result = determineVerdict(mkScores(7), mkScores(5));
    assert.ok(
      (VERDICTS as readonly string[]).includes(result),
      `unexpected verdict: ${result}`
    );
  });
});

// ---------------------------------------------------------------------------
// Client factory error handling
// ---------------------------------------------------------------------------

describe("getAnthropicClient()", () => {
  it("throws when ANTHROPIC_API_KEY is not set", () => {
    const saved = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      assert.throws(() => getAnthropicClient(), /ANTHROPIC_API_KEY/);
    } finally {
      if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved;
    }
  });
});

describe("getOpenAIClient()", () => {
  it("throws when OPENAI_API_KEY is not set", () => {
    const saved = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      assert.throws(() => getOpenAIClient(), /OPENAI_API_KEY/);
    } finally {
      if (saved !== undefined) process.env.OPENAI_API_KEY = saved;
    }
  });
});
