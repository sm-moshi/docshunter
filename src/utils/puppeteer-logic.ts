/**
 * Pure business logic extracted from puppeteer utilities
 * These functions can be tested without mocking Puppeteer
 */

import type { BrowserConfig, ErrorAnalysis, RecoveryContext } from "../types/index.js";

/**
 * Determine recovery level based on error and context
 */
export function determineRecoveryLevel(error?: Error, context?: RecoveryContext): number {
  if (!error) return 1;

  const errorMsg = error.message.toLowerCase();

  // Critical errors require full restart
  if (
    errorMsg.includes("frame") ||
    errorMsg.includes("detached") ||
    errorMsg.includes("session closed") ||
    errorMsg.includes("target closed") ||
    errorMsg.includes("protocol error")
  ) {
    return 3; // Full restart
  }

  // Browser connectivity issues
  if (!context?.hasBrowser || !context?.isBrowserConnected) {
    return 3; // Full restart
  }

  // Page issues
  if (!context?.hasValidPage) {
    return 2; // New page
  }

  // Default to page refresh
  return 1;
}

/**
 * Analyze error characteristics
 */
export function analyzeError(error: Error | string): ErrorAnalysis {
  const errorMsg = typeof error === "string" ? error : error.message;
  const lowerMsg = errorMsg.toLowerCase();

  return {
    isTimeout: lowerMsg.includes("timeout") || lowerMsg.includes("timed out"),
    isNavigation: lowerMsg.includes("navigation") || lowerMsg.includes("Navigation"),
    isConnection:
      lowerMsg.includes("net::") || lowerMsg.includes("connection") || lowerMsg.includes("network"),
    isDetachedFrame:
      lowerMsg.includes("frame") ||
      lowerMsg.includes("detached") ||
      lowerMsg.includes("session closed"),
    isCaptcha: lowerMsg.includes("captcha") || lowerMsg.includes("challenge"),
    consecutiveTimeouts: 0, // This would be tracked externally
    consecutiveNavigationErrors: 0, // This would be tracked externally
  };
}

/**
 * Calculate retry delay with exponential backoff and jitter
 */
export function calculateRetryDelay(
  attemptNumber: number,
  errorAnalysis: ErrorAnalysis,
  maxDelay = 30000,
): number {
  let baseDelay: number;

  if (errorAnalysis.isTimeout) {
    baseDelay = Math.min(5000 * (errorAnalysis.consecutiveTimeouts + 1), maxDelay);
  } else if (errorAnalysis.isNavigation) {
    baseDelay = Math.min(8000 * (errorAnalysis.consecutiveNavigationErrors + 1), 40000);
  } else if (errorAnalysis.isConnection) {
    baseDelay = 15000 + Math.random() * 10000;
  } else if (errorAnalysis.isDetachedFrame) {
    baseDelay = 10000 + Math.random() * 5000;
  } else {
    // Standard exponential backoff
    baseDelay = Math.min(1000 * 2 ** attemptNumber, maxDelay);
  }

  // Add jitter
  const maxJitter = Math.min(1000 * (attemptNumber + 1), 10000);
  const jitter = Math.random() * maxJitter;

  return baseDelay + jitter;
}

/**
 * Generate browser launch arguments
 */
export function generateBrowserArgs(userAgent: string): string[] {
  return [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-blink-features=AutomationControlled",
    "--window-size=1920,1080",
    "--disable-accelerated-2d-canvas",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--disable-web-security",
    "--disable-features=IsolateOrigins,site-per-process",
    "--disable-blink-features=AutomationControlled",
    "--disable-infobars",
    "--disable-notifications",
    "--disable-popup-blocking",
    "--disable-default-apps",
    "--disable-extensions",
    "--disable-translate",
    "--disable-sync",
    "--disable-background-networking",
    "--disable-client-side-phishing-detection",
    "--disable-component-update",
    "--disable-hang-monitor",
    "--disable-prompt-on-repost",
    "--disable-domain-reliability",
    "--disable-renderer-backgrounding",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-breakpad",
    "--disable-component-extensions-with-background-pages",
    "--disable-ipc-flooding-protection",
    "--disable-back-forward-cache",
    "--disable-partial-raster",
    "--disable-skia-runtime-opts",
    "--disable-smooth-scrolling",
    "--disable-features=site-per-process,TranslateUI,BlinkGenPropertyTrees",
    "--enable-features=NetworkService,NetworkServiceInProcess",
    "--force-color-profile=srgb",
    "--metrics-recording-only",
    "--mute-audio",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=0",
    "--use-mock-keychain",
    `--user-agent=${userAgent}`,
  ];
}

/**
 * List of possible search input selectors in priority order
 */
export function getSearchInputSelectors(): string[] {
  return [
    'textarea[placeholder*="Ask"]',
    'textarea[placeholder*="Search"]',
    "textarea.w-full",
    'textarea[rows="1"]',
    '[role="textbox"]',
    "textarea",
  ];
}

/**
 * CAPTCHA detection selectors
 */
export function getCaptchaSelectors(): string[] {
  return [
    '[class*="captcha"]',
    '[id*="captcha"]',
    'iframe[src*="captcha"]',
    'iframe[src*="recaptcha"]',
    'iframe[src*="turnstile"]',
    "#challenge-running",
    "#challenge-form",
  ];
}

/**
 * Validate URL for navigation
 */
export function validateNavigationUrl(url: string, expectedDomain?: string): boolean {
  try {
    const parsedUrl = new URL(url);

    if (expectedDomain && !parsedUrl.hostname.includes(expectedDomain)) {
      return false;
    }

    return parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Check if error indicates a page navigation failure
 */
export function isNavigationFailure(url: string, expectedUrl?: string): boolean {
  if (!url || url === "N/A") return true;

  if (expectedUrl) {
    try {
      const actual = new URL(url);
      const expected = new URL(expectedUrl);
      return actual.hostname !== expected.hostname;
    } catch {
      return true;
    }
  }

  return false;
}
