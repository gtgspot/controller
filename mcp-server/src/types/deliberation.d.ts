/* eslint-disable */
/**
 * AUTO-GENERATED — DO NOT EDIT BY HAND.
 * Source: DeliberateInput.json & DeliberationResult.json (wire contract).
 * Regenerate with: npm run codegen:types
 */

export interface DeliberateInput {
  text: string;
  objective?: string;
  domain?: string;
  constraints?: string[];
  mode?: "standard" | "deepseek_solo";
  max_iterations?: number;
  use_context?: boolean;
  web_search_enabled?: boolean;
  max_tokens?: number;
  final_max_tokens?: number;
}

export interface DeliberationResult {
  run_id: string;
  task: string;
  completed: boolean;
  agreement_reached: boolean;
  convergence_status?: string | null;
  confidence_tier?: string | null;
  stop_reason?: string | null;
  turns_completed: number;
  safety_events_count: number;
  final_answer: string;
  turns: {
    turn?: number;
    role?: string;
    provider?: string;
    content?: string;
  }[];
  cost_totals: {};
  by_provider: {};
  by_purpose: {};
  error?: string;
}
