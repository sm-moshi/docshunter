// No direct type import needed here, but if you add types, import from '../types/types.js'

export async function handleSearch(
  args: { query: string; detail_level?: "brief" | "normal" | "detailed" },
  performSearch: (query: string) => Promise<string>,
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
  try {
    return await performSearch(prompt);
  } catch (error: any) {
    throw new Error(`Search failed: ${error.message}`);
  }
}
