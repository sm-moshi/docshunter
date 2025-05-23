# Testing Guide

Docshunter features a comprehensive testing infrastructure with **160 tests** ensuring reliability and maintainability.

## Running Tests

```bash
# Full test suite with coverage
pnpm test:coverage

# Development testing
pnpm test                    # Watch mode for development
pnpm test:run               # Single run without coverage

# Specific test types
pnpm test:integration       # Integration tests only
pnpm test:unit             # Unit tests only
```

**Current Status**: 160 tests passing, 1.83% coverage with realistic foundation

## Test Architecture

```
src/
├── __tests__/
│   ├── integration/              # Integration & system tests
│   │   ├── mcp-server.test.ts   # MCP protocol compliance
│   │   ├── real-coverage.test.ts # Database & logging operations
│   │   └── utils-coverage.test.ts # Configuration testing
├── tools/__tests__/              # Tool-specific unit tests
├── server/__tests__/             # Server configuration tests
└── utils/__tests__/              # Utility function tests
```

## Coverage Goals & Status

| Component | Coverage | Status | Priority |
|-----------|----------|--------|----------|
| **Utils** (`db.ts`, `logging.ts`, `config.ts`) | **100%** | ✅ Complete | Foundation |
| **Schema** (`toolSchemas.ts`) | 0% | ⏳ Future | Validation |
| **Tools** (all handlers) | 0% | ⏳ Future | Business Logic |
| **Server** (`DocshunterServer.ts`) | 0% | ⏳ Future | Integration |

**Current**: 1.83% overall coverage with solid foundation
**Target**: 80%+ for business logic in future phases

## Test Philosophy

- **Real Code Testing**: Actual database operations, logging output, file system interaction
- **Progressive Coverage**: Foundation first, business logic second
- **External Dependency Mocking**: Sophisticated mocks for Puppeteer, HTTP APIs
- **Edge Case Focus**: Empty data, long content, malformed inputs, error scenarios

## Testing Experience Lessons

**Real-World Complexity**: Testing is challenging for systems with external dependencies:

- **Complex Dependencies**: Browser automation, AI APIs, file operations
- **Progressive Strategy**: Start with utilities, build foundation, expand gradually
- **Real Code Testing**: Prefer actual operations over mocks where possible

**Proven Patterns from Docshunter**:

```typescript
// Real database testing with better-sqlite3
const db = new Database(":memory:");
initializeDatabase(db);
saveChatMessage(db, "test-id", { role: "user", content: "test" });
const history = getChatHistory(db, "test-id");
expect(history).toHaveLength(1);

// Real logging testing with console capture
const spy = vi.spyOn(console, "error").mockImplementation(() => {});
logInfo("test message");
expect(spy.mock.calls[0]?.[0]).toContain("[INFO]");

// Configuration testing with comprehensive property access
const { TIMEOUT_PROFILES } = CONFIG;
expect(Object.values(TIMEOUT_PROFILES).every(t => t > 0)).toBe(true);
```

## Coverage Philosophy

**Foundation first, business logic second**

- ✅ **160 tests** with 1.83% coverage
- ✅ **100% coverage** on critical utilities (`db.ts`, `logging.ts`, `config.ts`)
- ⏳ **Gradual expansion** to business logic as mocking infrastructure improves

---
*Last updated: May 23, 2025*
