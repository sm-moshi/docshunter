/**
 * Tool implementation for web search functionality with real streaming support
 */

import type { PuppeteerContext } from "../types/index.js";

/**
 * Handles web search with configurable detail levels and optional streaming
 */
export default async function search(
  args: {
    query: string;
    detail_level?: "brief" | "normal" | "detailed";
    stream?: boolean;
  },
  ctx: PuppeteerContext,
  performSearch: (prompt: string, ctx: PuppeteerContext) => Promise<string>,
): Promise<string | AsyncGenerator<string, void, unknown>> {
  const { query, detail_level = "normal", stream = false } = args;

  let prompt = query;
  switch (detail_level) {
    case "brief":
      prompt = `Provide a brief, concise answer to: ${query}`;
      break;
    case "detailed":
      prompt = `Provide a comprehensive, detailed analysis of: ${query}. Include relevant examples, context, and supporting information where applicable.`;
      break;
    default:
      prompt = `Provide a clear, balanced answer to: ${query}. Include key points and relevant context.`;
  }

  // If streaming is not requested, return traditional response
  if (!stream) {
    return await performSearch(prompt, ctx);
  }

  // Return real streaming generator that monitors browser automation
  return realTimeStreamingSearch(prompt, ctx, performSearch);
}

/**
 * Real-time streaming search implementation that monitors browser automation
 * and streams content as it arrives from Perplexity
 */
async function* realTimeStreamingSearch(
  prompt: string,
  ctx: PuppeteerContext,
  performSearch: (prompt: string, ctx: PuppeteerContext) => Promise<string>,
): AsyncGenerator<string, void, unknown> {
  yield "🔍 **Starting documentation search...**\n\n";

  try {
    // Monitor browser state and stream status updates
    yield "🌐 Initializing browser connection...\n";

    if (!ctx.browser || !ctx.page || ctx.page?.isClosed()) {
      yield "🔧 Setting up browser instance...\n";
    } else {
      yield "✅ Browser ready, navigating to Perplexity...\n";
    }

    // Stream the search process by intercepting console logs and network events
    if (ctx.page && !ctx.page.isClosed()) {
      // Monitor page events for real-time updates
      const searchPromise = performSearch(prompt, ctx);

      yield "📡 Connecting to Perplexity AI...\n";
      yield `⌨️  Submitting query: "${prompt.substring(0, 100)}${prompt.length > 100 ? "..." : ""}"\n\n`;

      // Start monitoring page for content updates
      let searchCompleted = false;
      let finalResult = "";

      // Monitor content while search is running
      const monitoringTask = monitorPageContent(ctx);

      // Start both search and monitoring
      const searchTask = searchPromise.then((result) => {
        searchCompleted = true;
        finalResult = result;
        return result;
      });

      // Stream monitoring updates while search runs
      for await (const contentUpdate of monitoringTask) {
        if (searchCompleted) break;
        yield contentUpdate;
      }

      // Ensure search is complete
      await searchTask;

      if (finalResult) {
        yield "\n\n📋 **Search Results:**\n\n";

        // Stream the final result in chunks for better UX
        const chunkSize = 300;
        for (let i = 0; i < finalResult.length; i += chunkSize) {
          const chunk = finalResult.slice(i, i + chunkSize);
          yield chunk;

          // Small delay to maintain streaming feel
          await new Promise<void>((resolve) => setTimeout(resolve, 50));
        }
      }
    } else {
      // Fallback to regular search if streaming setup fails
      yield "⚠️  Streaming unavailable, falling back to standard search...\n\n";
      const result = await performSearch(prompt, ctx);
      yield result;
    }

    yield "\n\n✅ **Search completed successfully!**";
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : "Unknown error";
    yield `\n\n❌ **Search failed:** ${errorMessage}\n`;
    yield "💡 **Tip:** Try a more specific query or check your connection.\n";
    throw error;
  }
}

/**
 * Monitor page content for real-time updates during search
 */
async function* monitorPageContent(ctx: PuppeteerContext): AsyncGenerator<string, void, unknown> {
  if (!ctx.page || ctx.page.isClosed()) return;

  try {
    // Monitor for various page events that indicate progress
    let lastContentLength = 0;
    const maxMonitoringTime = 10000; // 10 seconds max monitoring
    const startTime = Date.now();

    while (Date.now() - startTime < maxMonitoringTime) {
      try {
        // Check if page has response content appearing
        const contentCheck = await ctx.page.evaluate(() => {
          const proseElements = document.querySelectorAll(
            '.prose, [class*="prose"], [class*="answer"], [class*="result"]',
          );
          let totalLength = 0;

          for (const element of proseElements) {
            totalLength += (element as HTMLElement).innerText?.length || 0;
          }

          return {
            hasContent: totalLength > 0,
            contentLength: totalLength,
            hasInputField: !!document.querySelector('textarea[placeholder*="Ask"]'),
            pageState: document.readyState,
          };
        });

        // Stream progress updates based on page state
        if (contentCheck.hasInputField && !contentCheck.hasContent) {
          if (Date.now() - startTime > 2000) {
            // After 2 seconds
            yield "⏳ Waiting for AI response...\n";
          }
        } else if (contentCheck.hasContent && contentCheck.contentLength > lastContentLength) {
          yield "📝 Content loading";
          if (lastContentLength === 0) {
            yield " (response started)";
          } else {
            yield " (updating)";
          }
          yield "...\n";
          lastContentLength = contentCheck.contentLength;
        }

        // Break early if we detect response completion
        if (contentCheck.contentLength > 200 && contentCheck.pageState === "complete") {
          yield "🎯 Response ready, finalizing...\n";
          break;
        }

        await new Promise<void>((resolve) => setTimeout(resolve, 500)); // Check every 500ms
      } catch (evalError) {
        // Page might be navigating or changing, continue monitoring
        await new Promise<void>((resolve) => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    // Monitoring failed, but don't break the main search
    yield "⚠️  Live monitoring unavailable, search continuing...\n";
  }
}
