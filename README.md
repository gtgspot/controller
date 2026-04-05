# Controller

A meta-controller system that defines capability schemas, decision models, and provides both a standalone web UI and an MCP (Model Context Protocol) server for adversarial dual-AI evaluation.

## 🚀 Quick Start

**New to this project?** Start with [QUICKSTART.md](QUICKSTART.md) for a streamlined setup guide.

## Overview

This repository contains:

- **Capability Schemas**: JSON schema definitions for controller capabilities, decisions, and execution traces
- **Web UI**: A standalone HTML application for visualizing controller decisions
- **MCP Server**: A Model Context Protocol server that dispatches queries to Claude and GPT simultaneously for adversarial matrix evaluation

## Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **npm**: Comes with Node.js
- **API Keys** (for MCP server):
  - Anthropic API key (`ANTHROPIC_API_KEY`)
  - OpenAI API key (`OPENAI_API_KEY`)

## Quick Start

### 1. Initial Setup

Clone the repository and run the setup command:

```bash
git clone https://github.com/gtgspot/controller.git
cd controller
npm run setup
```

This will install dependencies for the MCP server.

### 2. Configure API Keys

Before running the MCP server, export your API keys:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
```

### 3. Run Components

**Option A: Run the MCP Server**

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm run build
npm start
```

**Option B: Serve the Standalone HTML UI**

The HTML application runs entirely in the browser and requires no build step:

```bash
npm run serve:html
```

Then open http://localhost:8000/index.html in your browser.

Alternatively, you can open `index/index.html` directly in any web browser.

## Repository Structure

```
controller/
├── index/                  # Web UI files
│   ├── index.html         # Standalone vanilla-JS application
│   └── index.jsx          # React component version (deprecated/reference)
├── mcp-server/            # MCP server implementation
│   ├── src/
│   │   └── index.ts       # Server implementation
│   ├── package.json       # Server dependencies
│   └── tsconfig.json      # TypeScript configuration
├── src/
│   └── CapabilityDefinitions  # Master capability specifications
├── *.json                 # Schema definitions (root level)
├── package.json           # Root orchestration scripts
└── CLAUDE.md             # Project context for AI assistants
```

## Components

### Web UI (index/index.html)

A standalone HTML application that visualizes controller decisions and capabilities. It requires no build step and can be:
- Opened directly in a browser
- Served via `npm run serve:html`

**Status**: Active and production-ready

### React JSX (index/index.jsx)

A React component version of the UI. This file is provided as a reference implementation but is **not actively maintained**.

**Status**: Deprecated - use `index.html` instead

If you need to use the React version, you would need to:
1. Set up a bundler (e.g., Vite, webpack)
2. Install React dependencies
3. Configure a build pipeline

### MCP Server (mcp-server/)

A Model Context Protocol server providing dual-AI evaluation capabilities. See [MCP Server Documentation](#mcp-server-features) below.

**Status**: Active and production-ready

## MCP Server Features

The MCP server provides the following tools:

| Tool | Description |
|------|-------------|
| `eval_classify_domain` | Classify a query as technical, legal, reasoning_heavy, or mixed |
| `eval_dispatch` | Send query to Claude + GPT simultaneously with domain-aware prompts |
| `eval_matrix_evaluate` | Run 8-dimension adversarial matrix evaluation on two responses |
| `eval_synthesise` | Produce single expert output from evaluation results |
| `eval_run_pipeline` | Execute the full 5-stage pipeline end-to-end |
| `eval_score_single` | Score a single response against the matrix (no comparison) |
| `eval_list_capabilities` | List all dimensions, failure modes, domains, and verdicts |

## Schema Definitions

JSON schema files in the root directory define the data structures:

- **Capability.json**: Available controller capabilities
- **ControllerDecision.json**: Decision structure
- **FormalDecision.json**: Formal decision schema
- **MetaControllerInput.json**: Input schema for meta-controller
- **MetaControllerOutput.json**: Output schema for meta-controller
- Additional enum and domain schemas

## Development

For detailed development instructions, see [DEVELOPMENT.md](DEVELOPMENT.md).

## License

[Add license information]

## Contributing

[Add contribution guidelines]
