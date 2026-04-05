# Development Guide

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | ≥ 18.0.0 | [nodejs.org](https://nodejs.org/) |
| npm | ≥ 9.0.0 | Bundled with Node.js |
| ANTHROPIC_API_KEY | — | Required for MCP server runtime |
| OPENAI_API_KEY | — | Required for MCP server runtime |

---

## Repository Architecture

This repository contains **three architecturally distinct components**:

### 1. MCP Server (`mcp-server/`) — ✅ Production build target
A Model Context Protocol server written in TypeScript that dispatches queries to **Claude** and **GPT** simultaneously and runs an 8-dimension adversarial matrix evaluation.

- **Build system**: Node.js + npm + TypeScript (`tsc`)
- **Entry point**: `mcp-server/src/index.ts`
- **Output**: `mcp-server/dist/index.js`
- **Runtime requirements**: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`

### 2. Frontend HTML (`index/index.html`) — ✅ Static, serve as-is
A self-contained, single-file vanilla JavaScript UI for visualising controller decisions.

- **Build system**: None required
- **Deployment**: Serve the file directly from any HTTP server or open locally in a browser
- **Dependencies**: None (all inline)

### 3. Frontend React (`index/index.jsx`) — 📝 Reference / UI experimentation
A React/JSX version of the controller UI kept as a reference implementation and for future bundled builds.

- **Build system**: Requires an external bundler (e.g. Vite, Webpack) — **not wired up**
- **Status**: Not bundled in production; kept for reference only
- **Do not** use this file as a deployment artefact

---

## Quick Start

### MCP Server (recommended: use Makefile)

```bash
# 1. Install dependencies
make install

# 2. Set required environment variables
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."

# 3. Start in development mode (hot-reload via tsx)
make dev
```

### MCP Server (npm scripts)

```bash
cd mcp-server
npm install

export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."

npm run dev    # development (tsx, hot-reload)
npm run build  # compile TypeScript → dist/
npm run start  # run compiled output
```

### Frontend HTML

No build step is required. Open `index/index.html` directly in a browser, or serve it with any HTTP server:

```bash
# Python (built-in)
python3 -m http.server 8080 --directory index

# Node.js (npx serve)
npx serve index
```

Then navigate to `http://localhost:8080`.

---

## Build Reference

All Makefile targets:

| Target | Description |
|--------|-------------|
| `make help` | Show all available targets |
| `make install` | `npm install` inside `mcp-server/` |
| `make dev` | Run MCP server in dev mode (tsx watch) |
| `make build` | Compile TypeScript → `mcp-server/dist/` |
| `make start` | Run compiled server (`mcp-server/dist/index.js`) |
| `make clean` | Remove `mcp-server/dist/` and `*.tsbuildinfo` |
| `make lint` | Type-check with `tsc --noEmit` |

Equivalent npm scripts (from repo root):

| Script | Description |
|--------|-------------|
| `npm run install:mcp` | Install MCP server dependencies |
| `npm run dev` | Start MCP server in dev mode |
| `npm run build` | Compile MCP server TypeScript |
| `npm run start` | Run compiled MCP server |
| `npm run clean` | Remove build artifacts |
| `npm run lint` | Type-check MCP server |

---

## Environment Variables

Create a `.env` file in `mcp-server/` (never commit it):

```bash
# mcp-server/.env  (example)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

Or export them in your shell before running any `make` / `npm` command:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
```

---

## MCP Server Tools

| Tool | Description |
|------|-------------|
| `eval_classify_domain` | Classify a query as technical, legal, reasoning_heavy, or mixed |
| `eval_dispatch` | Send query to Claude + GPT simultaneously with domain-aware prompts |
| `eval_matrix_evaluate` | Run 8-dimension adversarial matrix evaluation on two responses |
| `eval_synthesise` | Produce single expert output from evaluation results |
| `eval_run_pipeline` | Execute the full 5-stage pipeline end-to-end |
| `eval_score_single` | Score a single response against the matrix (no comparison) |
| `eval_list_capabilities` | List all dimensions, failure modes, domains, and verdicts |

---

## Schema Files

JSON schema definitions live at the repository root and under `src/`:

| File / Directory | Description |
|------------------|-------------|
| `AdequacyStatus.json` | Enum: adequacy status values |
| `Capability.json` | Enum: controller capabilities |
| `ConfidenceThreshold` | Enum: confidence threshold levels |
| `DepthSetting.json` | Enum: analysis depth settings |
| `Materiality.json` | Enum: materiality levels |
| `ControllerDecision.json` | Schema: controller decision object |
| `FormalDecision.json` | Schema: formal decision object |
| `MetaControllerInput.json` | Schema: meta-controller input |
| `MetaControllerOutput.json` | Schema: meta-controller output |
| `CheckpointResult.json` | Schema: checkpoint result |
| `ExecutionTraceItem.json` | Schema: execution trace item |
| `TaskClassification.json` | Schema: task classification |
| `src/CapabilityDefinitions` | Master specification for all 15 analytical capabilities |

---

## Troubleshooting

**`tsc: command not found`**
Run `make install` (or `npm install` inside `mcp-server/`) first — TypeScript is a dev dependency.

**`Error: ANTHROPIC_API_KEY is not set`**
Export the variable in your shell or add it to `mcp-server/.env`.

**`dist/index.js: No such file or directory`**
Run `make build` before `make start`.

**Port already in use**
The MCP server uses stdio transport, not a TCP port. If you see this error it comes from the HTTP server you're using to serve `index/index.html`.
