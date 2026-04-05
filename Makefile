.PHONY: help install dev build start clean lint

MCP_DIR := mcp-server

help: ## Show all available targets
	@echo "controller — build targets"
	@echo ""
	@echo "  MCP Server ($(MCP_DIR)/):"
	@echo "    make install   Install MCP server dependencies"
	@echo "    make dev       Run MCP server in development mode (tsx watch)"
	@echo "    make build     Compile MCP server TypeScript → dist/"
	@echo "    make start     Run compiled MCP server (requires: make build)"
	@echo "    make clean     Remove MCP server build artifacts (dist/)"
	@echo "    make lint      Type-check MCP server TypeScript (no emit)"
	@echo ""
	@echo "  Frontend (index/):"
	@echo "    index/index.html  Static file — open directly in a browser, no build needed"
	@echo "    index/index.jsx   Reference/UI experimentation code — not bundled"
	@echo ""
	@echo "  Environment variables required for MCP server:"
	@echo "    ANTHROPIC_API_KEY   sk-ant-..."
	@echo "    OPENAI_API_KEY      sk-..."

install: ## Install MCP server dependencies
	cd $(MCP_DIR) && npm install

dev: ## Run MCP server in development mode
	cd $(MCP_DIR) && npm run dev

build: ## Compile MCP server TypeScript
	cd $(MCP_DIR) && npm run build

start: ## Run compiled MCP server
	cd $(MCP_DIR) && npm run start

clean: ## Remove MCP server build artifacts
	rm -rf $(MCP_DIR)/dist $(MCP_DIR)/*.tsbuildinfo

lint: ## Type-check MCP server TypeScript (no emit)
	cd $(MCP_DIR) && npx tsc --noEmit
