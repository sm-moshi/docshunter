/**
 * Puppeteer utility functions for browser automation, navigation, and recovery
 */
import puppeteer, { type Browser, type Page } from "puppeteer";
import type { PuppeteerContext, RecoveryContext } from "../types/index.js";
import { CONFIG } from "../server/config.js";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { logInfo, logWarn, logError } from "./logging.js";
import {
  determineRecoveryLevel,
  analyzeError,
  calculateRetryDelay,
  generateBrowserArgs,
  getSearchInputSelectors,
  getCaptchaSelectors,
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

export async function navigateToPerplexity(ctx: PuppeteerContext) {
  const { page } = ctx;
  if (!page) throw new Error("Page not initialized");
  try {
    logInfo("Navigating to Perplexity.ai...");
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
    if (page.isClosed() || page.mainFrame().isDetached()) {
      logError("Page closed or frame detached immediately after navigation attempt.");
      throw new Error("Frame detached during navigation");
    }
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
    logInfo("Navigation and readiness check completed successfully");
  } catch (error) {
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
      case 1: // Page refresh
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
        break;
      case 2: // New page
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
        if (ctx.browser?.isConnected()) {
          try {
            const page = await ctx.browser.newPage();
            ctx.setPage(page);
            await setupBrowserEvasion(ctx);
            await page.setViewport({ width: 1920, height: 1080 });
            await page.setUserAgent(CONFIG.USER_AGENT);
          } catch (newPageError) {
            logError(
              `Failed to create new page: ${newPageError instanceof Error ? newPageError.message : String(newPageError)}. Escalating to full restart.`,
            );
            // Escalate to full restart
            recoveryLevel = 3;
          }
        } else {
          logWarn(
            "Browser was null or disconnected, cannot create new page. Escalating to full restart.",
          );
          // Escalate to full restart
          recoveryLevel = 3;
        }
        break;
      case 3:
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
      consecutiveTimeouts = 0;
      consecutiveNavigationErrors = 0;
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logError(`Attempt ${i + 1} failed: ${error}`);
      if (i === maxRetries - 1) {
        logError(`Maximum retry attempts (${maxRetries}) reached. Giving up.`);
        break;
      }
      // Analyze the error using extracted logic
      const errorAnalysis = analyzeError(lastError);
      errorAnalysis.consecutiveTimeouts = consecutiveTimeouts;
      errorAnalysis.consecutiveNavigationErrors = consecutiveNavigationErrors;
      if (errorAnalysis.isDetachedFrame) {
        const errorMsg = lastError.message;
        logError(
          `Detached frame or protocol error detected ('${errorMsg.substring(0, 100)}...'). Initiating immediate recovery.`,
        );
        await recoveryProcedure(ctx, lastError);
        const criticalWaitTime = 10000 + Math.random() * 5000;
        logInfo(
          `Waiting ${Math.round(criticalWaitTime / 1000)} seconds after critical error recovery...`,
        );
        await new Promise((resolve) => setTimeout(resolve, criticalWaitTime));
        continue;
      }
      let captchaDetected = false;
      if (ctx.page && !ctx.page?.isClosed() && !ctx.page.mainFrame().isDetached()) {
        try {
          captchaDetected = await checkForCaptcha(ctx);
        } catch (captchaCheckError) {
          logWarn(`Error checking for CAPTCHA: ${captchaCheckError}`);
        }
      } else {
        logWarn("Skipping CAPTCHA check as page is invalid.");
      }
      if (captchaDetected) {
        logError("CAPTCHA detected! Initiating recovery...");
        await recoveryProcedure(ctx);
        await new Promise((resolve) => setTimeout(resolve, 3000));
        continue;
      }
      if (errorAnalysis.isTimeout) {
        logError(
          `Timeout detected during operation (${++consecutiveTimeouts} consecutive), attempting recovery...`,
        );
        await recoveryProcedure(ctx);
        const timeoutWaitTime = Math.min(5000 * consecutiveTimeouts, 30000);
        logInfo(`Waiting ${timeoutWaitTime / 1000} seconds after timeout...`);
        await new Promise((resolve) => setTimeout(resolve, timeoutWaitTime));
        continue;
      }
      if (errorAnalysis.isNavigation) {
        logError(
          `Navigation error detected (${++consecutiveNavigationErrors} consecutive), attempting recovery...`,
        );
        await recoveryProcedure(ctx);
        const navWaitTime = Math.min(8000 * consecutiveNavigationErrors, 40000);
        logInfo(`Waiting ${navWaitTime / 1000} seconds after navigation error...`);
        await new Promise((resolve) => setTimeout(resolve, navWaitTime));
        continue;
      }
      if (errorAnalysis.isConnection) {
        logError("Connection or protocol error detected, attempting recovery with longer wait...");
        await recoveryProcedure(ctx);
        const connectionWaitTime = 15000 + Math.random() * 10000;
        logInfo(
          `Waiting ${Math.round(connectionWaitTime / 1000)} seconds after connection error...`,
        );
        await new Promise((resolve) => setTimeout(resolve, connectionWaitTime));
        continue;
      }
      const delay = calculateRetryDelay(i, errorAnalysis);
      logInfo(`Retrying in ${Math.round(delay / 1000)} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
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
        if (i > 1) {
          logInfo("Multiple navigation failures, attempting full recovery...");
          await recoveryProcedure(ctx);
        }
      }
    }
  }
  const errorMessage = lastError
    ? `Operation failed after ${maxRetries} retries. Last error: ${lastError.message}`
    : `Operation failed after ${maxRetries} retries with unknown error`;
  logError(errorMessage);
  throw new Error(errorMessage);
}
