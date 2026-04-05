#!/bin/bash

# Controller Setup Script
# This script initializes the development environment for the Controller project

set -e  # Exit on error

echo "🚀 Controller Project Setup"
echo "=========================="
echo ""

# Check Node.js version
echo "📋 Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed."
    echo "   Please install Node.js 18.0.0 or higher from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be 18.0.0 or higher."
    echo "   Current version: $(node -v)"
    echo "   Please upgrade Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"
echo ""

# Install MCP server dependencies
echo "📦 Installing MCP server dependencies..."
cd mcp-server
npm install
cd ..
echo "✅ MCP server dependencies installed"
echo ""

# Check for API keys
echo "🔑 Checking for API keys..."
API_KEYS_CONFIGURED=true

if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "⚠️  ANTHROPIC_API_KEY not set"
    API_KEYS_CONFIGURED=false
fi

if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  OPENAI_API_KEY not set"
    API_KEYS_CONFIGURED=false
fi

if [ "$API_KEYS_CONFIGURED" = false ]; then
    echo ""
    echo "⚠️  API keys are required to run the MCP server."
    echo "   Please set the following environment variables:"
    echo ""
    echo "   export ANTHROPIC_API_KEY=\"sk-ant-...\""
    echo "   export OPENAI_API_KEY=\"sk-...\""
    echo ""
    echo "   You can add these to your ~/.bashrc or ~/.zshrc for persistence."
else
    echo "✅ API keys configured"
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "📚 Next steps:"
echo "   1. Configure API keys (if not already done)"
echo "   2. Run the MCP server: npm run dev"
echo "   3. Or serve the Web UI: npm run serve:html"
echo ""
echo "   For detailed instructions, see:"
echo "   - README.md for usage information"
echo "   - DEVELOPMENT.md for development guide"
echo ""
