# CLAUDE.md - Project Context for Claude

## Overview
This is the **controller** repository — a meta-controller system that defines capability schemas, decision models, and a web-based UI for controller decisions.

## Repository Structure
- **`*.json` (root level)**: Schema definitions for enums and domain objects (AdequacyStatus, Capability, ControllerDecision, FormalDecision, MetaControllerInput/Output, etc.)
- **`src/CapabilityDefinitions`**: Master specification for all 15 analytical capabilities
- **`index/index.html`**: Standalone vanilla-JS HTML application (active, production-ready)
- **`index/index.jsx`**: React module version of the application (deprecated, reference only)
- **`mcp-server/`**: MCP server implementation with TypeScript
- **`scripts/`**: Setup and utility scripts

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

### Quick Start
```bash
# Initial setup
npm run setup

# Configure API keys
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."

# Run MCP server
npm run dev
# OR serve the HTML UI
npm run serve:html
```

### Local Development
See [README.md](README.md) and [DEVELOPMENT.md](DEVELOPMENT.md) for detailed instructions.

## Working With This Repo
- A root `package.json` provides orchestration scripts for setup, development, and build operations
- JSON schema files are located at the root level and can be edited directly
- The HTML app (`index/index.html`) runs standalone in a browser without any build step
- The React JSX file (`index/index.jsx`) is deprecated and kept for reference only
- The MCP server in `mcp-server/` uses TypeScript and can be developed with `npm run dev`
- Use `npm run setup` for one-command environment initialization
