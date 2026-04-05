# Quick Start Guide

Get started with the Controller project in 3 simple steps.

## 1. Setup (One Command)

```bash
npm run setup
```

This installs all dependencies for the MCP server.

## 2. Configure API Keys

For the MCP server, you need API keys from Anthropic and OpenAI:

**Linux/macOS:**
```bash
export ANTHROPIC_API_KEY="sk-ant-your-key-here"
export OPENAI_API_KEY="sk-your-key-here"
```

**Windows (Command Prompt):**
```cmd
set ANTHROPIC_API_KEY=sk-ant-your-key-here
set OPENAI_API_KEY=sk-your-key-here
```

**Windows (PowerShell):**
```powershell
$env:ANTHROPIC_API_KEY="sk-ant-your-key-here"
$env:OPENAI_API_KEY="sk-your-key-here"
```

## 3. Run What You Need

### Option A: MCP Server (for AI evaluation)

```bash
npm run dev    # Development mode with auto-reload
# OR
npm run build  # Build for production
npm start      # Run production build
```

### Option B: Web UI (for visualization)

```bash
npm run serve:html
```

Then open: http://localhost:8000/index.html

Or simply open `index/index.html` directly in your browser (no server needed).

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run setup` | Install all dependencies |
| `npm run dev` | Run MCP server in development mode |
| `npm run build` | Build MCP server for production |
| `npm start` | Run MCP server (production) |
| `npm run serve:html` | Serve the web UI on port 8000 |
| `npm run clean` | Remove build files and dependencies |

## What's What?

- **MCP Server** (`mcp-server/`): A Model Context Protocol server that sends queries to both Claude and GPT-4 for adversarial evaluation
- **Web UI** (`index/index.html`): A standalone browser application for visualizing controller decisions (no build required)
- **Schemas** (`*.json` at root): JSON schema definitions for capabilities and decisions

## Need More Help?

- **Usage & Setup**: See [README.md](README.md)
- **Development**: See [DEVELOPMENT.md](DEVELOPMENT.md)
- **AI Context**: See [CLAUDE.md](CLAUDE.md)

## Troubleshooting

**"Node.js not found"**
- Install Node.js 18+ from https://nodejs.org/

**"API key not set"**
- Make sure you exported the environment variables (step 2 above)

**"npm: command not found"**
- npm comes with Node.js - reinstall Node.js

**MCP Server won't start**
- Check that you've set both API keys
- Run `npm run setup` first
- Verify Node.js version: `node -v` (must be 18+)

**Web UI doesn't load**
- Try opening `index/index.html` directly in your browser
- Check browser console for errors
- Make sure you're using a modern browser (Chrome, Firefox, Safari, Edge)
