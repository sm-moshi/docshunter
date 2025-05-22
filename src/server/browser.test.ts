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
    // @ts-expect-error: This is required to test the error handling for an invalid selector
    manager.page = null;
    await expect(manager.title()).rejects.toThrow('Page not initialized');
  });

  it('should throw error if browser is not initialized for newPage()', async () => {
    // @ts-expect-error: This is required to test the error handling for an invalid selector
    manager.browser = null;
    await expect(manager.newPage()).rejects.toThrow('Browser not initialized');
  });

  it('should set and get isClosed()', () => {
    expect(manager.isClosed()).toBe(false);
    // @ts-expect-error: This is required to test the error handling for an invalid selector
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
    // Ensure manager.page is the mockPage with the spy
    (manager as any).page = mockPage;
    const result = await manager.waitForSearchInput();
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
    // Make waitForSelector reject for all selectors to trigger error
    mockPage.waitForSelector.mockRejectedValue(new Error('not found'));
    await expect(manager.initializeBrowser()).rejects.toThrow('Search input not found after navigation - page might not have loaded correctly');
    expect(mockBrowser.close).toHaveBeenCalled();
  });

  it('should handle initializeBrowser reentrancy', async () => {
    // @ts-expect-error [test override: allow private assignment]
    manager.isInitializing = true;
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { void 0; });
    await manager.initializeBrowser();
    expect(logSpy).toHaveBeenCalledWith('Browser initialization already in progress...');
    logSpy.mockRestore();
  });

  it('should throw error if goto called with no page', async () => {
    // @ts-expect-error: This is required to test the error handling for an invalid selector
    manager.page = null;
    await expect(manager.goto('https://test')).rejects.toThrow('Page not initialized');
  });

  it('should throw error if evaluate called with no page', async () => {
    // @ts-expect-error: This is required to test the error handling for an invalid selector
    manager.page = null;
    await expect(manager.evaluate(() => 1)).rejects.toThrow('Page not initialized');
  });

  it('should throw error if click called with no page', async () => {
    // @ts-expect-error: This is required to test the error handling for an invalid selector
    manager.page = null;
    await expect(manager.click('.btn')).rejects.toThrow('Page not initialized');
  });

  it('should throw error if type called with no page', async () => {
    // @ts-expect-error: This is required to test the error handling for an invalid selector
    manager.page = null;
    await expect(manager.type('.input', 'abc')).rejects.toThrow('Page not initialized');
  });

  it('should throw error if waitForSelector called with no page', async () => {
    // @ts-expect-error: This is required to test the error handling for an invalid selector
    manager.page = null;
    await expect(manager.waitForSelector('.sel')).rejects.toThrow('Page not initialized');
  });

  it('should throw error if reload called with no page', async () => {
    // @ts-expect-error: This is required to test the error handling for an invalid selector
    manager.page = null;
    await expect(manager.reload()).rejects.toThrow('Page not initialized');
  });

  it('should throw error if screenshot called with no page', async () => {
    // @ts-expect-error: This is required to test the error handling for an invalid selector
    manager.page = null;
    await expect(manager.screenshot()).rejects.toThrow('Page not initialized');
  });

  it('should throw error if keyboard called with no page', () => {
    // @ts-expect-error: This is required to test the error handling for an invalid selector
    manager.page = null;
    expect(() => manager.keyboard).toThrow('Page not initialized');
  });

  // Add more tests for waitForSearchInput and initializeBrowser edge cases as needed
});

describe('BrowserManager navigation and error branches', () => {
  let manager: BrowserManager;
  let mockPage: any;
  let mockBrowser: any;

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

  it('should throw if goto throws during navigation', async () => {
    mockPage.goto.mockRejectedValue(new Error('goto fail'));
    await expect(manager.navigateToPerplexity()).rejects.toThrow('goto fail');
  });

  it('should throw if Perplexity returns internal error page', async () => {
    // Set test-specific mocks after beforeEach
    let evalCall = 0;
    mockPage.evaluate = vi.fn().mockImplementation(() => {
      evalCall++;
      if (evalCall === 1) return true; // isInternalError
      return false;
    });
    mockPage.url = vi.fn().mockReturnValue('https://perplexity.ai');
    mockPage.goto.mockResolvedValue(undefined);
    mockPage.waitForSelector = vi.fn().mockResolvedValue('.input');
    (manager as any).page = mockPage; // Ensure the BrowserManager uses the correct mockPage
    // Debug output
    console.log('DEBUG: internal error test - url:', (manager as any).page.url());
    console.log('DEBUG: internal error test - evaluate:', await (manager as any).page.evaluate(() => true));
    await expect(manager.navigateToPerplexity()).rejects.toThrow('Perplexity.ai returned internal error page');
  });

  it('should throw if frame is detached after navigation', async () => {
    mockPage.goto.mockResolvedValue(undefined);
    mockPage.evaluate.mockResolvedValue(false); // not internal error
    mockPage.isClosed.mockReturnValue(false);
    mockPage.mainFrame.mockReturnValue({ isDetached: () => true });
    await expect(manager.navigateToPerplexity()).rejects.toThrow('Frame detached during navigation');
  });

  it('should handle screenshot failure when navigation fails', async () => {
    mockPage.goto.mockRejectedValue(new Error('goto fail'));
    mockPage.screenshot.mockRejectedValue(new Error('screenshot fail'));
    const logSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    await expect(manager.navigateToPerplexity()).rejects.toThrow('goto fail');
    expect(logSpy).toHaveBeenCalledWith('Failed to capture screenshot:', expect.any(Error));
    logSpy.mockRestore();
  });

  it('should throw if navigation redirects to unexpected URL', async () => {
    // Set test-specific mocks after beforeEach
    let evalCall = 0;
    mockPage.evaluate = vi.fn().mockImplementation(() => {
      evalCall++;
      return false;
    });
    mockPage.url = vi.fn().mockReturnValue('https://unexpected.com');
    mockPage.goto.mockResolvedValue(undefined);
    // Use mockImplementation to always resolve for any selector
    mockPage.waitForSelector = vi.fn().mockImplementation(() => Promise.resolve('.input'));
    mockPage.isClosed.mockReturnValue(false);
    mockPage.mainFrame.mockReturnValue({ isDetached: () => false });
    mockPage.title.mockResolvedValue('Mock Title');
    (manager as any).page = mockPage; // Ensure the BrowserManager uses the correct mockPage
    // Debug output
    console.log('DEBUG: unexpected URL test - url:', (manager as any).page.url());
    let error;
    try {
      await manager.navigateToPerplexity();
    } catch (e) {
      error = e;
      console.log('DEBUG: thrown error (unexpected URL test):', e);
    }
    if (!error) {
      console.log('DEBUG: no error thrown (unexpected URL test)');
    }
    expect(error).toBeDefined();
    if (error instanceof Error) {
      expect(error.message).toContain('Navigation redirected to unexpected URL: https://unexpected.com');
    } else {
      throw new Error('Thrown value is not an Error instance');
    }
  });
});
