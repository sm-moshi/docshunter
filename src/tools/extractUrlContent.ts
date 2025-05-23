/**
 * Tool handler for 'extract_url_content'.
 * Extracts main article text content from a given URL, optionally recursively exploring links up to a specified depth.
 * @param args - { url: string; depth?: number }
 * @param ctx - PuppeteerContext for browser operations
 * @param fetchSinglePageContent - Function to extract content from a single page
 * @param recursiveFetch - Function to perform recursive content extraction
 * @returns The extraction result as a JSON string
 */
import type { PuppeteerContext, PageContentResult } from "../types/index.js";

export default async function extractUrlContent(
  args: { url: string; depth?: number },
  ctx: PuppeteerContext,
  fetchSinglePageContent: (url: string, ctx: PuppeteerContext) => Promise<string>,
  recursiveFetch: (
    startUrl: string,
    maxDepth: number,
    currentDepth: number,
    visitedUrls: Set<string>,
    results: PageContentResult[],
    globalTimeoutSignal: { timedOut: boolean },
    ctx: PuppeteerContext,
  ) => Promise<void>,
): Promise<string> {
  const { url, depth = 1 } = args;
  const validatedDepth = Math.max(1, Math.min(depth, 5));
  if (validatedDepth === 1) {
    return await fetchSinglePageContent(url, ctx);
  }
  // Recursive fetch logic
  const visitedUrls = new Set<string>();
  const results: PageContentResult[] = [];
  const globalTimeoutDuration = ctx.IDLE_TIMEOUT_MS - 5000;
  let globalTimeoutHandle: NodeJS.Timeout | null = null;
  const globalTimeoutSignal = { timedOut: false };
  const timeoutPromise = new Promise<never>((_, reject) => {
    globalTimeoutHandle = setTimeout(() => {
      globalTimeoutSignal.timedOut = true;
      reject(new Error(`Recursive fetch timed out after ${globalTimeoutDuration}ms`));
    }, globalTimeoutDuration);
  });
  try {
    const fetchPromise = recursiveFetch(
      url,
      validatedDepth,
      1,
      visitedUrls,
      results,
      globalTimeoutSignal,
      ctx,
    );
    await Promise.race([fetchPromise, timeoutPromise]);
    if (globalTimeoutHandle) clearTimeout(globalTimeoutHandle);
    const successfulPages = results.filter((r) => !r.error && r.textContent);
    const status =
      successfulPages.length === results.length
        ? "Success"
        : successfulPages.length > 0
          ? "SuccessWithPartial"
          : "Error";
    let message: string | undefined = undefined;
    if (status === "SuccessWithPartial")
      message = `Fetched ${successfulPages.length}/${results.length} pages successfully. Some pages failed or timed out.`;
    if (status === "Error" && results.length > 0)
      message = "Failed to fetch all content. Initial page fetch might have failed or timed out.";
    else if (status === "Error")
      message = "Failed to fetch any content. Initial page fetch might have failed or timed out.";
    const output = {
      status,
      message,
      rootUrl: url,
      explorationDepth: validatedDepth,
      pagesExplored: results.length,
      content: results,
    };
    return JSON.stringify(output, null, 2);
  } catch (error) {
    if (globalTimeoutHandle) clearTimeout(globalTimeoutHandle);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (results.length > 0) {
      const output = {
        status: "SuccessWithPartial",
        message: `Operation failed: ${errorMessage}. Returning partial results collected before failure.`,
        rootUrl: url,
        explorationDepth: validatedDepth,
        pagesExplored: results.length,
        content: results,
      };
      return JSON.stringify(output, null, 2);
    }
    return JSON.stringify(
      {
        status: "Error",
        message: `Recursive fetch failed: ${errorMessage}`,
        rootUrl: url,
        explorationDepth: validatedDepth,
        pagesExplored: 0,
        content: [],
      },
      null,
      2,
    );
  }
}
