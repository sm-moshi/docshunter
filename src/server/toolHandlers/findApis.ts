export async function handleFindApis(
  args: { requirement: string; context?: string },
  performSearch: (query: string) => Promise<string>,
): Promise<string> {
  const { requirement, context = "" } = args;
  const prompt = `Find and evaluate APIs that could be used for: ${requirement}. ${
    context ? `Context: ${context}` : ""
  } For each API, provide:\n1. Name and brief description\n2. Key features and capabilities\n3. Pricing model and rate limits\n4. Authentication methods\n5. Integration complexity\n6. Documentation quality and examples\n7. Community support and popularity\n8. Any potential limitations or concerns\n9. Code examples for basic usage\n10. Comparison with similar APIs\n11. SDK availability and language support`;
  return await performSearch(prompt);
}
