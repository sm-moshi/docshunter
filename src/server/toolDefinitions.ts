export const TOOL_DEFINITIONS = [
  {
    name: "chat_perplexity",
    description:
      "Conversational web search with context and chat history. Leverages Perplexity's web search and maintains conversation history using an optional chat ID for contextual follow-ups.",
    category: "Conversation",
    keywords: [
      "chat",
      "conversation",
      "dialog",
      "discussion",
      "advice",
      "brainstorm",
      "debug",
    ],
    use_cases: [
      "Continuing multi-turn conversations",
      "Context-aware question answering",
      "Follow-up questions",
    ],
    inputSchema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "The message to send to Perplexity AI for web search",
        },
        chat_id: {
          type: "string",
          description:
            "Optional: ID of an existing chat to continue. If not provided, a new chat will be created.",
        },
      },
      required: ["message"],
    },
    outputSchema: {
      type: "object",
      properties: {
        chat_id: {
          type: "string",
          description: "ID of the chat session (new or existing)",
        },
        response: {
          type: "string",
          description: "Perplexity AI response to the message",
        },
      },
    },
    examples: [
      {
        description: "Simple question",
        input: { message: "Explain quantum computing basics" },
        output: {
          chat_id: "new-chat-id",
          response: "Quantum computing uses qubits...",
        },
      },
    ],
    related_tools: ["search", "get_documentation"],
  },
  {
    name: "search",
    description:
      "Performs a web search using Perplexity AI based on the provided query and desired detail level.",
    category: "Web Search",
    keywords: [
      "search",
      "web",
      "internet",
      "query",
      "find",
      "information",
      "lookup",
      "perplexity",
    ],
    use_cases: [
      "Answering general knowledge questions.",
      "Finding specific information online.",
      "Getting quick summaries or detailed explanations.",
      "Researching topics.",
    ],
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query or question to ask Perplexity.",
        },
        detail_level: {
          type: "string",
          enum: ["brief", "normal", "detailed"],
          description:
            "Optional: Controls the level of detail in the response (default: normal).",
        },
      },
      required: ["query"],
    },
    outputSchema: {
      type: "object",
      properties: {
        response: {
          type: "string",
          description: "The search result text provided by Perplexity AI.",
        },
      },
    },
    examples: [
      {
        description: "Simple search query",
        input: { query: "What is the weather in London?" },
        output: { response: "The weather in London is currently..." },
      },
    ],
    related_tools: ["chat_perplexity", "get_documentation", "find_apis"],
  },
  {
    name: "extract_url_content",
    description:
      "Uses browser automation (Puppeteer) and Mozilla's Readability library to extract the main article text content from a given URL. Handles dynamic JavaScript rendering and includes fallback logic.",
    category: "Information Extraction",
    keywords: [
      "extract",
      "url",
      "website",
      "content",
      "scrape",
      "summarize",
      "webpage",
      "fetch",
      "readability",
      "article",
      "dom",
      "puppeteer",
      "github",
      "gitingest",
      "repository",
    ],
    use_cases: [
      "Getting the main text of a news article or blog post.",
      "Summarizing web page content.",
      "Extracting documentation text.",
      "Providing website context to other models.",
    ],
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL of the website to extract content from.",
        },
        depth: {
          type: "number",
          description:
            "Optional: Maximum depth for recursive link exploration (1-5). Default is 1 (no recursion).",
          minimum: 1,
          maximum: 5,
          default: 1,
        },
      },
      required: ["url"],
    },
    outputSchema: {
      type: "object",
      description:
        "Returns a JSON object. For depth=1, contains extraction status and content for the single URL. For depth>1, contains status, root URL, depth, pages explored, and an array of content objects for each explored page.",
      properties: {
        status: {
          type: "string",
          enum: [
            "Success",
            "SuccessWithFallback",
            "SuccessWithPartial",
            "Error",
          ],
          description: "Indicates the outcome of the extraction attempt.",
        },
        message: {
          type: "string",
          description:
            "Error message if status is 'Error' or context for 'SuccessWithPartial'.",
        },
        title: {
          type: "string",
          description:
            "The extracted title of the page/article (only for depth=1).",
        },
        textContent: {
          type: "string",
          description:
            "The main extracted plain text content (only for depth=1).",
        },
        excerpt: {
          type: "string",
          description:
            "A short summary or excerpt, if available from Readability (only for depth=1).",
        },
        siteName: {
          type: "string",
          description:
            "The name of the website, if available from Readability (only for depth=1).",
        },
        byline: {
          type: "string",
          description:
            "The author or byline, if available from Readability (only for depth=1).",
        },
        fallbackSelector: {
          type: "string",
          description:
            "The CSS selector used if fallback logic was triggered (only for depth=1).",
        },
        rootUrl: {
          type: "string",
          description:
            "The initial URL provided for exploration (only for depth>1).",
        },
        explorationDepth: {
          type: "number",
          description:
            "The maximum depth requested for exploration (only for depth>1).",
        },
        pagesExplored: {
          type: "number",
          description:
            "The number of pages successfully fetched during exploration (only for depth>1).",
        },
        content: {
          type: "array",
          description:
            "Array containing results for each explored page (only for depth>1).",
          items: {
            type: "object",
            properties: {
              url: { type: "string", description: "URL of the explored page." },
              title: {
                type: "string",
                description: "Title of the explored page (if available).",
              },
              textContent: {
                type: "string",
                description:
                  "Extracted text content of the page (if successful).",
              },
              error: {
                type: "string",
                description:
                  "Error message if fetching this specific page failed.",
              },
            },
            required: ["url"],
          },
        },
      },
    },
    examples: [
      {
        description: "Successful extraction from an article",
        input: { url: "https://example-article-url.com" },
        output: {
          status: "Success",
          title: "Example Article Title",
          textContent: "The main body text of the article...",
          excerpt: "A short summary...",
          siteName: "Example News",
          byline: "Author Name",
        },
      },
    ],
    related_tools: ["search", "get_documentation"],
  },
  {
    name: "find_apis",
    description:
      "Find and evaluate APIs that could be used for a given requirement. Compares options based on requirements and context.",
    category: "API Discovery",
    keywords: [
      "api",
      "integration",
      "services",
      "endpoints",
      "sdk",
      "data",
      "external",
    ],
    use_cases: [
      "Finding APIs for specific functionality",
      "Comparing API alternatives",
      "Evaluating API suitability",
    ],
    inputSchema: {
      type: "object",
      properties: {
        requirement: {
          type: "string",
          description:
            "The functionality or requirement you are looking to fulfill",
        },
        context: {
          type: "string",
          description: "Additional context about the project or specific needs",
        },
      },
      required: ["requirement"],
    },
    outputSchema: {
      type: "object",
      properties: {
        response: {
          type: "string",
          description:
            "The raw text response from Perplexity containing API suggestions and evaluations.",
        },
      },
    },
    examples: [
      {
        description: "Finding payment APIs",
        input: {
          requirement: "payment processing",
          context: "needs Stripe alternative",
        },
        output: { response: "PayPal, Square, and others..." },
      },
    ],
    related_tools: ["get_documentation", "search"],
  },
  {
    name: "get_documentation",
    description:
      "Provide comprehensive documentation and usage examples for a given technology, library, or API.",
    category: "Technical Reference",
    keywords: [
      "docs",
      "documentation",
      "api",
      "reference",
      "examples",
      "usage",
      "version",
    ],
    use_cases: [
      "Learning new technologies",
      "API integration",
      "Troubleshooting code",
    ],
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "The technology, library, or API to get documentation for",
        },
        context: {
          type: "string",
          description: "Additional context or specific aspects to focus on",
        },
      },
      required: ["query"],
    },
    outputSchema: {
      type: "object",
      properties: {
        response: {
          type: "string",
          description:
            "The raw text response from Perplexity containing documentation, examples, and potentially source URLs.",
        },
      },
    },
    examples: [
      {
        description: "Basic documentation request",
        input: { query: "React useEffect hook" },
        output: {
          response: "The useEffect hook lets you perform side effects...",
        },
      },
    ],
    related_tools: ["search", "check_deprecated_code"],
  },
  {
    name: "check_deprecated_code",
    description:
      "Analyze code for deprecated features or patterns, and suggest replacements and migration strategies.",
    category: "Code Analysis",
    keywords: [
      "deprecation",
      "migration",
      "upgrade",
      "compatibility",
      "linting",
      "legacy",
      "debt",
    ],
    use_cases: [
      "Preparing for technology upgrades",
      "Maintaining backward compatibility",
      "Identifying technical debt",
    ],
    inputSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "The code snippet or dependency to check",
        },
        technology: {
          type: "string",
          description:
            "The technology or framework context (e.g., 'React', 'Node.js')",
        },
      },
      required: ["code"],
    },
    outputSchema: {
      type: "object",
      properties: {
        response: {
          type: "string",
          description:
            "The raw text response from Perplexity analyzing the code for deprecated features.",
        },
      },
    },
    examples: [
      {
        description: "React lifecycle method deprecation",
        input: {
          code: "componentWillMount() { /* ... */ }",
          technology: "React",
        },
        output: {
          response:
            "componentWillMount is deprecated. Use componentDidMount instead.",
        },
      },
    ],
    related_tools: ["get_documentation", "search"],
  },
];
