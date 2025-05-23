/**
 * Content extraction utilities for Puppeteer-based scraping and recursive exploration.
 */
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import type { PuppeteerContext } from "./puppeteer.js";
import type { Page } from "puppeteer";

export interface PageContentResult {
  url: string;
  title?: string | null;
  textContent?: string | null;
  error?: string | null;
}

/**
 * Extracts content from a single page using Puppeteer and Readability.
 * Navigates to the URL, waits for DOM, and extracts readable content or falls back to body text.
 */
export async function fetchSinglePageContent(
  url: string,
  ctx: PuppeteerContext,
): Promise<PageContentResult> {
  const page = ctx.page;
  try {
    if (!page || page?.isClosed()) {
      ctx.log("info", "No active page, initializing browser...");
      await ctx.setPage(null);
      await ctx.setBrowser(null);
      await ctx.setIsInitializing(false);
      // You may want to call your browser init here if needed
      // TODO: Check if calling the browser init here is needed
      throw new Error("No active Puppeteer page");
    }
    ctx.log("info", `Navigating to ${url} for extraction...`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    const html = await page.content();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    if (article?.textContent && article.textContent.trim().length > (article.title?.length || 0)) {
      ctx.log("info", `Readability extracted content (${article.textContent.length} chars)`);
      return {
        url,
        title: article.title || (await page.title()),
        textContent: article.textContent.trim(),
        error: null,
      };
    }
    // Fallback: get body text
    const bodyText = dom.window.document.body?.textContent?.trim() || null;
    if (bodyText && bodyText.length > 100) {
      ctx.log("info", "Fallback to body text extraction");
      return {
        url,
        title: await page.title(),
        textContent: bodyText,
        error: null,
      };
    }
    return { url, error: "No meaningful content extracted" };
  } catch (error) {
    ctx.log(
      "error",
      `Error extracting content from ${url}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return { url, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Extracts all same-domain links from a Puppeteer page.
 * Filters out non-HTTP(S), anchor, mailto, and JavaScript links. Resolves relative URLs.
 * @param page - Puppeteer Page instance
 * @param baseUrl - The base URL for resolving relative links
 * @returns Array of { url, text } for same-domain links
 */
export async function extractSameDomainLinks(
  page: Page,
  baseUrl: string,
): Promise<{ url: string; text: string }[]> {
  try {
    const baseHostname = new URL(baseUrl).hostname;
    const links = await page.evaluate((base) => {
      return Array.from(document.querySelectorAll("a[href]"))
        .map((link) => {
          const href = link.getAttribute("href");
          const text = (link as HTMLElement).innerText || link.textContent || "";
          if (
            !href ||
            href.startsWith("#") ||
            href.startsWith("javascript:") ||
            href.startsWith("data:") ||
            href.startsWith("vbscript:") ||
            href.startsWith("mailto:") ||
            href.startsWith("tel:")
          ) {
            return null;
          }
          return { url: href, text: text.trim() };
        })
        .filter(Boolean);
    }, baseUrl);
    const resolvedLinks: { url: string; text: string }[] = [];
    for (const link of links) {
      if (!link) continue;
      try {
        const absoluteUrl = new URL(link.url, baseUrl).href;
        if (new URL(absoluteUrl).hostname === baseHostname) {
          resolvedLinks.push({ url: absoluteUrl, text: link.text || absoluteUrl });
        }
      } catch {
        // Ignore invalid URLs
      }
    }
    // Prioritize links with longer text, limit count
    return resolvedLinks.sort((a, b) => b.text.length - a.text.length).slice(0, 10);
  } catch (error) {
    // On error, return empty array
    return [];
  }
}

/**
 * Recursively fetches content from a root URL, exploring links up to maxDepth.
 * Uses fetchSinglePageContent and extractSameDomainLinks. Respects visitedUrls and globalTimeoutSignal.
 * @param startUrl - The root URL to start crawling
 * @param maxDepth - Maximum recursion depth
 * @param currentDepth - Current recursion depth
 * @param visitedUrls - Set of already visited URLs
 * @param results - Array to collect PageContentResult
 * @param globalTimeoutSignal - Object with .timedOut boolean to abort on timeout
 * @param ctx - PuppeteerContext
 */
export async function recursiveFetch(
  startUrl: string,
  maxDepth: number,
  currentDepth: number,
  visitedUrls: Set<string>,
  results: PageContentResult[],
  globalTimeoutSignal: { timedOut: boolean },
  ctx: PuppeteerContext,
): Promise<void> {
  if (currentDepth > maxDepth || visitedUrls.has(startUrl) || globalTimeoutSignal.timedOut) {
    return;
  }
  ctx.log("info", `[Depth ${currentDepth}] Fetching: ${startUrl}`);
  visitedUrls.add(startUrl);
  const pageResult: PageContentResult = {
    url: startUrl,
    title: null,
    textContent: null,
    error: null,
  };
  let linksToExplore: { url: string; text: string }[] = [];
  try {
    if (currentDepth === 1) {
      // Use Puppeteer/Readability for the initial page
      const result = await fetchSinglePageContent(startUrl, ctx);
      pageResult.title = result.title;
      pageResult.textContent = result.textContent;
      pageResult.error = result.error || null;
      if (ctx.page && !ctx.page.isClosed()) {
        linksToExplore = await extractSameDomainLinks(ctx.page, startUrl);
      }
    } else {
      // Use the simpler fetch for deeper levels
      // Import fetchSimpleContent from fetch.ts if needed
      // For now, just skip deeper link extraction
      // TODO: Implement deeper fetch if recommended
      pageResult.error = "Deeper fetch not implemented";
    }
    if (pageResult.textContent === null && pageResult.error === null) {
      pageResult.error = "Failed to extract content";
    }
  } catch (error) {
    ctx.log(
      "error",
      `[Depth ${currentDepth}] Error fetching ${startUrl}: ${error instanceof Error ? error.message : String(error)}`,
    );
    pageResult.error = error instanceof Error ? error.message : String(error);
  }
  results.push(pageResult);
  // Explore links only if depth allows and initial fetch was successful
  if (currentDepth < maxDepth && !pageResult.error && linksToExplore.length > 0) {
    const linksToFollow = linksToExplore.slice(0, 3); // Limit to 3 links per page
    const promises = linksToFollow.map((link) => {
      if (globalTimeoutSignal.timedOut) return Promise.resolve();
      return recursiveFetch(
        link.url,
        maxDepth,
        currentDepth + 1,
        visitedUrls,
        results,
        globalTimeoutSignal,
        ctx,
      );
    });
    await Promise.all(promises);
  }
}
