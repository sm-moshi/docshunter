import { beforeEach, describe, expect, it } from 'vitest';
import { BrowserManager } from './browser';

describe('BrowserManager', () => {
  let manager: BrowserManager;
  beforeEach(() => {
    manager = new BrowserManager();
  });

  it('should throw error if page is not initialized for title()', async () => {
    await expect(manager.title()).rejects.toThrow('Page not initialized');
  });

  it('should throw error if browser is not initialized for newPage()', async () => {
    await expect(manager.newPage()).rejects.toThrow('Browser not initialized');
  });

  it('should set and get isClosed()', () => {
    expect(manager.isClosed()).toBe(true);
  });

  // You can add more tests with mocks for Puppeteer/Page if needed
});
