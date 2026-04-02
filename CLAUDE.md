# CLAUDE.md - Project Context for Claude

## Overview
This is the **controller** repository — a meta-controller system that defines capability schemas, decision models, and a web-based UI for controller decisions.

## Repository Structure
- **Root JSON files** (`*.json`): Schema definitions for domain objects (e.g., `Capability.json`, `ControllerDecision.json`, `MetaControllerInput.json`, etc.)
- **`ConfidenceThreshold/`**: Confidence threshold definitions
- **`src/CapabilityDefinitions/`**: Detailed capability definition schemas
- **`index/index.html`**: Standalone vanilla-JS HTML application
- **`index/index.jsx`**: React module version of the application

## Key Concepts
- **Capability**: Defines what the controller can do
- **ControllerDecision / FormalDecision**: Decision schemas for the meta-controller
- **MetaControllerInput / MetaControllerOutput**: Input/output schemas for the meta-controller
- **AdequacyStatus, Materiality, DepthSetting**: Supporting enums and configuration types

## MCP Server (`mcp-server/`)
A Model Context Protocol server that dispatches queries to Claude and GPT simultaneously for adversarial matrix evaluation.

### Available Tools
| Tool | Description |
|------|-------------|
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

## Working With This Repo
- No build system or package manager is configured — the HTML app runs standalone in a browser.
- JSON schema files can be edited directly.
- The React JSX file (`index/index.jsx`) would need a bundler to run in production.
- The MCP server in `mcp-server/` uses TypeScript and can be run with `npm run dev`.
