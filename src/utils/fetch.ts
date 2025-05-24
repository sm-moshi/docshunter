/**
 * Utility for simple HTTP content fetching and basic HTML/text extraction.
 * @param url - The URL to fetch
 * @param ctx - PuppeteerContext for logging and config
 * @returns { title, textContent, error }
 */
import { Readability } from "@mozilla/readability";
import axios from "axios";
import { JSDOM } from "jsdom";
import { CONFIG } from "../server/config.js";
import type { PuppeteerContext } from "../types/index.js";

export async function fetchSimpleContent(
  url: string,
  ctx: PuppeteerContext,
): Promise<{ title: string | null; textContent: string | null; error?: string }> {
  try {
    ctx?.log?.("info", `Simple fetch starting for: ${url}`);

    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        "User-Agent": CONFIG.USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      validateStatus: (status) => status >= 200 && status < 400, // Accept 2xx and 3xx
    });

    const contentType = response.headers["content-type"] || "";
    ctx?.log?.("info", `Content-Type: ${contentType}, Status: ${response.status}`);

    if (
      !contentType.includes("html") &&
      !contentType.includes("text/plain") &&
      !contentType.includes("text/")
    ) {
      // Check for supported content types
      const errorMsg = `Unsupported content type: ${contentType}`;
      ctx?.log?.("warn", errorMsg);
      return {
        title: null,
        textContent: null,
        error: errorMsg,
      };
    }

    if (typeof response.data !== "string") {
      const errorMsg = "Response data is not a string";
      ctx?.log?.("warn", errorMsg);
      return {
        title: null,
        textContent: null,
        error: errorMsg,
      };
    }

    // Create DOM for content extraction
    const dom = new JSDOM(response.data, { url });
    let title = dom.window.document.title || null;
    let textContent = "";

    if (contentType.includes("html")) {
      // Try Readability first for better content extraction
      try {
        const reader = new Readability(dom.window.document);
        const article = reader.parse();

        if (article?.textContent && article.textContent.trim().length > 100) {
          title = article.title || title;
          textContent = article.textContent.trim();
          ctx?.log?.("info", `Readability extraction successful (${textContent.length} chars)`);
        } else {
          // Fallback to body text extraction
          textContent = dom.window.document.body?.textContent || "";
          ctx?.log?.("info", "Readability failed, using body text extraction");
        }
      } catch (readabilityError) {
        ctx?.log?.("warn", `Readability failed: ${readabilityError}, falling back to body text`);
        textContent = dom.window.document.body?.textContent || "";
      }
    } else {
      // For non-HTML content, just get the text
      textContent = response.data;
    }

    // Clean up the text content
    textContent = textContent.replace(/\s+/g, " ").trim();

    if (textContent.length > 15000) {
      // Truncate if too long
      textContent = `${textContent.substring(0, 15000)}... (content truncated)`;
      ctx?.log?.("info", "Content truncated due to length");
    }

    if (textContent.length < 50) {
      const errorMsg = "Extracted content is too short to be meaningful";
      ctx?.log?.("warn", errorMsg);
      return {
        title,
        textContent: null,
        error: errorMsg,
      };
    }

    ctx?.log?.("info", `Simple fetch successful (${textContent.length} chars)`);
    return { title, textContent };
  } catch (error: unknown) {
    let errorMsg = "Failed to fetch simple content";
    let errorDetails = "";

    if (error instanceof Error) {
      errorDetails = error.message;

      if (error.name === "AxiosError" && "response" in error) {
        // Enhanced axios error handling
        const axiosError = error as Error & {
          response?: { status?: number; statusText?: string };
          code?: string;
        };
        if (axiosError.response?.status) {
          const status = axiosError.response.status;
          if (status >= 400 && status < 500) {
            errorMsg = `Client error (${status}): ${axiosError.response.statusText || "Unknown error"}`;
          } else if (status >= 500) {
            errorMsg = `Server error (${status}): ${axiosError.response.statusText || "Unknown error"}`;
          } else {
            errorMsg = `HTTP error (${status}): ${axiosError.response.statusText || "Unknown error"}`;
          }
        } else if (axiosError.code) {
          // Network errors
          switch (axiosError.code) {
            case "ECONNABORTED":
              errorMsg = "Request timeout - server took too long to respond";
              break;
            case "ENOTFOUND":
              errorMsg = "DNS resolution failed - domain not found";
              break;
            case "ECONNREFUSED":
              errorMsg = "Connection refused - server is not accepting connections";
              break;
            case "ECONNRESET":
              errorMsg = "Connection reset - network connection was interrupted";
              break;
            case "ETIMEDOUT":
              errorMsg = "Connection timeout - failed to establish connection";
              break;
            default:
              errorMsg = `Network error (${axiosError.code}): ${errorDetails}`;
          }
        } else {
          errorMsg = `Request failed: ${errorDetails}`;
        }
      } else if (errorDetails.includes("timeout")) {
        errorMsg = "Request timeout - server took too long to respond";
      } else if (errorDetails.includes("ENOTFOUND")) {
        errorMsg = "DNS resolution failed - domain not found";
      } else if (errorDetails.includes("ECONNREFUSED")) {
        errorMsg = "Connection refused - server is not accepting connections";
      } else {
        errorMsg = `Request failed: ${errorDetails}`;
      }
    } else {
      errorMsg = `Unexpected error: ${String(error)}`;
    }

    ctx?.log?.("error", `Simple fetch failed for ${url}: ${errorMsg}`);
    return { title: null, textContent: null, error: errorMsg };
  }
}
