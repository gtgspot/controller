# Controller — Dual-AI Text Analysis & Evaluation Engine

A meta-controller system that orchestrates dual-AI text analysis using Claude and GPT-4o, with structured JSON schema-driven evaluation across 15 analytical capabilities.

## Project Structure

```
controller/
├── package.json                          # Dependency management
├── public/
│   └── index.html                        # HTML entry point (standalone, CDN-based)
├── schemas/
│   ├── CapabilityDefinitions.json        # Master schema: 15 capability specifications
│   ├── enums/                            # Simple enum type schemas
│   │   ├── AdequacyStatus.json           # adequate | inadequate | partially_adequate | escalated
│   │   ├── Capability.json               # 15 analytical capability identifiers
│   │   ├── ConfidenceThreshold.json      # low | medium | high | strict
│   │   ├── DepthSetting.json             # shallow | standard | forensic | exhaustive
│   │   └── Materiality.json              # fatal | high | medium | low | noise
│   └── domain/                           # Complex object schemas
│       ├── CheckpointResult.json         # Checkpoint pass/fail status
│       ├── ControllerDecision.json       # Capability selection + execution params
│       ├── ExecutionTraceItem.json        # Step-by-step execution log
│       ├── FormalDecision.json           # Formal decision template (13 required fields)
│       ├── MetaControllerInput.json      # Input validation schema
│       ├── MetaControllerOutput.json     # Full pipeline output (8 nested types)
│       └── TaskClassification.json       # Task type + risk + output classification
└── src/
    └── index.jsx                         # React app (ES module version)
```

## Schemas

### Enum Types (`schemas/enums/`)
Simple string enums that define the vocabulary used throughout the system.

### Domain Objects (`schemas/domain/`)
Complex object schemas that model the controller's decision pipeline — from input classification through capability selection, execution tracing, and output generation.

### Capability Definitions (`schemas/CapabilityDefinitions.json`)
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

```bash
npm install
npm run dev
```

Set API keys when prompted in the application UI.
