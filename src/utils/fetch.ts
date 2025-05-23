/**
 * Utility for simple HTTP content fetching and basic HTML/text extraction.
 * @param url - The URL to fetch
 * @param ctx - PuppeteerContext for logging and config
 * @returns { title, textContent, error }
 */
import axios from "axios";
import { JSDOM } from "jsdom";
import type { PuppeteerContext } from "./puppeteer.js";

export async function fetchSimpleContent(
  url: string,
  ctx: PuppeteerContext,
): Promise<{ title: string | null; textContent: string | null; error?: string }> {
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: { "User-Agent": ctx ? ctx.IDLE_TIMEOUT_MS?.toString() : "Mozilla/5.0" },
    });
    if (response.status === 200 && typeof response.data === "string") {
      const contentType = response.headers["content-type"];
      if (contentType && (contentType.includes("html") || contentType.includes("text/plain"))) {
        const dom = new JSDOM(response.data, { url });
        const title = dom.window.document.title || null;
        let text = dom.window.document.body?.textContent || "";
        text = text.replace(/\s+/g, " ").trim();
        if (text.length > 15000) {
          text = text.substring(0, 15000) + "... (content truncated)";
        }
        return { title, textContent: text };
      } else {
        return {
          title: null,
          textContent: null,
          error: `Unsupported content type: ${contentType}`,
        };
      }
    } else {
      return { title: null, textContent: null, error: `HTTP status ${response.status}` };
    }
  } catch (error: unknown) {
    let errorMsg = "Failed to fetch simple content";
    if (error instanceof Error) {
      errorMsg = error.message;
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as any).response === "object" &&
        (error as any).response !== null &&
        "status" in (error as any).response
      ) {
        errorMsg += ` (status: ${(error as any).response.status})`;
      }
    } else {
      errorMsg = String(error);
    }
    ctx?.log?.("warn", `Simple fetch failed for ${url}: ${errorMsg}`);
    return { title: null, textContent: null, error: errorMsg };
  }
}
