export async function handleCheckDeprecatedCode(
  args: { code: string; technology?: string },
  performSearch: (query: string) => Promise<string>,
): Promise<string> {
  const { code, technology = "" } = args;
  const codeChunks =
    code.length <= 200 ? [code] : code.match(/.{1,200}/gs) ?? [code];
  try {
    const prompt = `Analyze this code for deprecated features or patterns${technology ? ` in ${technology}` : ""
      }:\n\n${codeChunks[0]}\n\nPlease provide:\n1. Identification of deprecated features/methods\n2. Current recommended alternatives\n3. Step-by-step migration guide\n4. Impact assessment of the changes\n5. Deprecation timeline if available\n6. Code examples before/after updating\n7. Performance implications\n8. Backward compatibility considerations\n9. Testing recommendations for the changes`;
    return await performSearch(prompt);
  } catch {
    const simplePrompt = `List deprecated patterns in this code${technology ? ` for ${technology}` : ""
      } and suggest replacements:\n\n${codeChunks[0]}`;
    return await performSearch(simplePrompt);
  }
}
