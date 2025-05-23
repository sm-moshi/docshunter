// ─── TYPE DECLARATIONS ─────────────────────────────────────────────────
declare global {
  interface Window {
    chrome: {
      app: {
        InstallState: {
          DISABLED: string;
          INSTALLED: string;
          NOT_INSTALLED: string;
        };
        RunningState: {
          CANNOT_RUN: string;
          READY_TO_RUN: string;
          RUNNING: string;
        };
        getDetails: () => void;
        getIsInstalled: () => void;
        installState: () => void;
        isInstalled: boolean;
        runningState: () => void;
      };
      runtime: {
        OnInstalledReason: {
          CHROME_UPDATE: string;
          INSTALL: string;
          SHARED_MODULE_UPDATE: string;
          UPDATE: string;
        };
        PlatformArch: {
          ARM: string;
          ARM64: string;
          MIPS: string;
          MIPS64: string;
          X86_32: string;
          X86_64: string;
        };
        PlatformNaclArch: {
          ARM: string;
          MIPS: string;
          PNACL: string;
          X86_32: string;
          X86_64: string;
        };
        PlatformOs: {
          ANDROID: string;
          CROS: string;
          LINUX: string;
          MAC: string;
          OPENBSD: string;
          WIN: string;
        };
        RequestUpdateCheckStatus: {
          NO_UPDATE: string;
          THROTTLED: string;
          UPDATE_AVAILABLE: string;
        };
        connect: () => {
          postMessage: () => void;
          onMessage: {
            addListener: () => void;
            removeListener: () => void;
          };
          disconnect: () => void;
        };
      };
    };
  }
}

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";
import puppeteer, { type Browser, type Page } from "puppeteer";
import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url"; // Added for ES Module path resolution
import crypto from "node:crypto";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import axios from "axios"; // Reverted: Remove explicit isAxiosError import
import { CONFIG } from "./config.js";
import { initializeDatabase, getChatHistory, saveChatMessage } from "../utils/db.js";
import type { ChatMessage } from "../utils/db.js";
import {
  initializeBrowser,
  navigateToPerplexity,
  setupBrowserEvasion,
  waitForSearchInput,
  checkForCaptcha,
  recoveryProcedure,
  resetIdleTimeout,
  retryOperation,
  type PuppeteerContext,
} from "../utils/puppeteer.js";
import type { PuppeteerContext as PuppeteerContextType } from "../utils/puppeteer.js";

// ─── INTERFACES ────────────────────────────────────────────────────────

// --- Recursive Content Extraction Types ---
interface PageContentResult {
  url: string;
  title?: string | null;
  textContent?: string | null;
  error?: string | null;
}

interface RecursiveFetchResult {
  status: "Success" | "SuccessWithPartial" | "Error";
  message?: string;
  rootUrl: string;
  explorationDepth: number;
  pagesExplored: number;
  content: PageContentResult[];
}

// ─── MAIN SERVER CLASS ─────────────────────────────────────────────────
class DocshunterServer {
  // Puppeteer context state
  private browser: Browser | null = null;
  private page: Page | null = null;
  private isInitializing = false;
  private searchInputSelector = 'textarea[placeholder*="Ask"]';
  private lastSearchTime = 0;
  private idleTimeout: NodeJS.Timeout | null = null;
  private operationCount = 0;
  private readonly IDLE_TIMEOUT_MS = 5 * 60 * 1000;

  // Database state
  private db: Database.Database;

  // Server state
  private server: Server;

  constructor() {
    this.server = new Server(
      { name: "perplexity-mcp", version: "1.0.0" },
      { capabilities: { tools: {} } },
    );

    // Initialize SQLite database (chat history) in the server's directory
    const dbPath = join(dirname(fileURLToPath(import.meta.url)), "..", "chat_history.db");
    const dbDir = dirname(dbPath);
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }
    this.db = new Database(dbPath, { fileMustExist: false });
    initializeDatabase(this.db);

    this.setupToolHandlers();

    // Graceful shutdown on SIGINT
    process.on("SIGINT", async () => {
      if (this.browser) {
        await this.browser.close();
      }
      if (this.db) {
        this.db.close();
      }
      await this.server.close();
      process.exit(0);
    });
  }

  private getPuppeteerContext(): PuppeteerContext {
    return {
      browser: this.browser,
      page: this.page,
      isInitializing: this.isInitializing,
      searchInputSelector: this.searchInputSelector,
      lastSearchTime: this.lastSearchTime,
      idleTimeout: this.idleTimeout,
      operationCount: this.operationCount,
      log: this.log.bind(this),
      setBrowser: (browser) => {
        this.browser = browser;
      },
      setPage: (page) => {
        this.page = page;
      },
      setIsInitializing: (val) => {
        this.isInitializing = val;
      },
      setSearchInputSelector: (selector) => {
        this.searchInputSelector = selector;
      },
      setIdleTimeout: (timeout) => {
        this.idleTimeout = timeout;
      },
      incrementOperationCount: () => ++this.operationCount,
      determineRecoveryLevel: this.determineRecoveryLevel.bind(this),
      IDLE_TIMEOUT_MS: this.IDLE_TIMEOUT_MS,
    };
  }

  // ─── LOGGING ──────────────────────────────────────────────────────────
  private log(level: "info" | "error" | "warn", message: string) {
    /* ... */
    // TODO: ... full implementation ...
  }

  // ─── RETRY / ERROR HANDLING ───────────────────────────────────────────
  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries = CONFIG.MAX_RETRIES,
  ): Promise<T> {
    /* ... */
    // TODO: ... full implementation ...
  }

  // ─── TOOL HANDLERS ────────────────────────────────────────────────────
  // TODO: Move to src/tools/ as individual files
  private async waitForCompleteAnswer(page: Page): Promise<string> {
    return undefined as unknown as string;
  }
  private async performSearch(query: string): Promise<string> {
    const ctx = this.getPuppeteerContext();
    // Use retryOperation, initializeBrowser, navigateToPerplexity, etc. from utils/puppeteer
    // ... (adapted logic, using ctx and utility functions) ...
    return ""; // TODO: Implement using new utilities
  }
  private async extractFallbackAnswer(page: Page): Promise<string> {
    return undefined as unknown as string;
    // TODO: Implement actual logic or port from previous code
  }
  private async handleChatPerplexity(args: { message: string; chat_id?: string }): Promise<string> {
    const { message, chat_id = crypto.randomUUID() } = args;
    const history = getChatHistory(this.db, chat_id);
    const userMessage: ChatMessage = { role: "user", content: message };
    saveChatMessage(this.db, chat_id, userMessage);

    let conversationPrompt = "";
    for (const msg of history) {
      conversationPrompt +=
        msg.role === "user" ? `User: ${msg.content}\n` : `Assistant: ${msg.content}\n`;
    }
    conversationPrompt += `User: ${message}\n`;

    return await this.performSearch(conversationPrompt);
  }
  private async handleGetDocumentation(args: { query: string; context?: string }): Promise<string> {
    return undefined as unknown as string;
    // TODO: Implement actual logic or port from previous code
  }
  private async handleFindApis(args: { requirement: string; context?: string }): Promise<string> {
    return undefined as unknown as string;
    // TODO: Implement actual logic or port from previous code
  }
  private async handleCheckDeprecatedCode(args: {
    code: string;
    technology?: string;
  }): Promise<string> {
    return undefined as unknown as string;
    // TODO: Implement actual logic or port from previous code
  }
  private splitCodeIntoChunks(code: string, maxLength: number): string[] {
    return undefined as unknown as string[];
    // TODO: Implement actual logic or port from previous code
  }
  private async handleSearch(args: {
    query: string;
    detail_level?: "brief" | "normal" | "detailed";
  }): Promise<string> {
    return undefined as unknown as string;
    // TODO: Implement actual logic or port from previous code
  }
  private async _fetchSinglePageContent(url: string): Promise<string> {
    return undefined as unknown as string;
    // TODO: Implement actual logic or port from previous code
  }
  private async _extractSameDomainLinks(
    page: Page,
    baseUrl: string,
  ): Promise<{ url: string; text: string }[]> {
    return undefined as unknown as { url: string; text: string }[];
    // TODO: Implement actual logic or port from previous code
  }
  private async _fetchSimpleContent(
    url: string,
  ): Promise<{ title: string | null; textContent: string | null; error?: string }> {
    return undefined as unknown as {
      title: string | null;
      textContent: string | null;
      error?: string;
    };
    // TODO: Implement actual logic or port from previous code
  }
  private async _recursiveFetch(
    startUrl: string,
    maxDepth: number,
    currentDepth: number,
    visitedUrls: Set<string>,
    results: PageContentResult[],
    globalTimeoutSignal: { timedOut: boolean },
  ): Promise<void> {
    return undefined as unknown as void;
    // TODO: Implement actual logic or port from previous code
  }
  private async handleExtractUrlContent(args: { url: string; depth?: number }): Promise<string> {
    return undefined as unknown as string;
    // TODO: Implement actual logic or port from previous code
  }

  // ─── TOOL HANDLER SETUP ──────────────────────────────────────────────
  private toolHandlers: { [key: string]: (args: any) => Promise<string> } = {
    chat_perplexity: this.handleChatPerplexity.bind(this),
    get_documentation: this.handleGetDocumentation.bind(this),
    find_apis: this.handleFindApis.bind(this),
    check_deprecated_code: this.handleCheckDeprecatedCode.bind(this),
    search: this.handleSearch.bind(this),
    extract_url_content: this.handleExtractUrlContent.bind(this),
  };

  private setupToolHandlers() {
    /* ... */
    // TODO: ... full implementation ...
  }

  private determineRecoveryLevel(error?: Error): number {
    // TODO: Implement actual logic or port from previous code
    return 3;
  }

  async run() {
    /* ... */
    // TODO: ... full implementation ...
  }
}

export default DocshunterServer;
