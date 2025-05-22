import { describe, expect, it } from 'vitest';
import { handleCheckDeprecatedCode } from './checkDeprecatedCode';

describe('handleCheckDeprecatedCode', () => {
  it('should detect deprecated code (mocked)', async () => {
    const mockPerformSearch = (query: string) => Promise.resolve(`Checked: ${query}`);
    const result = await handleCheckDeprecatedCode({ code: 'var x = 1;' }, mockPerformSearch);
    expect(result).toContain('Checked:');
    expect(result).toContain('var x = 1;');
  });

  it('should handle errors gracefully (fallback prompt)', async () => {
    let callCount = 0;
    const errorPerformSearch = () => {
      callCount++;
      if (callCount === 1) return Promise.reject(new Error('Search failed'));
      return Promise.resolve('Fallback');
    };
    const result = await handleCheckDeprecatedCode({ code: 'var y = 2;' }, errorPerformSearch);
    expect(result).toContain('Fallback:');
    expect(result).toContain('var y = 2;');
  });
});
