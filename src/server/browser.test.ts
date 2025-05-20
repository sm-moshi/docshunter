import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserManager } from './browser';

interface MockPage {
  isClosed: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  setViewport: ReturnType<typeof vi.fn>;
  setUserAgent: ReturnType<typeof vi.fn>;
  setDefaultNavigationTimeout: ReturnType<typeof vi.fn>;
  goto: ReturnType<typeof vi.fn>;
  evaluate: ReturnType<typeof vi.fn>;
  screenshot: ReturnType<typeof vi.fn>;
  evaluateOnNewDocument: ReturnType<typeof vi.fn>;
  waitForSelector: ReturnType<typeof vi.fn>;
  reload: ReturnType<typeof vi.fn>;
  title: ReturnType<typeof vi.fn>;
  url: ReturnType<typeof vi.fn>;
  content: ReturnType<typeof vi.fn>;
  click: ReturnType<typeof vi.fn>;
  keyboard: { press: ReturnType<typeof vi.fn> };
  type: ReturnType<typeof vi.fn>;
  mainFrame: ReturnType<typeof vi.fn>;
}

interface MockBrowser {
  isConnected: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  newPage: ReturnType<typeof vi.fn>;
}

vi.mock('puppeteer', () => {
  const mockPage: MockPage = {
    isClosed: vi.fn().mockReturnValue(false),
    close: vi.fn(),
    setViewport: vi.fn(),
    setUserAgent: vi.fn(),
    setDefaultNavigationTimeout: vi.fn(),
    goto: vi.fn(),
    evaluate: vi.fn(),
    screenshot: vi.fn(),
    evaluateOnNewDocument: vi.fn(),
    waitForSelector: vi.fn(),
    reload: vi.fn(),
    title: vi.fn().mockResolvedValue('Mock Title'),
    url: vi.fn().mockReturnValue('https://mock.url'),
    content: vi.fn().mockResolvedValue('<html><body>mock</body></html>'),
    click: vi.fn(),
    keyboard: { press: vi.fn() },
    type: vi.fn(),
    mainFrame: vi.fn().mockReturnValue({ isDetached: vi.fn().mockReturnValue(false) }),
  };
  const mockBrowser: MockBrowser = {
    isConnected: vi.fn().mockReturnValue(true),
    close: vi.fn(),
    newPage: vi.fn().mockResolvedValue(mockPage),
  };
  return {
    __esModule: true,
    default: {
      launch: vi.fn().mockResolvedValue(mockBrowser),
    },
    launch: vi.fn().mockResolvedValue(mockBrowser),
  };
});

describe('BrowserManager', () => {
  let manager: BrowserManager;
  let mockPage: MockPage;
  let mockBrowser: MockBrowser;

  beforeEach(() => {
    mockPage = {
      isClosed: vi.fn().mockReturnValue(false),
      close: vi.fn(),
      setViewport: vi.fn(),
      setUserAgent: vi.fn(),
      setDefaultNavigationTimeout: vi.fn(),
      goto: vi.fn(),
      evaluate: vi.fn(),
      screenshot: vi.fn(),
      evaluateOnNewDocument: vi.fn(),
      waitForSelector: vi.fn(),
      reload: vi.fn(),
      title: vi.fn().mockResolvedValue('Mock Title'),
      url: vi.fn().mockReturnValue('https://mock.url'),
      content: vi.fn().mockResolvedValue('<html><body>mock</body></html>'),
      click: vi.fn(),
      keyboard: { press: vi.fn() },
      type: vi.fn(),
      mainFrame: vi.fn().mockReturnValue({ isDetached: vi.fn().mockReturnValue(false) }),
    };
    mockBrowser = {
      isConnected: vi.fn().mockReturnValue(true),
      close: vi.fn(),
      newPage: vi.fn().mockResolvedValue(mockPage),
    };
    manager = new BrowserManager();
    // @ts-expect-error [test override: allow private assignment]
    manager.browser = mockBrowser;
    // @ts-expect-error [test override: allow private assignment]
    manager.page = mockPage;
  });

  it('should throw error if page is not initialized for title()', async () => {
    // @ts-expect-error: purposely setting page to null to test error handling
    manager.page = null;
    await expect(manager.title()).rejects.toThrow('Page not initialized');
  });

  it('should throw error if browser is not initialized for newPage()', async () => {
    // @ts-expect-error
    manager.browser = null;
    await expect(manager.newPage()).rejects.toThrow('Browser not initialized');
  });

  it('should set and get isClosed()', () => {
    expect(manager.isClosed()).toBe(false);
    // @ts-expect-error: purposely setting page to null to test error handling
    manager.page = null;
    expect(manager.isClosed()).toBe(true);
  });

  it('should call setViewport on page', async () => {
    await manager.setViewport({ width: 800, height: 600 });
    expect(mockPage.setViewport).toHaveBeenCalled();
  });

  it('should call setUserAgent on page', async () => {
    await manager.setUserAgent('UA');
    expect(mockPage.setUserAgent).toHaveBeenCalled();
  });

  it('should call setDefaultNavigationTimeout on page', () => {
    manager.setDefaultNavigationTimeout(1234);
    expect(mockPage.setDefaultNavigationTimeout).toHaveBeenCalled();
  });

  it('should call goto on page', async () => {
    await manager.goto('https://test', { timeout: 1 });
    expect(mockPage.goto).toHaveBeenCalled();
  });

  it('should call evaluate on page', async () => {
    mockPage.evaluate.mockResolvedValue('result');
    const res = await manager.evaluate(() => 'result', 1, 2);
    expect(mockPage.evaluate).toHaveBeenCalled();
    expect(res).toBe('result');
  });

  it('should call mainFrame on page', () => {
    mockPage.mainFrame = vi.fn();
    manager.mainFrame();
    expect(mockPage.mainFrame).toHaveBeenCalled();
  });

  it('should call screenshot on page', async () => {
    await manager.screenshot({ path: 'a.png' });
    expect(mockPage.screenshot).toHaveBeenCalled();
  });

  it('should call evaluateOnNewDocument on page', async () => {
    await manager.evaluateOnNewDocument(() => 'result', 1);
    expect(mockPage.evaluateOnNewDocument).toHaveBeenCalled();
  });

  it('should call waitForSelector on page', async () => {
    await manager.waitForSelector('.sel', { timeout: 1 });
    expect(mockPage.waitForSelector).toHaveBeenCalled();
  });

  it('should call reload on page', async () => {
    await manager.reload({ timeout: 1 });
    expect(mockPage.reload).toHaveBeenCalled();
  });

  it('should call title, url, content on page', async () => {
    expect(await manager.title()).toBe('Mock Title');
    expect(manager.url()).toBe('https://mock.url');
    expect(await manager.content()).toContain('mock');
  });

  it('should call click, type, keyboard.press on page', async () => {
    await manager.click('.btn', { clickCount: 2 });
    expect(mockPage.click).toHaveBeenCalled();
    await manager.type('.input', 'abc', { delay: 1 });
    expect(mockPage.type).toHaveBeenCalled();
    await manager.keyboard.press('Enter');
    expect(mockPage.keyboard.press).toHaveBeenCalled();
  });

  it('should close page and browser', async () => {
    mockPage.isClosed.mockReturnValue(false);
    mockBrowser.isConnected.mockReturnValue(true);
    await manager.close();
    expect(mockPage.close).toHaveBeenCalled();
    expect(mockBrowser.close).toHaveBeenCalled();
  });

  it('should handle already closed page/browser in close()', async () => {
    mockPage.isClosed.mockReturnValue(true);
    mockBrowser.isConnected.mockReturnValue(false);
    await manager.close();
    expect(mockPage.close).not.toHaveBeenCalled();
    expect(mockBrowser.close).not.toHaveBeenCalled();
  });

  it('should return null and screenshot if no selector is found in waitForSearchInput', async () => {
    // Simulate all selectors failing
    mockPage.waitForSelector.mockRejectedValue(new Error('not found'));
    mockPage.screenshot.mockResolvedValue('screenshot');
    // @ts-expect-error: purposely setting page to null to test error handling
    manager.page = null;
    const result = await manager.waitForSearchInput(90000);
    expect(result).toBeNull();
    expect(mockPage.screenshot).toHaveBeenCalled();
  });

  it('should handle initializeBrowser when already initialized', async () => {
    // Simulate browser already exists
    mockBrowser.close.mockResolvedValue(undefined);
    // @ts-expect-error [test override: allow private assignment]
    manager.browser = mockBrowser;
    // @ts-expect-error [test override: allow private assignment]
    manager.isInitializing = false;
    // Patch puppeteer.launch to resolve to mockBrowser
    const puppeteer = await import('puppeteer');
    // Make waitForSelector resolve for a valid selector
    mockPage.waitForSelector.mockImplementation((selector: string) => {
      if (selector === 'textarea[placeholder*="Ask"]') {
        return Promise.resolve();
      }
      return Promise.reject(new Error('not found'));
    });
    await manager.initializeBrowser();
    expect(mockBrowser.close).toHaveBeenCalled();
    expect(puppeteer.launch).toHaveBeenCalled();
  });

  it('should handle initializeBrowser reentrancy', async () => {
    // @ts-expect-error [test override: allow private assignment]
    manager.isInitializing = true;
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
    await manager.initializeBrowser();
    expect(logSpy).toHaveBeenCalledWith('Browser initialization already in progress...');
    logSpy.mockRestore();
  });

  it('should throw error if goto called with no page', async () => {
    // @ts-expect-error: purposely setting page to null to test error handling
    manager.page = null;
    await expect(manager.goto('https://test')).rejects.toThrow('Page not initialized');
  });

  it('should throw error if evaluate called with no page', async () => {
    // @ts-expect-error: purposely setting page to null to test error handling
    manager.page = null;
    await expect(manager.evaluate(() => 1)).rejects.toThrow('Page not initialized');
  });

  it('should throw error if click called with no page', async () => {
    // @ts-expect-error: purposely setting page to null to test error handling
    manager.page = null;
    await expect(manager.click('.btn')).rejects.toThrow('Page not initialized');
  });

  it('should throw error if type called with no page', async () => {
    // @ts-expect-error: purposely setting page to null to test error handling
    manager.page = null;
    await expect(manager.type('.input', 'abc')).rejects.toThrow('Page not initialized');
  });

  it('should throw error if waitForSelector called with no page', async () => {
    // @ts-expect-error: purposely setting page to null to test error handling
    manager.page = null;
    await expect(manager.waitForSelector('.sel')).rejects.toThrow('Page not initialized');
  });

  it('should throw error if reload called with no page', async () => {
    // @ts-expect-error: purposely setting page to null to test error handling
    manager.page = null;
    await expect(manager.reload()).rejects.toThrow('Page not initialized');
  });

  it('should throw error if screenshot called with no page', async () => {
    // @ts-expect-error: purposely setting page to null to test error handling
    manager.page = null;
    await expect(manager.screenshot()).rejects.toThrow('Page not initialized');
  });

  it('should throw error if keyboard called with no page', () => {
    // @ts-expect-error: purposely setting page to null to test error handling
    manager.page = null;
    expect(() => manager.keyboard).toThrow('Page not initialized');
  });

  // Add more tests for waitForSearchInput and initializeBrowser edge cases as needed
});
