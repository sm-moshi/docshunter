import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
/**
 * Puppeteer utility functions for browser automation, navigation, and recovery
 */
import puppeteer, { type Browser, type Page } from "puppeteer";
import { CONFIG } from "../server/config.js";
import type { PuppeteerContext, RecoveryContext } from "../types/index.js";
import { logError, logInfo, logWarn } from "./logging.js";
import {
  analyzeError,
  calculateRetryDelay,
  determineRecoveryLevel,
  generateBrowserArgs,
  getCaptchaSelectors,
  getSearchInputSelectors,
} from "./puppeteer-logic.js";

export async function initializeBrowser(ctx: PuppeteerContext) {
  if (ctx.isInitializing) {
    logInfo("Browser initialization already in progress...");
    return;
  }
  ctx.setIsInitializing(true);
  try {
    if (ctx.browser) {
      await ctx.browser.close();
    }
    const browser = await puppeteer.launch({
      headless: true,
      args: generateBrowserArgs(CONFIG.USER_AGENT),
    });
    ctx.setBrowser(browser);
    const page = await browser.newPage();
    ctx.setPage(page);
    await setupBrowserEvasion(ctx);
    await page.setViewport({
      width: 1280,
      height: 720,
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
    });
    await page.setUserAgent(CONFIG.USER_AGENT);
    page.setDefaultNavigationTimeout(CONFIG.PAGE_TIMEOUT);

    logInfo("Browser initialized successfully, skipping navigation in initialization");
    // Don't navigate to Perplexity during initialization - let individual tools handle navigation
    // await navigateToPerplexity(ctx);
    // TODO: Why is the navigateToPerplexity commented out?
  } catch (error) {
    logError(`Browser initialization failed: ${error}`);
    if (ctx.browser) {
      // Clean up on failure
      try {
        await ctx.browser.close();
      } catch (closeError) {
        logError(`Failed to close browser after initialization error: ${closeError}`);
      }
      ctx.setBrowser(null);
    }
    ctx.setPage(null);
    throw new Error(
      `Page not initialized: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    ctx.setIsInitializing(false);
  }
}

// Helper functions for navigation
async function performInitialNavigation(page: Page): Promise<void> {
  try {
    await page.goto("https://www.perplexity.ai/", {
      waitUntil: "domcontentloaded",
      timeout: CONFIG.PAGE_TIMEOUT,
    });
    const isInternalError = await page.evaluate(() => {
      return document.querySelector("main")?.textContent?.includes("internal error") || false;
    });
    if (isInternalError) {
      throw new Error("Perplexity.ai returned internal error page");
    }
  } catch (gotoError) {
    if (
      gotoError instanceof Error &&
      !gotoError.message.toLowerCase().includes("timeout") &&
      !gotoError.message.includes("internal error")
    ) {
      logError(`Initial navigation request failed: ${gotoError}`);
      throw gotoError;
    }
    logWarn(
      `Navigation issue detected: ${gotoError instanceof Error ? gotoError.message : String(gotoError)}`,
    );
  }
}

async function validatePageState(page: Page): Promise<void> {
  if (page.isClosed() || page.mainFrame().isDetached()) {
    logError("Page closed or frame detached immediately after navigation attempt.");
    throw new Error("Frame detached during navigation");
  }
}

async function waitForAndValidateSearchInput(ctx: PuppeteerContext): Promise<void> {
  const { page } = ctx;
  if (!page) throw new Error("Page not initialized");

  logInfo("Navigation initiated, waiting for search input to confirm readiness...");
  const searchInput = await waitForSearchInput(ctx);
  if (!searchInput) {
    logError("Search input not found after navigation, taking screenshot for debugging");
    if (!page.isClosed()) {
      await page.screenshot({ path: "debug_no_search_input.png", fullPage: true });
    }
    throw new Error(
      "Search input not found after navigation - page might not have loaded correctly",
    );
  }
  logInfo("Search input found, page appears ready.");
}

async function validateFinalPageState(page: Page): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 3000));
  let pageTitle = "N/A";
  let pageUrl = "N/A";

  try {
    if (!page.isClosed()) {
      pageTitle = await page.title();
      pageUrl = page.url();
    }
  } catch (titleError) {
    logWarn(`Could not retrieve page title/URL after navigation: ${titleError}`);
  }

  logInfo(`Page loaded: ${pageUrl} (${pageTitle})`);
  if (pageUrl !== "N/A" && !pageUrl.includes("perplexity.ai")) {
    logError(`Unexpected URL: ${pageUrl}`);
    throw new Error(`Navigation redirected to unexpected URL: ${pageUrl}`);
  }
}

async function handleNavigationFailure(page: Page, error: unknown): Promise<never> {
  logError(`Navigation failed: ${error}`);
  try {
    if (page) {
      await page.screenshot({ path: "debug_navigation_failed.png", fullPage: true });
      logInfo("Captured screenshot of failed navigation state");
    }
  } catch (screenshotError) {
    logError(`Failed to capture screenshot: ${screenshotError}`);
  }
  throw error;
}

export async function navigateToPerplexity(ctx: PuppeteerContext) {
  const { page } = ctx;
  if (!page) throw new Error("Page not initialized");

  try {
    logInfo("Navigating to Perplexity.ai...");

    await performInitialNavigation(page);
    await validatePageState(page);
    await waitForAndValidateSearchInput(ctx);
    await validateFinalPageState(page);

    logInfo("Navigation and readiness check completed successfully");
  } catch (error) {
    await handleNavigationFailure(page, error);
  }
}

export async function setupBrowserEvasion(ctx: PuppeteerContext) {
  const { page } = ctx;
  if (!page) return;
  await page.evaluateOnNewDocument(() => {
    Object.defineProperties(navigator, {
      webdriver: { get: () => undefined },
      hardwareConcurrency: { get: () => 8 },
      deviceMemory: { get: () => 8 },
      platform: { get: () => "Win32" },
      languages: { get: () => ["en-US", "en"] },
      permissions: {
        get: () => ({
          query: async () => ({ state: "prompt" }),
        }),
      },
    });
    if (typeof window.chrome === "undefined") {
      window.chrome = {
        app: {
          InstallState: {
            DISABLED: "disabled",
            INSTALLED: "installed",
            NOT_INSTALLED: "not_installed",
          },
          RunningState: {
            CANNOT_RUN: "cannot_run",
            READY_TO_RUN: "ready_to_run",
            RUNNING: "running",
          },
          getDetails: () => {},
          getIsInstalled: () => {},
          installState: () => {},
          isInstalled: false,
          runningState: () => {},
        },
        runtime: {
          OnInstalledReason: {
            CHROME_UPDATE: "chrome_update",
            INSTALL: "install",
            SHARED_MODULE_UPDATE: "shared_module_update",
            UPDATE: "update",
          },
          PlatformArch: {
            ARM: "arm",
            ARM64: "arm64",
            MIPS: "mips",
            MIPS64: "mips64",
            X86_32: "x86-32",
            X86_64: "x86-64",
          },
          PlatformNaclArch: {
            ARM: "arm",
            MIPS: "mips",
            PNACL: "pnacl",
            X86_32: "x86-32",
            X86_64: "x86-64",
          },
          PlatformOs: {
            ANDROID: "android",
            CROS: "cros",
            LINUX: "linux",
            MAC: "mac",
            OPENBSD: "openbsd",
            WIN: "win",
          },
          RequestUpdateCheckStatus: {
            NO_UPDATE: "no_update",
            THROTTLED: "throttled",
            UPDATE_AVAILABLE: "update_available",
          },
          connect: () => ({
            postMessage: () => {},
            onMessage: {
              addListener: () => {},
              removeListener: () => {},
            },
            disconnect: () => {},
          }),
        },
      };
    }
  });
}

export async function waitForSearchInput(
  ctx: PuppeteerContext,
  timeout = CONFIG.SELECTOR_TIMEOUT,
): Promise<string | null> {
  const { page, setSearchInputSelector } = ctx;
  if (!page) return null;
  const possibleSelectors = getSearchInputSelectors();
  for (const selector of possibleSelectors) {
    try {
      const element = await page.waitForSelector(selector, {
        timeout: 5000,
        visible: true,
      });
      if (element) {
        const isInteractive = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          return el && !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true";
        }, selector);
        if (isInteractive) {
          logInfo(`Found working search input: ${selector}`);
          setSearchInputSelector(selector);
          return selector;
        }
      }
    } catch (error) {
      logWarn(`Selector '${selector}' not found or not interactive`);
    }
  }
  await page.screenshot({ path: "debug_search_not_found.png", fullPage: true });
  logError("No working search input found");
  return null;
}

export async function checkForCaptcha(ctx: PuppeteerContext): Promise<boolean> {
  const { page } = ctx;
  if (!page) return false;
  const captchaIndicators = getCaptchaSelectors();
  return await page.evaluate((selectors) => {
    return selectors.some((selector) => !!document.querySelector(selector));
  }, captchaIndicators);
}

// Helper functions for recovery procedure
async function performPageRefresh(ctx: PuppeteerContext): Promise<void> {
  logInfo("Attempting page refresh (Recovery Level 1)");
  if (ctx.page && !ctx.page?.isClosed()) {
    try {
      await ctx.page.reload({ timeout: CONFIG.TIMEOUT_PROFILES.navigation });
    } catch (reloadError) {
      logWarn(
        `Page reload failed: ${reloadError instanceof Error ? reloadError.message : String(reloadError)}. Proceeding with recovery.`,
      );
    }
  } else {
    logWarn("Page was null or closed, cannot refresh. Proceeding with recovery.");
  }
}

async function performNewPageCreation(ctx: PuppeteerContext): Promise<number> {
  logInfo("Creating new page instance (Recovery Level 2)");

  if (ctx.page) {
    try {
      if (!ctx.page?.isClosed()) await ctx.page.close();
    } catch (closeError) {
      logWarn(
        `Ignoring error closing old page: ${closeError instanceof Error ? closeError.message : String(closeError)}`,
      );
    }
    ctx.setPage(null);
  }

  if (!ctx.browser?.isConnected()) {
    logWarn(
      "Browser was null or disconnected, cannot create new page. Escalating to full restart.",
    );
    return 3; // Escalate to full restart
  }

  try {
    const page = await ctx.browser.newPage();
    ctx.setPage(page);
    await setupBrowserEvasion(ctx);
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(CONFIG.USER_AGENT);
    return 2; // Success
  } catch (newPageError) {
    logError(
      `Failed to create new page: ${newPageError instanceof Error ? newPageError.message : String(newPageError)}. Escalating to full restart.`,
    );
    return 3; // Escalate to full restart
  }
}

async function performFullBrowserRestart(ctx: PuppeteerContext): Promise<void> {
  logInfo("Performing full browser restart (Recovery Level 3)");

  if (ctx.page) {
    try {
      if (!ctx.page?.isClosed()) await ctx.page.close();
    } catch (closeError) {
      logWarn(
        `Ignoring error closing page during full restart: ${closeError instanceof Error ? closeError.message : String(closeError)}`,
      );
    }
  }

  if (ctx.browser) {
    try {
      if (ctx.browser.isConnected()) await ctx.browser.close();
    } catch (closeError) {
      logWarn(
        `Ignoring error closing browser during full restart: ${closeError instanceof Error ? closeError.message : String(closeError)}`,
      );
    }
  }

  ctx.setPage(null);
  ctx.setBrowser(null);
  ctx.setIsInitializing(false); // Ensure flag is reset

  logInfo("Waiting before re-initializing browser...");
  await new Promise((resolve) => setTimeout(resolve, CONFIG.RECOVERY_WAIT_TIME));
  await initializeBrowser(ctx); // This will set page and browser again
}

export async function recoveryProcedure(ctx: PuppeteerContext, error?: Error): Promise<void> {
  // Create recovery context for analysis
  const recoveryContext: RecoveryContext = {
    hasValidPage: !!(ctx.page && !ctx.page.isClosed() && !ctx.page.mainFrame()?.isDetached()),
    hasBrowser: !!ctx.browser,
    isBrowserConnected: !!ctx.browser?.isConnected(),
    operationCount: ctx.operationCount,
  };

  let recoveryLevel = determineRecoveryLevel(error, recoveryContext);
  const opId = ctx.incrementOperationCount();

  logInfo("Starting recovery procedure");

  try {
    switch (recoveryLevel) {
      case 1:
        await performPageRefresh(ctx);
        break;
      case 2:
        recoveryLevel = await performNewPageCreation(ctx);
        if (recoveryLevel === 3) {
          // Escalated to full restart
          await performFullBrowserRestart(ctx);
        }
        break;
      case 3:
        await performFullBrowserRestart(ctx);
        break;
    }
    logInfo("Recovery completed");
  } catch (recoveryError) {
    logError(
      `Recovery failed: ${recoveryError instanceof Error ? recoveryError.message : String(recoveryError)}`,
    );
    if (recoveryLevel < 3) {
      logInfo("Attempting higher level recovery");
      await recoveryProcedure(ctx, new Error("Fallback recovery"));
    } else {
      throw recoveryError;
    }
  }
}

// Helper functions for retry operation
async function handleDetachedFrameError(ctx: PuppeteerContext, error: Error): Promise<void> {
  const errorMsg = error.message;
  logError(
    `Detached frame or protocol error detected ('${errorMsg.substring(0, 100)}...'). Initiating immediate recovery.`,
  );
  await recoveryProcedure(ctx, error);
  const criticalWaitTime = 10000 + Math.random() * 5000;
  logInfo(
    `Waiting ${Math.round(criticalWaitTime / 1000)} seconds after critical error recovery...`,
  );
  await new Promise((resolve) => setTimeout(resolve, criticalWaitTime));
}

async function handleCaptchaDetection(ctx: PuppeteerContext): Promise<boolean> {
  if (!ctx.page || ctx.page?.isClosed() || ctx.page.mainFrame().isDetached()) {
    logWarn("Skipping CAPTCHA check as page is invalid.");
    return false;
  }

  try {
    const captchaDetected = await checkForCaptcha(ctx);
    if (captchaDetected) {
      logError("CAPTCHA detected! Initiating recovery...");
      await recoveryProcedure(ctx);
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return true;
    }
  } catch (captchaCheckError) {
    logWarn(`Error checking for CAPTCHA: ${captchaCheckError}`);
  }

  return false;
}

async function handleTimeoutError(
  ctx: PuppeteerContext,
  consecutiveTimeouts: number,
): Promise<void> {
  logError(
    `Timeout detected during operation (${consecutiveTimeouts} consecutive), attempting recovery...`,
  );
  await recoveryProcedure(ctx);
  const timeoutWaitTime = Math.min(5000 * consecutiveTimeouts, 30000);
  logInfo(`Waiting ${timeoutWaitTime / 1000} seconds after timeout...`);
  await new Promise((resolve) => setTimeout(resolve, timeoutWaitTime));
}

async function handleNavigationError(
  ctx: PuppeteerContext,
  consecutiveNavigationErrors: number,
): Promise<void> {
  logError(
    `Navigation error detected (${consecutiveNavigationErrors} consecutive), attempting recovery...`,
  );
  await recoveryProcedure(ctx);
  const navWaitTime = Math.min(8000 * consecutiveNavigationErrors, 40000);
  logInfo(`Waiting ${navWaitTime / 1000} seconds after navigation error...`);
  await new Promise((resolve) => setTimeout(resolve, navWaitTime));
}

async function handleConnectionError(ctx: PuppeteerContext): Promise<void> {
  logError("Connection or protocol error detected, attempting recovery with longer wait...");
  await recoveryProcedure(ctx);
  const connectionWaitTime = 15000 + Math.random() * 10000;
  logInfo(`Waiting ${Math.round(connectionWaitTime / 1000)} seconds after connection error...`);
  await new Promise((resolve) => setTimeout(resolve, connectionWaitTime));
}

async function handleRetryNavigation(ctx: PuppeteerContext, attemptNumber: number): Promise<void> {
  try {
    logInfo("Attempting to re-navigate to Perplexity...");
    await navigateToPerplexity(ctx);
    logInfo("Re-navigation successful");
  } catch (navError) {
    logError(`Navigation failed during retry: ${navError}`);
    const navFailWaitTime = 10000 + Math.random() * 5000;
    logInfo(
      `Navigation failed, waiting ${Math.round(navFailWaitTime / 1000)} seconds before next attempt...`,
    );
    await new Promise((resolve) => setTimeout(resolve, navFailWaitTime));
    if (attemptNumber > 1) {
      logInfo("Multiple navigation failures, attempting full recovery...");
      await recoveryProcedure(ctx);
    }
  }
}

// Additional helper for retry operation
async function handleRetryError(
  ctx: PuppeteerContext,
  error: Error,
  attemptNumber: number,
  consecutiveTimeouts: number,
  consecutiveNavigationErrors: number,
): Promise<{
  shouldContinue: boolean;
  newConsecutiveTimeouts: number;
  newConsecutiveNavigationErrors: number;
}> {
  const errorAnalysis = analyzeError(error);
  errorAnalysis.consecutiveTimeouts = consecutiveTimeouts;
  errorAnalysis.consecutiveNavigationErrors = consecutiveNavigationErrors;

  // Handle detached frame errors immediately
  if (errorAnalysis.isDetachedFrame) {
    await handleDetachedFrameError(ctx, error);
    return {
      shouldContinue: true,
      newConsecutiveTimeouts: consecutiveTimeouts,
      newConsecutiveNavigationErrors: consecutiveNavigationErrors,
    };
  }

  // Check for CAPTCHA
  const captchaHandled = await handleCaptchaDetection(ctx);
  if (captchaHandled) {
    return {
      shouldContinue: true,
      newConsecutiveTimeouts: consecutiveTimeouts,
      newConsecutiveNavigationErrors: consecutiveNavigationErrors,
    };
  }

  // Handle specific error types
  if (errorAnalysis.isTimeout) {
    await handleTimeoutError(ctx, consecutiveTimeouts + 1);
    return {
      shouldContinue: true,
      newConsecutiveTimeouts: consecutiveTimeouts + 1,
      newConsecutiveNavigationErrors: consecutiveNavigationErrors,
    };
  }

  if (errorAnalysis.isNavigation) {
    await handleNavigationError(ctx, consecutiveNavigationErrors + 1);
    return {
      shouldContinue: true,
      newConsecutiveTimeouts: consecutiveTimeouts,
      newConsecutiveNavigationErrors: consecutiveNavigationErrors + 1,
    };
  }

  if (errorAnalysis.isConnection) {
    await handleConnectionError(ctx);
    return {
      shouldContinue: true,
      newConsecutiveTimeouts: consecutiveTimeouts,
      newConsecutiveNavigationErrors: consecutiveNavigationErrors,
    };
  }

  // Handle general retry logic with navigation
  const delay = calculateRetryDelay(attemptNumber, errorAnalysis);
  logInfo(`Retrying in ${Math.round(delay / 1000)} seconds...`);
  await new Promise((resolve) => setTimeout(resolve, delay));
  await handleRetryNavigation(ctx, attemptNumber);

  return {
    shouldContinue: true,
    newConsecutiveTimeouts: consecutiveTimeouts,
    newConsecutiveNavigationErrors: consecutiveNavigationErrors,
  };
}

export async function retryOperation<T>(
  ctx: PuppeteerContext,
  operation: () => Promise<T>,
  maxRetries = CONFIG.MAX_RETRIES,
): Promise<T> {
  let lastError: Error | null = null;
  let consecutiveTimeouts = 0;
  let consecutiveNavigationErrors = 0;

  for (let i = 0; i < maxRetries; i++) {
    try {
      logInfo(`Attempt ${i + 1}/${maxRetries}...`);
      const result = await operation();
      return result; // Success - reset counters not needed since we're returning
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logError(`Attempt ${i + 1} failed: ${error}`);

      if (i === maxRetries - 1) {
        logError(`Maximum retry attempts (${maxRetries}) reached. Giving up.`);
        break;
      }

      const retryResult = await handleRetryError(
        ctx,
        lastError,
        i,
        consecutiveTimeouts,
        consecutiveNavigationErrors,
      );
      consecutiveTimeouts = retryResult.newConsecutiveTimeouts;
      consecutiveNavigationErrors = retryResult.newConsecutiveNavigationErrors;
    }
  }

  const errorMessage = lastError
    ? `Operation failed after ${maxRetries} retries. Last error: ${lastError.message}`
    : `Operation failed after ${maxRetries} retries with unknown error`;
  logError(errorMessage);
  throw new Error(errorMessage);
}

export function resetIdleTimeout(ctx: PuppeteerContext) {
  if (ctx.idleTimeout) {
    clearTimeout(ctx.idleTimeout);
  }
  const timeout = setTimeout(
    async () => {
      logInfo("Browser idle timeout reached, closing browser...");
      try {
        if (ctx.page) {
          await ctx.page.close();
          ctx.setPage(null);
        }
        if (ctx.browser) {
          await ctx.browser.close();
          ctx.setBrowser(null);
        }
        ctx.setIsInitializing(false); // Reset initialization flag
        logInfo("Browser cleanup completed successfully");
      } catch (error) {
        logError(`Error during browser cleanup: ${error}`);
        ctx.setPage(null);
        ctx.setBrowser(null);
        ctx.setIsInitializing(false);
      }
    },
    ctx.IDLE_TIMEOUT_MS || 5 * 60 * 1000,
  );
  ctx.setIdleTimeout(timeout);
}
