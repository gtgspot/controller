// deliberationMapper.ts
//
// Pure mapping layer that lives entirely on the CONTROLLER side of the
// controller<->bridge boundary. The bridge (DeliberationResult) is deliberately
// semantics-free: it reports what happened during a multi-model deliberation but
// makes no claim about controller-domain notions such as materiality, adequacy,
// or capability provenance. This function synthesises those controller semantics
// from the raw bridge result so the bridge never has to know about them.
//
// All enum string values below are held EXACTLY to the controller's JSON Schemas
// (Materiality.json, AdequacyStatus.json, Capability.json, ExecutionTraceItem.json,
// MetaControllerOutput.json $defs). Do not invent new members.

import type { DeliberationResult } from "./types/deliberation.js";

// --- Controller enum mirrors (kept identical to the root *.json schemas) -----

/** Materiality.json */
export type Materiality = "fatal" | "high" | "medium" | "low" | "noise";

/** ConfidenceThreshold ($defs) */
export type ConfidenceThreshold = "low" | "medium" | "high" | "strict";

/** AdequacyStatus.json */
export type AdequacyStatus =
  | "adequate"
  | "inadequate"
  | "partially_adequate"
  | "escalated";

/** ExecutionTraceItem.status / CapabilityTraceItem.status */
export type TraceStatus =
  | "executed"
  | "skipped"
  | "blocked"
  | "failed"
  | "escalated";

/** Capability.json — the closed set of controller capabilities. */
export type Capability =
  | "ambiguity_scan"
  | "implicit_premise_extraction"
  | "rhetorical_move_mapping"
  | "pragmatic_inference"
  | "coherence_graph"
  | "semantic_density_control"
  | "register_detection"
  | "stylometry"
  | "contradiction_detection"
  | "burden_mapping"
  | "jurisdictional_precondition_check"
  | "evidence_source_tracing"
  | "adversarial_simulation"
  | "materiality_filter"
  | "remedy_mapping";

// --- Controller semantic shapes (subset of MetaControllerOutput $defs) -------

export interface Finding {
  id: string;
  content: string;
  materiality: Materiality;
  capability_source?: Capability;
  confidence?: ConfidenceThreshold;
}

export interface ExecutionTraceItem {
  step: number;
  capability: Capability;
  status: TraceStatus;
  reason?: string;
}

export interface CapabilityTraceItem {
  capability: Capability;
  status: TraceStatus;
  note?: string;
}

export interface UnresolvedItem {
  issue: string;
  severity?: Materiality;
  recommended_escalation?: Capability;
}

export interface SemanticMapping {
  findings: Finding[];
  capability_trace: CapabilityTraceItem[];
  execution_trace: ExecutionTraceItem[];
  adequacy_status: AdequacyStatus;
  unresolved: UnresolvedItem[];
}

// A deliberation run is a single adversarial simulation from the controller's
// point of view: multiple models argue toward (or fail to reach) agreement.
const CAPABILITY: Capability = "adversarial_simulation";

function snippet(text: string, max = 160): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed.length > max ? `${collapsed.slice(0, max - 1)}…` : collapsed;
}

/**
 * Map a raw bridge {@link DeliberationResult} onto controller semantics.
 *
 * Pure: no I/O, no mutation of the input.
 */
// Map the bridge's 4-tier confidence_tier (from the challenge gate) onto the
// controller's ConfidenceThreshold enum. Returns undefined when absent.
function convergenceConfidence(tier?: string | null): ConfidenceThreshold | undefined {
  switch ((tier ?? "").toLowerCase()) {
    case "high": return "high";
    case "medium": return "medium";
    case "low":
    case "unresolved": return "low";
    default: return undefined;
  }
}

export function mapDeliberationToSemantic(
  result: DeliberationResult
): SemanticMapping {
  const turns = result.turns ?? [];
  const lastIndex = turns.length - 1;

  // --- findings ---------------------------------------------------------------
  const findings: Finding[] = [];

  // The final answer is the head-line finding. NOTE: `materiality` is a REQUIRED,
  // closed enum on Finding ([fatal, high, medium, low, noise]) that the bridge —
  // being semantics-free — cannot supply. We DEFAULT the synthesised head-line
  // finding to "high" here on the controller side.
  findings.push({
    id: `${result.run_id}-final`,
    content: result.final_answer,
    materiality: "high",
    capability_source: CAPABILITY,
    confidence: convergenceConfidence(result.confidence_tier) ?? (result.agreement_reached ? "high" : "medium"),
  });

  // Optionally, one supporting finding per non-final turn (materiality "medium").
  turns.forEach((turn, i) => {
    if (i === lastIndex) return; // the final turn is represented by the head-line finding
    const content = (turn.content ?? "").trim();
    if (!content) return; // Finding.content has minLength 1
    findings.push({
      id: `${result.run_id}-turn-${turn.turn ?? i}`,
      content,
      materiality: "medium",
      capability_source: CAPABILITY,
      confidence: "medium",
    });
  });

  // --- execution_trace --------------------------------------------------------
  const execution_trace: ExecutionTraceItem[] = turns.map((turn, i) => ({
    step: turn.turn ?? i + 1,
    capability: CAPABILITY,
    status: result.completed ? "executed" : "failed",
    reason: `${turn.role ?? "unknown"}/${turn.provider ?? "unknown"}: ${snippet(
      turn.content ?? ""
    )}`,
  }));

  // --- capability_trace -------------------------------------------------------
  // A single roll-up entry for the adversarial_simulation capability exercised.
  const capability_trace: CapabilityTraceItem[] = [
    {
      capability: CAPABILITY,
      status: result.completed ? "executed" : "failed",
      note: `${result.turns_completed} turn(s); agreement=${result.agreement_reached}; convergence=${result.convergence_status ?? "n/a"}; confidence=${result.confidence_tier ?? "n/a"}`,
    },
  ];

  // --- adequacy_status --------------------------------------------------------
  // A safety-stop (safety events on a run that was halted, or a stop_reason that
  // names safety) escalates regardless of the other signals; otherwise map from
  // completion + agreement.
  const stopReason = result.stop_reason ?? "";
  const safetyStop =
    result.safety_events_count > 0 &&
    (!result.completed || /safe|safety|harm|block/i.test(stopReason));

  let adequacy_status: AdequacyStatus;
  const convergence = (result.convergence_status ?? "").toLowerCase();
  if (safetyStop) {
    adequacy_status = "escalated";
  } else if (!result.completed) {
    adequacy_status = "inadequate";
  } else if (convergence) {
    // Prefer the graded terminal convergence signal (challenge gate) over the boolean.
    if (convergence === "converged") adequacy_status = "adequate";
    else if (convergence === "partial" || convergence === "contested") adequacy_status = "partially_adequate";
    else adequacy_status = "inadequate"; // "unresolved"
  } else if (result.agreement_reached) {
    adequacy_status = "adequate";
  } else {
    adequacy_status = "partially_adequate";
  }

  // --- unresolved -------------------------------------------------------------
  const unresolved: UnresolvedItem[] = [];
  if (stopReason) {
    unresolved.push({
      issue: `Deliberation stop_reason: ${stopReason}`,
      severity: result.completed ? "medium" : "high",
      recommended_escalation: CAPABILITY,
    });
  }
  if (result.safety_events_count > 0) {
    unresolved.push({
      issue: `${result.safety_events_count} safety event(s) recorded during deliberation`,
      severity: "high",
      recommended_escalation: CAPABILITY,
    });
  }

  return { findings, capability_trace, execution_trace, adequacy_status, unresolved };
}
