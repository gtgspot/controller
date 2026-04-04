# Controller — Dual-AI Text Analysis & Evaluation Engine

A meta-controller system that orchestrates dual-AI text analysis using Claude and GPT-4o, with structured JSON schema-driven evaluation across 15 analytical capabilities.

## Project Structure

```
controller/
├── Capability.json                # 15 analytical capability identifiers
├── AdequacyStatus.json            # adequate | inadequate | partially_adequate | escalated
├── ConfidenceThreshold            # low | medium | high | strict
├── DepthSetting.json              # shallow | standard | forensic | exhaustive
├── Materiality.json               # fatal | high | medium | low | noise
├── CheckpointResult.json          # Checkpoint pass/fail status
├── ControllerDecision.json        # Capability selection + execution params
├── ExecutionTraceItem.json        # Step-by-step execution log
├── FormalDecision.json            # Formal decision template
├── MetaControllerInput.json       # Input validation schema
├── MetaControllerOutput.json      # Full pipeline output
├── TaskClassification.json        # Task type + risk + output classification
├── index/
│   ├── index.html                 # Standalone HTML app (loads React + Babel from CDN)
│   └── index.jsx                  # React app (ES module version)
├── src/
│   └── CapabilityDefinitions      # Master schema: 15 capability specifications
└── mcp-server/                    # Dual-AI eval MCP server (TypeScript)
```

## Schemas

### Enum Types
Simple string enums that define the vocabulary used throughout the system:
- `Capability.json` — 15 analytical capability identifiers
- `AdequacyStatus.json` — adequacy verdict values
- `ConfidenceThreshold` — confidence level settings
- `DepthSetting.json` — analysis depth levels
- `Materiality.json` — finding severity levels

### Domain Objects
Complex object schemas that model the controller's decision pipeline — from input classification through capability selection, execution tracing, and output generation:
- `CheckpointResult.json` — checkpoint pass/fail status
- `ControllerDecision.json` — capability selection + execution params
- `ExecutionTraceItem.json` — step-by-step execution log
- `FormalDecision.json` — formal decision template
- `MetaControllerInput.json` — input validation schema
- `MetaControllerOutput.json` — full pipeline output
- `TaskClassification.json` — task type + risk + output classification

### Capability Definitions (`src/CapabilityDefinitions`)
Master specification for all 15 analytical capabilities, each defining inputs, outputs, constraints, and failure modes:

| Capability | Purpose |
|---|---|
| `ambiguity_scan` | Detect lexical, syntactic, referential, scope ambiguity |
| `implicit_premise_extraction` | Extract unstated premises |
| `rhetorical_move_mapping` | Identify rhetorical operations |
| `pragmatic_inference` | Infer implied meaning |
| `coherence_graph` | Structural dependency mapping |
| `semantic_density_control` | Adjust meaning density |
| `register_detection` | Detect linguistic register and tone |
| `stylometry` | Quantify style features |
| `contradiction_detection` | Detect contradictions |
| `burden_mapping` | Map propositions to burden holder |
| `jurisdictional_precondition_check` | Verify legal preconditions |
| `evidence_source_tracing` | Trace claims to evidence |
| `adversarial_simulation` | Generate opposing responses |
| `materiality_filter` | Rank findings by consequence |
| `remedy_mapping` | Map findings to remedial actions |

## Evaluation Dimensions

The engine scores AI responses across 8 weighted dimensions:

| Dimension | Weight |
|---|---|
| Epistemic Integrity | 20% |
| Reasoning Quality | 20% |
| Instruction Fidelity | 15% |
| Evidence Mapping | 15% |
| Structural Clarity | 10% |
| Technical Precision | 10% |
| Actionability | 5% |
| Risk Awareness | 5% |

## Getting Started

Open `index/index.html` directly in a browser. The app loads React and Babel from CDN — no build step required.

When prompted in the application UI, enter your OpenAI API key. Anthropic/Claude API keys are used server-side by the MCP server and are not configured via the web UI.

## MCP Server

The `mcp-server/` directory contains a TypeScript Model Context Protocol server that dispatches queries to Claude and GPT simultaneously for adversarial matrix evaluation.

### Available Tools

| Tool | Description |
|---|---|
| `eval_classify_domain` | Classify a query as technical, legal, reasoning_heavy, or mixed |
| `eval_dispatch` | Send query to Claude + GPT simultaneously with domain-aware prompts |
| `eval_matrix_evaluate` | Run 8-dimension adversarial matrix evaluation on two responses |
| `eval_synthesise` | Produce single expert output from evaluation results |
| `eval_run_pipeline` | Execute the full 5-stage pipeline end-to-end |
| `eval_score_single` | Score a single response against the matrix (no comparison) |
| `eval_list_capabilities` | List all dimensions, failure modes, domains, and verdicts |

### Local Development

```bash
cd mcp-server
npm install
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
npm run dev
```
