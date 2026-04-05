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
This guide provides detailed information for developers working on the Controller project.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Development Setup](#development-setup)
- [Component Details](#component-details)
- [Building and Testing](#building-and-testing)
- [Project Structure](#project-structure)
- [Adding New Features](#adding-new-features)

## Architecture Overview

The Controller project consists of three main components:

1. **Schema Definitions**: JSON schema files that define the data structures for capabilities, decisions, and execution traces
2. **Web UI**: A standalone HTML/JavaScript application for visualizing controller decisions
3. **MCP Server**: A TypeScript-based MCP server for dual-AI evaluation

### Design Decisions

- **Standalone HTML UI**: The primary UI (`index/index.html`) is a self-contained vanilla JavaScript application that requires no build step, making it easy to deploy and use
- **Deprecated React Version**: The React version (`index/index.jsx`) is kept for reference but is not actively maintained
- **Separate MCP Server**: The MCP server is isolated in its own directory with its own build system and dependencies

## Development Setup

### Initial Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/gtgspot/controller.git
   cd controller
   ```

2. **Install dependencies**:
   ```bash
   npm run setup
   ```

   This will:
   - Install MCP server dependencies (`mcp-server/node_modules`)

3. **Configure environment variables**:

   Create a `.env` file in the `mcp-server/` directory (or export them in your shell):

   ```bash
   ANTHROPIC_API_KEY=sk-ant-...
   OPENAI_API_KEY=sk-...
   ```

### Environment Requirements

- **Node.js**: 18.0.0 or higher
- **TypeScript**: Installed as a dev dependency in mcp-server
- **Modern web browser**: For the HTML UI (Chrome, Firefox, Safari, Edge)

## Component Details

### 1. Web UI (index/index.html)

**Technology Stack**: Vanilla JavaScript, HTML5, CSS3

**How it works**:
- Entirely client-side, no server required
- Loads and validates JSON schemas
- Provides interactive visualization of controller decisions
- Can be opened directly in a browser or served via HTTP

**Development workflow**:
```bash
# Serve the UI locally
npm run serve:html

# Open http://localhost:8000/index.html in your browser
```

**Modifying the UI**:
1. Edit `index/index.html` directly
2. Refresh your browser to see changes
3. No build step required

**Key features**:
- Schema validation
- Interactive decision visualization
- Capability exploration
- Export/import functionality

### 2. React JSX (index/index.jsx)

**Status**: ⚠️ **DEPRECATED** - Reference only

This file contains a React component version of the UI but is **not maintained or integrated** into the build system.

**If you want to use it**:
1. You would need to create a separate React application
2. Set up a bundler (Vite, webpack, or Create React App)
3. Install React dependencies
4. Copy the component code
5. Integrate with your build pipeline

**Recommendation**: Use `index/index.html` instead for all UI needs.

### 3. MCP Server (mcp-server/)

**Technology Stack**: TypeScript, Node.js, MCP SDK, Anthropic SDK, OpenAI SDK

**How it works**:
- Implements the Model Context Protocol
- Dispatches queries to both Claude and GPT-4
- Performs adversarial evaluation using an 8-dimension matrix
- Returns synthesized results

**Development workflow**:

```bash
# Run in development mode (auto-reload with tsx)
npm run dev

# Build TypeScript to JavaScript
npm run build

# Run production build
npm start
```

**Project structure**:
```
mcp-server/
├── src/
│   └── index.ts           # Main server implementation
├── dist/                  # Compiled JavaScript (after build)
├── package.json
├── tsconfig.json
└── .gitignore
```

**Available tools** (exposed via MCP):
- `eval_classify_domain`: Domain classification
- `eval_dispatch`: Dual-AI query dispatch
- `eval_matrix_evaluate`: 8-dimension evaluation
- `eval_synthesise`: Result synthesis
- `eval_run_pipeline`: Full pipeline execution
- `eval_score_single`: Single response scoring
- `eval_list_capabilities`: List available capabilities

**Modifying the server**:
1. Edit files in `mcp-server/src/`
2. Run `npm run dev` for hot-reload during development
3. Run `npm run build` to compile TypeScript
4. Test your changes using an MCP client

**Adding new evaluation dimensions**:
1. Update the evaluation matrix in `src/index.ts`
2. Add new scoring criteria
3. Update the synthesis logic
4. Rebuild and test

## Building and Testing

### Building Each Component

**MCP Server**:
```bash
npm run build:mcp
# or
cd mcp-server && npm run build
```

This compiles TypeScript from `src/` to JavaScript in `dist/`.

**Web UI**:
No build required - it's already production-ready.

### Testing

**Manual testing of the Web UI**:
1. Open `index/index.html` in a browser
2. Test schema loading
3. Test decision visualization
4. Test export/import features

**Testing the MCP server**:
1. Run the server in dev mode: `npm run dev`
2. Use an MCP client (e.g., Claude Desktop, MCP Inspector) to connect
3. Test each tool with sample queries
4. Verify Claude and GPT responses
5. Check evaluation results

**Environment variable validation**:
The MCP server will fail at startup if API keys are missing. Test with:
```bash
# Should fail
npm run dev

# Should succeed
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
npm run dev
```

## Project Structure

### Root Level

```
controller/
├── package.json              # Root orchestration scripts
├── README.md                 # User-facing documentation
├── DEVELOPMENT.md            # This file
├── CLAUDE.md                 # AI assistant context
├── .gitignore                # Git ignore rules
│
├── *.json                    # Schema files (see below)
│
├── index/                    # Web UI
│   ├── index.html           # Active: standalone UI
│   └── index.jsx            # Deprecated: React version
│
├── mcp-server/              # MCP server
│   ├── src/
│   ├── dist/
│   ├── package.json
│   └── tsconfig.json
│
└── src/
    └── CapabilityDefinitions  # Master capability specs
```

### Schema Files (Root Level)

All schema JSON files are currently at the root level:

**Enum Schemas**:
- `AdequacyStatus.json`
- `Capability.json`
- `ConfidenceThreshold`
- `DepthSetting.json`
- `Materiality.json`

**Domain Schemas**:
- `ControllerDecision.json`
- `FormalDecision.json`
- `MetaControllerInput.json`
- `MetaControllerOutput.json`
- `CheckpointResult.json`
- `ExecutionTraceItem.json`
- `TaskClassification.json`

**Note**: These files were previously organized into `schemas/enums/` and `schemas/domain/` directories but were moved to the root level. The `CLAUDE.md` file references the new structure.

## Adding New Features

### Adding a New Schema

1. Create the JSON schema file in the root directory
2. Follow existing schema patterns
3. Update `src/CapabilityDefinitions` if it's a new capability
4. Update the Web UI to handle the new schema (if needed)
5. Update CLAUDE.md documentation

### Adding a New MCP Tool

1. Edit `mcp-server/src/index.ts`
2. Add the new tool definition to the server
3. Implement the tool handler
4. Test with an MCP client
5. Update documentation (README.md and CLAUDE.md)

### Modifying the Web UI

1. Edit `index/index.html`
2. Keep vanilla JavaScript - avoid adding dependencies
3. Test in multiple browsers
4. Ensure it still works when opened directly (file://)

## Running in Production

### MCP Server

```bash
# Build first
npm run build

# Set environment variables
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."

# Run
npm start
```

### Web UI

**Option 1: Direct file access**
- Simply open `index/index.html` in a browser

**Option 2: HTTP server**
```bash
npm run serve:html
```

**Option 3: Integrate with web server**
- Copy `index/index.html` to your web server
- No special configuration needed

## Troubleshooting

### MCP Server Issues

**Problem**: "API key not found" error
- **Solution**: Ensure `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` are exported

**Problem**: "Module not found" errors
- **Solution**: Run `npm run setup` or `cd mcp-server && npm install`

**Problem**: TypeScript compilation errors
- **Solution**: Check `mcp-server/tsconfig.json` and ensure TypeScript is installed

### Web UI Issues

**Problem**: Schemas not loading
- **Solution**: Check browser console for errors; verify JSON schema files exist

**Problem**: UI not displaying correctly
- **Solution**: Ensure you're using a modern browser; check for JavaScript errors

## Best Practices

1. **Schema Changes**: Always validate schema files before committing
2. **MCP Server**: Use TypeScript strict mode for type safety
3. **Web UI**: Keep it dependency-free for maximum portability
4. **Documentation**: Update all relevant docs when making changes (README.md, DEVELOPMENT.md, CLAUDE.md)
5. **API Keys**: Never commit API keys; use environment variables

## Additional Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Anthropic API Documentation](https://docs.anthropic.com/)
- [OpenAI API Documentation](https://platform.openai.com/docs/)
