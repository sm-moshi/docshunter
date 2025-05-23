/**
 * Tool handler for 'search'.
 * Performs a web search using Perplexity AI based on the provided query and detail level.
 * @param args - { query: string; detail_level?: "brief" | "normal" | "detailed" }
 * @param ctx - PuppeteerContext for browser operations
 * @param performSearch - Function to perform the search (prompt: string, ctx: PuppeteerContext) => Promise<string>
 * @returns The search result string
 */
import type { PuppeteerContext } from "../utils/puppeteer.js";

export default async function search(
  args: { query: string; detail_level?: "brief" | "normal" | "detailed" },
  ctx: PuppeteerContext,
  performSearch: (prompt: string, ctx: PuppeteerContext) => Promise<string>,
): Promise<string> {
  const { query, detail_level = "normal" } = args;
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
  return await performSearch(prompt, ctx);
}
