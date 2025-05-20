import { describe, expect, it } from 'vitest';
import { handleCheckDeprecatedCode } from './checkDeprecatedCode';

describe('handleCheckDeprecatedCode', () => {
  it('should detect deprecated code (mocked)', async () => {
    const mockPerformSearch = async (query: string) => `Checked: ${query}`;
    const result = await handleCheckDeprecatedCode({ code: 'var x = 1;' }, mockPerformSearch);
    expect(result).toContain('Checked:');
    expect(result).toContain('var x = 1;');
  });

  it('should handle errors gracefully (fallback prompt)', async () => {
    let callCount = 0;
    const errorPerformSearch = async (query: string) => {
      callCount++;
      if (callCount === 1) throw new Error('Search failed');
      return `Fallback: ${query}`;
    };
    const result = await handleCheckDeprecatedCode({ code: 'var y = 2;' }, errorPerformSearch);
    expect(result).toContain('Fallback:');
    expect(result).toContain('var y = 2;');
  });
});
