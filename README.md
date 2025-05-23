# docshunter

A production-ready Model Context Protocol (MCP) server providing AI-powered research capabilities through Perplexity integration, web content extraction, and intelligent document analysis—all without requiring API keys.

[![Tests](https://img.shields.io/badge/tests-160%20passing-brightgreen)](https://github.com/sm-moshi/docshunter/actions)
[![Coverage](https://img.shields.io/badge/coverage-1.83%25-orange)](./coverage/index.html)
[![TypeScript](https://img.shields.io/badge/TypeScript-Clean-blue)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-2025--05--23-purple)](https://modelcontextprotocol.io/)

## ✨ Features

- 🔍 **Web Research**: Intelligent search via Perplexity's interface without API limits
- 💬 **Persistent Conversations**: Chat history with local SQLite storage
- 📄 **Smart Content Extraction**: Mozilla Readability + GitHub repository support
- 🛠️ **Developer Tools**: Documentation retrieval, API discovery, deprecation analysis
- 🚫 **No API Keys Required**: Web automation approach with browser evasion
- 🧪 **Comprehensive Testing**: 160 tests ensuring reliability and maintainability

## 🛠️ Tools Available

- **`search`** - Perplexity web search with curated results
- **`chat_perplexity`** - Conversational AI with persistent history
- **`extract_url_content`** - Smart content extraction from any URL
- **`get_documentation`** - Technology docs and examples
- **`find_apis`** - API discovery based on requirements
- **`check_deprecated_code`** - Code modernization analysis

## 🚀 Quick Start

### Installation

```bash
git clone https://github.com/sm-moshi/docshunter.git
cd docshunter
pnpm install
pnpm run build
```

### Configuration

Add to your MCP settings (`.cursor/mcp.json` for Cursor or `claude_desktop_config.json` for Claude Desktop):

```json
{
  "mcpServers": {
    "docshunter": {
      "command": "node",
      "args": ["/absolute/path/to/docshunter/build/main.js"],
      "env": {},
      "disabled": false,
      "timeout": 300
    }
  }
}
```

⚠️ **Important**: Use the **absolute path** to your built `main.js` file.

### Quick Test

```bash
# Verify everything works
pnpm test:run

# Check that build exists
ls build/main.js
```

### First Use

Ask your AI assistant:
> *"Use docshunter to search for 'TypeScript performance optimization tips'"*

## 📚 Documentation

- **[Architecture Guide](docs/architecture.md)** - System design and component structure
- **[Testing Guide](docs/testing.md)** - 160 tests with comprehensive coverage strategy
- **[Development Guide](docs/development.md)** - Contributing, adding tools, code standards
- **[Troubleshooting](docs/troubleshooting.md)** - Common issues and solutions
- **[Best Practices](docs/best-practices.md)** - Patterns and guidelines

## 🤔 Why Docshunter?

| Feature | Docshunter | Traditional Approaches |
|---------|------------|----------------------|
| **API Keys** | ✅ None required | ❌ Rate limits & costs |
| **Chat Persistence** | ✅ Local SQLite | ❌ Session-only |
| **GitHub Integration** | ✅ Auto-detects repos | ❌ Manual handling |
| **Privacy** | ✅ Everything local | ❌ Cloud dependencies |

## 🔧 Troubleshooting

**MCP Connection Issues**: Check [troubleshooting guide](docs/troubleshooting.md)

**Common Quick Fixes**:

```bash
# Verify Node.js path
which node

# Check build exists
ls build/main.js

# Test configuration
cat .cursor/mcp.json | jq '.'
```

## 🤝 Contributing

We follow [git flow](docs/development.md#git-workflow) with feature branches. See the [development guide](docs/development.md) for detailed contribution instructions.

## 📄 License

MIT - see LICENSE file for details.

---
*Built with TypeScript, Puppeteer, and SQLite. Tested with 160 comprehensive tests.*
