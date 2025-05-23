import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Browser, Page } from "puppeteer";
import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import axios from "axios";
import { CONFIG } from "./config.js";
import { initializeDatabase, getChatHistory, saveChatMessage } from "../utils/db.js";
import type {
  ChatMessage,
  PuppeteerContext,
  PageContentResult,
  RecursiveFetchResult,
} from "../types/index.js";
import {
  initializeBrowser,
  navigateToPerplexity,
  setupBrowserEvasion,
  waitForSearchInput,
  checkForCaptcha,
  recoveryProcedure,
  resetIdleTimeout,
  retryOperation,
} from "../utils/puppeteer.js";
import { logInfo, logWarn, logError } from "../utils/logging.js";
import { extractSameDomainLinks, recursiveFetch } from "../utils/extraction.js";
import { fetchSimpleContent } from "../utils/fetch.js";
import { setupToolHandlers, createToolHandlersRegistry } from "./toolHandlerSetup.js";

// Import modular tool implementations
import chatPerplexity from "../tools/chatPerplexity.js";
import getDocumentation from "../tools/getDocumentation.js";
import findApis from "../tools/findApis.js";
import checkDeprecatedCode from "../tools/checkDeprecatedCode.js";
import search from "../tools/search.js";
import extractUrlContent from "../tools/extractUrlContent.js";

// ─── MAIN SERVER CLASS ─────────────────────────────────────────────────
export class DocshunterServer {
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
    // Add error handling for constructor
    try {
      this.server = new Server(
        { name: "docshunter", version: "0.2.0" },
        {
          capabilities: {
            tools: {
              listChanged: true,
            },
          },
        },
      );

      // Initialize SQLite database (chat history) in the server's directory
      const dbPath = join(dirname(fileURLToPath(import.meta.url)), "..", "chat_history.db");
      const dbDir = dirname(dbPath);
      logInfo(`Database path: ${dbPath}`);
      if (!existsSync(dbDir)) {
        mkdirSync(dbDir, { recursive: true });
        logInfo(`Created database directory: ${dbDir}`);
      }
      this.db = new Database(dbPath, { fileMustExist: false });
      initializeDatabase(this.db);
      logInfo("Database initialized successfully");

      this.setupToolHandlers();
      logInfo("Tool handlers setup completed");

      // Graceful shutdown on SIGINT - but only if not in MCP mode
      if (!("MCP_MODE" in process.env)) {
        process.on("SIGINT", async () => {
          logInfo("SIGINT received, shutting down gracefully...");
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

      logInfo("DocshunterServer constructor completed successfully");
    } catch (error) {
      logError("Error in DocshunterServer constructor:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
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
    switch (level) {
      case "info":
        logInfo(message);
        break;
      case "warn":
        logWarn(message);
        break;
      case "error":
        logError(message);
        break;
      default:
        logInfo(message);
    }
  }

  // ─── RETRY / ERROR HANDLING ───────────────────────────────────────────
  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries = CONFIG.MAX_RETRIES,
  ): Promise<T> {
    let lastError: Error | null = null;
    let consecutiveTimeouts = 0;
    let consecutiveNavigationErrors = 0;
    for (let i = 0; i < maxRetries; i++) {
      try {
        this.log("info", `Attempt ${i + 1}/${maxRetries}...`);
        const result = await operation();
        consecutiveTimeouts = 0;
        consecutiveNavigationErrors = 0;
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.log("error", `Attempt ${i + 1} failed: ${error}`);
        if (i === maxRetries - 1) {
          this.log("error", `Maximum retry attempts (${maxRetries}) reached. Giving up.`);
          break;
        }
        const errorMsg = error instanceof Error ? error.message : String(error);
        const isTimeoutError = errorMsg.includes("timeout") || errorMsg.includes("Timed out");
        const isNavigationError =
          errorMsg.includes("navigation") || errorMsg.includes("Navigation");
        const isConnectionError =
          errorMsg.includes("net::") ||
          errorMsg.includes("connection") ||
          errorMsg.includes("network");
        const isProtocolError = errorMsg.includes("protocol error");
        const isDetachedFrameError =
          errorMsg.includes("frame") ||
          errorMsg.includes("detached") ||
          errorMsg.includes("session closed") ||
          errorMsg.includes("target closed");
        if (isDetachedFrameError || isProtocolError) {
          this.log(
            "error",
            `Detached frame or protocol error detected ('${errorMsg.substring(0, 100)}...'). Initiating immediate recovery.`,
          );
          await recoveryProcedure(this.getPuppeteerContext(), lastError);
          continue;
        }
        const captchaDetected = await checkForCaptcha(this.getPuppeteerContext());
        if (isTimeoutError) {
          this.log(
            "error",
            `Timeout detected during operation (${++consecutiveTimeouts} consecutive), attempting recovery...`,
          );
          await recoveryProcedure(this.getPuppeteerContext(), lastError);
          continue;
        }
        if (isNavigationError) {
          this.log(
            "error",
            `Navigation error detected (${++consecutiveNavigationErrors} consecutive), attempting recovery...`,
          );
          await recoveryProcedure(this.getPuppeteerContext(), lastError);
          continue;
        }
        if (isConnectionError || isProtocolError) {
          this.log(
            "error",
            "Connection or protocol error detected, attempting recovery with longer wait...",
          );
          await recoveryProcedure(this.getPuppeteerContext(), lastError);
          continue;
        }
        // Exponential backoff with jitter
        const baseDelay = Math.min(1000 * 2 ** i, 30000);
        const maxJitter = Math.min(1000 * (i + 1), 10000);
        const jitter = Math.random() * maxJitter;
        const delay = baseDelay + jitter;
        this.log(
          "info",
          `Retrying in ${Math.round(delay / 1000)} seconds (base: ${Math.round(baseDelay / 1000)}s, jitter: ${Math.round(jitter / 1000)}s)...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    const errorMessage = lastError
      ? `Operation failed after ${maxRetries} retries. Last error: ${lastError.message}`
      : `Operation failed after ${maxRetries} retries with unknown error`;
    this.log("error", errorMessage);
    throw new Error(errorMessage);
  }

  // ─── TOOL HANDLERS ────────────────────────────────────────────────────
  // Core search methods
  private async waitForCompleteAnswer(page: Page): Promise<string> {
    // Set a timeout to ensure we don't wait indefinitely, but make it much longer
    const timeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(() => {
        reject(new Error("Waiting for complete answer timed out"));
      }, CONFIG.ANSWER_WAIT_TIMEOUT); // Use the dedicated answer wait timeout
    });

    const answerPromise = page.evaluate(async () => {
      const getAnswer = () => {
        const elements = Array.from(document.querySelectorAll(".prose"));
        const answerText = elements.map((el) => (el as HTMLElement).innerText.trim()).join("\n\n");

        // Extract all URLs from the answer
        const links = Array.from(document.querySelectorAll(".prose a[href]"));
        const urls = links
          .map((link) => (link as HTMLAnchorElement).href)
          .filter((href) => href && !href.startsWith("javascript:") && !href.startsWith("#"))
          .map((href) => href.trim());

        // Combine text and URLs
        if (urls.length > 0) {
          return `${answerText}\n\nURLs:\n${urls.map((url) => `- ${url}`).join("\n")}`;
        }
        return answerText;
      };

      let lastAnswer = "";
      let lastLength = 0;
      let stabilityCounter = 0;
      let noChangeCounter = 0;
      const maxAttempts = 60;
      const checkInterval = 600;

      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((resolve) => setTimeout(resolve, checkInterval));
        const currentAnswer = getAnswer();
        const currentLength = currentAnswer.length;

        if (currentLength > 0) {
          if (currentLength > lastLength) {
            lastLength = currentLength;
            stabilityCounter = 0;
            noChangeCounter = 0;
          } else if (currentAnswer === lastAnswer) {
            stabilityCounter++;
            noChangeCounter++;

            if (currentLength > 1000 && stabilityCounter >= 3) {
              console.error("Long answer stabilized, exiting early");
              break;
            }
            if (currentLength > 500 && stabilityCounter >= 4) {
              console.error("Medium answer stabilized, exiting");
              break;
            }
            if (stabilityCounter >= 5) {
              console.error("Short answer stabilized, exiting");
              break;
            }
          } else {
            noChangeCounter++;
            stabilityCounter = 0;
          }
          lastAnswer = currentAnswer;

          if (noChangeCounter >= 10 && currentLength > 200) {
            console.error("Content stopped growing but has sufficient information");
            break;
          }
        }

        const lastProse = document.querySelector(".prose:last-child");
        const isComplete =
          lastProse?.textContent?.includes(".") ||
          lastProse?.textContent?.includes("?") ||
          lastProse?.textContent?.includes("!");

        if (isComplete && stabilityCounter >= 2 && currentLength > 100) {
          console.error("Completion indicators found, exiting");
          break;
        }
      }
      return lastAnswer || "No answer content found. The website may be experiencing issues.";
    });

    try {
      // Race between the answer generation and the timeout
      return await Promise.race([answerPromise, timeoutPromise]);
    } catch (error) {
      logError("Error waiting for complete answer:", {
        error: error instanceof Error ? error.message : String(error),
      });
      // Return partial answer if available
      try {
        // Make multiple attempts to get partial content
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const partialAnswer = await page.evaluate(() => {
              const elements = Array.from(document.querySelectorAll(".prose"));
              return elements.map((el) => (el as HTMLElement).innerText.trim()).join("\n\n");
            });

            if (partialAnswer && partialAnswer.length > 50) {
              return `${partialAnswer}\n\n[Note: Answer retrieval was interrupted. This is a partial response.]`;
            }

            // Wait briefly before trying again
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } catch (evalError) {
            logError(`Attempt ${attempt + 1} to get partial answer failed:`, {
              error: evalError instanceof Error ? evalError.message : String(evalError),
            });
            // Wait before retrying
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        return "Answer retrieval timed out. The service might be experiencing high load. Please try again with a more specific query.";
      } catch (e) {
        logError("Failed to retrieve partial answer:", {
          error: e instanceof Error ? e.message : String(e),
        });
        return "Answer retrieval timed out. Please try again later.";
      }
    }
  }

  private async performSearch(query: string): Promise<string> {
    const ctx = this.getPuppeteerContext();

    // Set a global timeout for the entire operation with a much longer duration
    const operationTimeout = setTimeout(() => {
      logError("Global operation timeout reached, initiating recovery...");
      recoveryProcedure(ctx).catch((err: unknown) => {
        logError("Recovery after timeout failed:", {
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }, CONFIG.PAGE_TIMEOUT - CONFIG.MCP_TIMEOUT_BUFFER);

    try {
      // If browser/page is not initialized or page is closed, initialize it
      if (!ctx.browser || !ctx.page || ctx.page?.isClosed()) {
        logInfo("Browser/page not initialized or page closed, initializing now...");
        if (ctx.page && !ctx.page.isClosed()) {
          await ctx.page.close();
        }
        await initializeBrowser(ctx);
      }

      if (!ctx.page || ctx.page.isClosed()) {
        throw new Error("Page initialization failed or page was closed");
      }

      // Ensure we're on Perplexity - check if we need to navigate
      const currentUrl = ctx.page.url();
      if (!currentUrl.includes("perplexity.ai")) {
        logInfo("Not on Perplexity page, navigating...");
        await navigateToPerplexity(ctx);
      }

      // Reset idle timeout
      resetIdleTimeout(ctx);

      // Use retry operation for the entire search process with increased retries
      return await retryOperation(
        ctx,
        async () => {
          logInfo(
            `Navigating to Perplexity for query: "${query.substring(0, 30)}${query.length > 30 ? "..." : ""}"`,
          );
          await navigateToPerplexity(ctx);

          // Validate main frame is attached
          if (!ctx.page || ctx.page.mainFrame().isDetached()) {
            logError("Main frame is detached, will retry with new browser instance");
            throw new Error("Main frame is detached");
          }

          logInfo("Waiting for search input...");
          const selector = await waitForSearchInput(ctx);
          if (!selector) {
            logError("Search input not found, taking screenshot for debugging");
            if (ctx.page) {
              await ctx.page.screenshot({
                path: "debug_search_input_not_found.png",
                fullPage: true,
              });
            }
            throw new Error("Search input not found");
          }

          logInfo(`Found search input with selector: ${selector}`);

          // Clear any existing text with multiple approaches for reliability
          try {
            // First approach: using evaluate
            await ctx.page.evaluate((sel) => {
              const input = document.querySelector(sel) as HTMLTextAreaElement;
              if (input) input.value = "";
            }, selector);

            // Second approach: using keyboard shortcuts
            await ctx.page.click(selector, { clickCount: 3 }); // Triple click to select all text
            await ctx.page.keyboard.press("Backspace"); // Delete selected text
          } catch (clearError) {
            logWarn("Error clearing input field:", {
              error: clearError instanceof Error ? clearError.message : String(clearError),
            });
            // Continue anyway, as the typing might still work
          }

          // Type the query with variable delay to appear more human-like
          logInfo("Typing search query...");
          const typeDelay = Math.floor(Math.random() * 20) + 20; // Random delay between 20-40ms
          await ctx.page.type(selector, query, { delay: typeDelay });
          await ctx.page.keyboard.press("Enter");

          // Wait for response with multiple selector options and extended timeout
          logInfo("Waiting for response...");
          const proseSelectors = [
            ".prose",
            '[class*="prose"]',
            '[class*="answer"]',
            '[class*="result"]',
          ];

          let selectorFound = false;
          for (const proseSelector of proseSelectors) {
            try {
              await ctx.page.waitForSelector(proseSelector, {
                timeout: CONFIG.SELECTOR_TIMEOUT,
                visible: true,
              });
              logInfo(`Found response with selector: ${proseSelector}`);
              selectorFound = true;
              break;
            } catch (selectorError) {
              logWarn(`Selector ${proseSelector} not found, trying next...`);
            }
          }

          if (!selectorFound) {
            logError("No response selectors found, checking page state...");
            // Check if page is still valid before throwing
            if (!ctx.page || ctx.page.mainFrame().isDetached()) {
              throw new Error("Page became invalid while waiting for response");
            }
            // Take a screenshot for debugging
            await ctx.page.screenshot({ path: "debug_prose_not_found.png", fullPage: true });

            // Check if there's any visible text content that might contain an answer
            const pageText = await ctx.page.evaluate(() => document.body.innerText);
            if (pageText && pageText.length > 200) {
              logInfo("Found text content on page, attempting to extract answer...");
              // Try to extract meaningful content
              return await this.extractFallbackAnswer(ctx.page);
            }

            throw new Error("Timed out waiting for response from Perplexity");
          }

          logInfo("Waiting for complete answer...");
          const answer = await this.waitForCompleteAnswer(ctx.page);
          logInfo(`Answer received (${answer.length} characters)`);
          return answer;
        },
        CONFIG.MAX_RETRIES,
      );
    } catch (error) {
      logError("Search operation failed:", {
        error: error instanceof Error ? error.message : String(error),
      });

      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes("detached") || error.message.includes("Detached")) {
          logError("Frame detachment detected, attempting recovery...");
          await recoveryProcedure(ctx);
          // Return a helpful message instead of retrying to avoid potential infinite loops
          return "The search operation encountered a technical issue. Please try again with a more specific query.";
        }

        if (error.message.includes("timeout") || error.message.includes("Timed out")) {
          logError("Timeout detected, attempting recovery...");
          await recoveryProcedure(ctx);
          return "The search operation is taking longer than expected. This might be due to high server load. Your query has been submitted and we're waiting for results. Please try again with a more specific query if needed.";
        }

        if (error.message.includes("navigation") || error.message.includes("Navigation")) {
          logError("Navigation error detected, attempting recovery...");
          await recoveryProcedure(ctx);
          return "The search operation encountered a navigation issue. This might be due to network connectivity problems. Please try again later.";
        }
      }

      // For any other errors, return a user-friendly message
      return `The search operation could not be completed. Error: ${error instanceof Error ? error.message : "Unknown error"}. Please try again later with a more specific query.`;
    } finally {
      clearTimeout(operationTimeout);
    }
  }

  private async extractFallbackAnswer(page: Page): Promise<string> {
    try {
      return await page.evaluate(() => {
        // Try various ways to find content
        const contentSelectors = [
          // Common content containers
          "main",
          "article",
          ".content",
          ".answer",
          ".result",
          // Text containers
          "p",
          "div > p",
          ".text",
          '[class*="text"]',
          // Any large text block
          "div:not(:empty)",
        ];

        for (const selector of contentSelectors) {
          const elements = Array.from(document.querySelectorAll(selector));
          // Filter to elements with substantial text
          const textElements = elements.filter((el) => {
            const text = (el as HTMLElement).innerText?.trim();
            return text && text.length > 100; // Only consider elements with substantial text
          });

          if (textElements.length > 0) {
            // Sort by text length to find the most substantial content
            textElements.sort((a, b) => {
              return (b as HTMLElement).innerText.length - (a as HTMLElement).innerText.length;
            });

            // Get the top 3 elements with the most text
            const topElements = textElements.slice(0, 3);
            return topElements.map((el) => (el as HTMLElement).innerText.trim()).join("\n\n");
          }
        }

        // Last resort: get any visible text
        return `${document.body.innerText.substring(0, 2000)}\n\n[Note: Content extraction used fallback method due to page structure changes]`;
      });
    } catch (error) {
      logError("Error in fallback answer extraction:", {
        error: error instanceof Error ? error.message : String(error),
      });
      return "Unable to extract answer content. The website structure may have changed.";
    }
  }

  private splitCodeIntoChunks(code: string, maxLength: number): string[] {
    if (code.length <= maxLength) return [code];

    // Try to split at logical points (newlines, semicolons)
    const chunks: string[] = [];
    let currentChunk = "";

    const lines = code.split("\n");
    for (const line of lines) {
      if (currentChunk.length + line.length > maxLength) {
        chunks.push(currentChunk);
        currentChunk = `${line}\n`;
      } else {
        currentChunk += `${line}\n`;
      }
    }

    if (currentChunk) chunks.push(currentChunk);
    return chunks;
  }

  private async handleChatPerplexity(args: Record<string, unknown>): Promise<string> {
    const typedArgs = args as { message: string; chat_id?: string };
    const ctx = this.getPuppeteerContext();
    return await chatPerplexity(
      typedArgs,
      ctx,
      this.performSearch.bind(this),
      getChatHistory.bind(null, this.db),
      saveChatMessage.bind(null, this.db),
    );
  }

  private async handleGetDocumentation(args: Record<string, unknown>): Promise<string> {
    const typedArgs = args as { query: string; context?: string };
    const ctx = this.getPuppeteerContext();
    return await getDocumentation(typedArgs, ctx, this.performSearch.bind(this));
  }

  private async handleFindApis(args: Record<string, unknown>): Promise<string> {
    const typedArgs = args as { requirement: string; context?: string };
    const ctx = this.getPuppeteerContext();
    return await findApis(typedArgs, ctx, this.performSearch.bind(this));
  }

  private async handleCheckDeprecatedCode(args: Record<string, unknown>): Promise<string> {
    const typedArgs = args as {
      code: string;
      technology?: string;
    };
    const ctx = this.getPuppeteerContext();
    return await checkDeprecatedCode(typedArgs, ctx, this.performSearch.bind(this));
  }

  private async handleSearch(args: Record<string, unknown>): Promise<string> {
    const typedArgs = args as {
      query: string;
      detail_level?: "brief" | "normal" | "detailed";
      stream?: boolean;
    };
    const ctx = this.getPuppeteerContext();
    const result = await search(typedArgs, ctx, this.performSearch.bind(this));

    // If streaming is enabled, convert AsyncGenerator to string
    if (typeof result !== "string") {
      let streamedContent = "";
      for await (const chunk of result) {
        streamedContent += chunk;
      }
      return streamedContent;
    }

    return result;
  }

  private async _fetchSinglePageContent(url: string): Promise<string> {
    // Enhanced implementation with GitHub/Gitingest support and sophisticated fallback
    const ctx = this.getPuppeteerContext();
    const originalUrl = url;
    let extractionUrl = url;
    let pageTitle = "";
    let isGitHubRepo = false;

    // --- GitHub URL Detection & Rewriting ---
    try {
      const parsedUrl = new URL(originalUrl);
      if (parsedUrl.hostname === "github.com") {
        const pathParts = parsedUrl.pathname.split("/").filter((part) => part.length > 0);
        if (pathParts.length === 2) {
          isGitHubRepo = true;
          const gitingestUrl = `https://gitingest.com${parsedUrl.pathname}`;
          this.log("info", `Detected GitHub repo URL. Rewriting to: ${gitingestUrl}`);
          extractionUrl = gitingestUrl;
        }
      }
    } catch (urlParseError) {
      this.log("warn", `Failed to parse URL for GitHub check: ${urlParseError}`);
    }

    // --- Content-Type Pre-Check (Skip for GitHub/Gitingest) ---
    if (!isGitHubRepo) {
      try {
        this.log("info", `Performing HEAD request for ${extractionUrl}...`);
        const headResponse = await axios.head(extractionUrl, {
          timeout: 10000,
          headers: { "User-Agent": CONFIG.USER_AGENT },
        });
        const contentType = headResponse.headers["content-type"];
        this.log("info", `Content-Type: ${contentType}`);
        if (contentType && !contentType.includes("html") && !contentType.includes("text/plain")) {
          const errorMsg = `Unsupported content type: ${contentType}`;
          this.log("error", errorMsg);
          return JSON.stringify({ status: "Error", message: errorMsg });
        }
      } catch (headError) {
        this.log(
          "warn",
          `HEAD request failed for ${extractionUrl}: ${headError instanceof Error ? headError.message : String(headError)}. Proceeding with Puppeteer.`,
        );
      }
    }

    try {
      if (!ctx.page) {
        await initializeBrowser(ctx);
      }
      if (!ctx.page) {
        throw new Error("Failed to initialize browser page");
      }

      resetIdleTimeout(ctx);
      this.log("info", `Navigating to ${extractionUrl} for single page extraction...`);
      const response = await ctx.page.goto(extractionUrl, {
        waitUntil: "domcontentloaded",
        timeout: CONFIG.TIMEOUT_PROFILES.navigation,
      });
      pageTitle = await ctx.page.title();

      if (response && !response.ok()) {
        const statusCode = response.status();
        const errorMsg = `HTTP error ${statusCode} received when accessing URL: ${extractionUrl}`;
        this.log("error", errorMsg);
        return JSON.stringify({ status: "Error", message: errorMsg });
      }

      // --- Gitingest Specific Content Loading Wait ---
      if (isGitHubRepo) {
        this.log("info", "Waiting for gitingest content selector (.result-text)...");
        try {
          await ctx.page.waitForSelector(".result-text", {
            timeout: CONFIG.TIMEOUT_PROFILES.content,
          });
          this.log("info", "Gitingest content selector found.");
        } catch (waitError) {
          this.log(
            "warn",
            `Timeout waiting for gitingest selector: ${waitError}. Proceeding anyway.`,
          );
        }
      }

      const html = await ctx.page.content();
      const dom = new JSDOM(html, { url: extractionUrl });

      // --- Gitingest Specific Extraction ---
      if (isGitHubRepo) {
        const gitingestContent = await ctx.page.evaluate(() => {
          const resultTextArea = document.querySelector(
            ".result-text",
          ) as HTMLTextAreaElement | null;
          return resultTextArea ? resultTextArea.value : null;
        });
        if (gitingestContent && gitingestContent.trim().length > 0) {
          this.log(
            "info",
            `Gitingest specific extraction successful (${gitingestContent.length} chars)`,
          );
          return JSON.stringify(
            {
              status: "Success",
              title: pageTitle,
              textContent: gitingestContent.trim(),
              excerpt: null,
              siteName: "gitingest.com",
              byline: null,
            },
            null,
            2,
          );
        }
        this.log("warn", "Gitingest specific extraction failed. Falling back to Readability.");
      }

      // --- General Readability Extraction ---
      const reader = new Readability(dom.window.document);
      const article = reader.parse();
      if (
        article?.textContent &&
        article.textContent.trim().length > (article.title?.length || 0)
      ) {
        this.log("info", `Readability extracted content (${article.textContent.length} chars)`);
        return JSON.stringify(
          {
            status: "Success",
            title: article.title || pageTitle,
            textContent: article.textContent.trim(),
            excerpt: article.excerpt,
            siteName: article.siteName,
            byline: article.byline,
          },
          null,
          2,
        );
      }

      // --- Sophisticated Fallback Extraction ---
      this.log("warn", "Readability failed. Attempting sophisticated fallback selectors...");
      const fallbackText = await ctx.page.evaluate(() => {
        const selectors = [
          "article",
          "main",
          '[role="main"]',
          "#content",
          ".content",
          "#main",
          ".main",
          "#article-body",
          ".article-body",
          ".post-content",
          ".entry-content",
        ];
        for (const selector of selectors) {
          const element = document.querySelector(selector) as HTMLElement | null;
          if (element?.innerText && element.innerText.trim().length > 100) {
            console.error(`Fallback using selector: ${selector}`);
            return { text: element.innerText.trim(), selector: selector };
          }
        }
        const bodyClone = document.body.cloneNode(true) as HTMLElement;
        const elementsToRemove = bodyClone.querySelectorAll(
          'nav, header, footer, aside, script, style, noscript, button, form, [role="navigation"], [role="banner"], [role="contentinfo"], [aria-hidden="true"]',
        );
        for (const el of elementsToRemove) {
          el.remove();
        }
        const bodyText = bodyClone.innerText.trim();
        if (bodyText.length > 200) {
          console.error("Fallback using filtered body text.");
          return { text: bodyText, selector: "body (filtered)" };
        }
        return null;
      });

      if (fallbackText) {
        this.log(
          "info",
          `Fallback extracted content (${fallbackText.text.length} chars) using selector: ${fallbackText.selector}`,
        );
        return JSON.stringify(
          {
            status: "SuccessWithFallback",
            title: pageTitle,
            textContent: fallbackText.text,
            excerpt: null,
            siteName: null,
            byline: null,
            fallbackSelector: fallbackText.selector,
          },
          null,
          2,
        );
      }

      this.log("error", "Readability and fallback selectors failed.");
      throw new Error("Readability and fallback selectors failed to extract meaningful content.");
    } catch (error) {
      this.log("error", `Error during single page extraction from ${extractionUrl}: ${error}`);
      let errorMessage = `Failed to extract content from ${extractionUrl}.`;
      let errorReason = "Unknown error";
      if (error instanceof Error) {
        if (error.message.includes("timeout"))
          errorReason = "Navigation or content loading timed out.";
        else if (error.message.includes("net::") || error.message.includes("Failed to load"))
          errorReason = "Could not resolve or load the URL.";
        else if (error.message.includes("extract meaningful content"))
          errorReason = "Readability and fallback selectors failed.";
        else errorReason = error.message;
      }
      errorMessage += ` Reason: ${errorReason}`;
      this.log("error", errorMessage);
      return JSON.stringify({ status: "Error", message: errorMessage });
    }
  }

  private async _extractSameDomainLinks(
    page: Page,
    baseUrl: string,
  ): Promise<{ url: string; text: string }[]> {
    return await extractSameDomainLinks(page, baseUrl);
  }

  private async _fetchSimpleContent(
    url: string,
  ): Promise<{ title: string | null; textContent: string | null; error?: string }> {
    const ctx = this.getPuppeteerContext();
    return await fetchSimpleContent(url, ctx);
  }

  private async _recursiveFetch(
    startUrl: string,
    maxDepth: number,
    currentDepth: number,
    visitedUrls: Set<string>,
    results: PageContentResult[],
    globalTimeoutSignal: { timedOut: boolean },
  ): Promise<void> {
    const ctx = this.getPuppeteerContext();
    return await recursiveFetch(
      startUrl,
      maxDepth,
      currentDepth,
      visitedUrls,
      results,
      globalTimeoutSignal,
      ctx,
    );
  }

  private async handleExtractUrlContent(args: Record<string, unknown>): Promise<string> {
    const typedArgs = args as { url: string; depth?: number };
    const ctx = this.getPuppeteerContext();
    return await extractUrlContent(
      typedArgs,
      ctx,
      this._fetchSinglePageContent.bind(this),
      this._recursiveFetch.bind(this),
    );
  }

  // ─── TOOL HANDLER SETUP ──────────────────────────────────────────────
  private setupToolHandlers() {
    const toolHandlers = createToolHandlersRegistry({
      chat_perplexity: this.handleChatPerplexity.bind(this),
      get_documentation: this.handleGetDocumentation.bind(this),
      find_apis: this.handleFindApis.bind(this),
      check_deprecated_code: this.handleCheckDeprecatedCode.bind(this),
      search: this.handleSearch.bind(this),
      extract_url_content: this.handleExtractUrlContent.bind(this),
    });

    setupToolHandlers(this.server, toolHandlers);
  }

  private determineRecoveryLevel(error?: Error): number {
    if (!error) return 1;

    const errorMessage = error.message.toLowerCase();

    // Level 3: Critical errors requiring full browser restart
    if (
      errorMessage.includes("detached") ||
      errorMessage.includes("crashed") ||
      errorMessage.includes("disconnected") ||
      errorMessage.includes("protocol error")
    ) {
      return 3;
    }

    // Level 2: Navigation/page errors requiring page restart
    if (
      errorMessage.includes("navigation") ||
      errorMessage.includes("timeout") ||
      errorMessage.includes("net::err")
    ) {
      return 2;
    }

    // Level 1: Minor errors requiring simple recovery
    return 1;
  }

  async run() {
    try {
      logInfo("Creating StdioServerTransport...");
      const transport = new StdioServerTransport();

      logInfo("Starting DocshunterServer...");
      logInfo(`Tools registered: ${Object.keys(this.getToolHandlersRegistry()).join(", ")}`);

      logInfo("Attempting to connect server to transport...");
      await this.server.connect(transport);
      logInfo("DocshunterServer connected and ready");
      logInfo("Server is listening for requests...");

      // Keep the process alive
      process.stdin.resume();
    } catch (error) {
      logError("Failed to start server:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      process.exit(1);
    }
  }

  private getToolHandlersRegistry() {
    return {
      chat_perplexity: this.handleChatPerplexity.bind(this),
      get_documentation: this.handleGetDocumentation.bind(this),
      find_apis: this.handleFindApis.bind(this),
      check_deprecated_code: this.handleCheckDeprecatedCode.bind(this),
      search: this.handleSearch.bind(this),
      extract_url_content: this.handleExtractUrlContent.bind(this),
    };
  }
}
