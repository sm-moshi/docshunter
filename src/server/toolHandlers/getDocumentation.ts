export async function handleGetDocumentation(
  args: { query: string; context?: string },
  performSearch: (query: string) => Promise<string>,
): Promise<string> {
  const { query, context = "" } = args;
  const prompt = `Provide comprehensive documentation and usage examples for ${query}. ${
    context ? `Focus on: ${context}` : ""
  } Include:\n1. Basic overview and purpose\n2. Key features and capabilities\n3. Installation/setup if applicable\n4. Common usage examples with code snippets\n5. Best practices and performance considerations\n6. Common pitfalls to avoid\n7. Version compatibility information\n8. Links to official documentation\n9. Community resources (forums, chat channels)\n10. Related tools/libraries that work well with it\n\nCrucially, also provide the main official URL(s) for this documentation on separate lines, prefixed with 'Official URL(s):'.`;
  return await performSearch(prompt);
}
