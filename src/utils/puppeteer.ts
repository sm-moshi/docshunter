import puppeteer, { type Browser, type Page } from "puppeteer";
import { CONFIG } from "../server/config.js";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

// Context type for passing browser/page/state
export interface PuppeteerContext {
  browser: Browser | null;
  page: Page | null;
  isInitializing: boolean;
  searchInputSelector: string;
  lastSearchTime: number;
  idleTimeout: NodeJS.Timeout | null;
  operationCount: number;
  log: (level: "info" | "error" | "warn", message: string) => void;
  setBrowser: (browser: Browser | null) => void;
  setPage: (page: Page | null) => void;
  setIsInitializing: (val: boolean) => void;
  setSearchInputSelector: (selector: string) => void;
  setIdleTimeout: (timeout: NodeJS.Timeout | null) => void;
  incrementOperationCount: () => number;
  determineRecoveryLevel: (error?: Error) => number;
  IDLE_TIMEOUT_MS: number;
}

export async function initializeBrowser(ctx: PuppeteerContext) {
  if (ctx.isInitializing) {
    ctx.log("info", "Browser initialization already in progress...");
    return;
  }
  ctx.setIsInitializing(true);
  try {
    if (ctx.browser) {
      await ctx.browser.close();
    }
    const browser = await puppeteer.launch({
      headless: true,
      args: [
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
        `--user-agent=${CONFIG.USER_AGENT}`,
      ],
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
    await navigateToPerplexity(ctx);
  } catch (error) {
    ctx.log("error", `Browser initialization failed: ${error}`);
    throw error;
  } finally {
    ctx.setIsInitializing(false);
  }
}

export async function navigateToPerplexity(ctx: PuppeteerContext) {
  const { page } = ctx;
  if (!page) throw new Error("Page not initialized");
  try {
    ctx.log("info", "Navigating to Perplexity.ai...");
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
        ctx.log("error", `Initial navigation request failed: ${gotoError}`);
        throw gotoError;
      }
      ctx.log(
        "warn",
        `Navigation issue detected: ${gotoError instanceof Error ? gotoError.message : String(gotoError)}`,
      );
    }
    if (page.isClosed() || page.mainFrame().isDetached()) {
      ctx.log("error", "Page closed or frame detached immediately after navigation attempt.");
      throw new Error("Frame detached during navigation");
    }
    ctx.log("info", "Navigation initiated, waiting for search input to confirm readiness...");
    const searchInput = await waitForSearchInput(ctx);
    if (!searchInput) {
      ctx.log("error", "Search input not found after navigation, taking screenshot for debugging");
      if (!page.isClosed()) {
        await page.screenshot({ path: "debug_no_search_input.png", fullPage: true });
      }
      throw new Error(
        "Search input not found after navigation - page might not have loaded correctly",
      );
    }
    ctx.log("info", "Search input found, page appears ready.");
    await new Promise((resolve) => setTimeout(resolve, 3000));
    let pageTitle = "N/A";
    let pageUrl = "N/A";
    try {
      if (!page.isClosed()) {
        pageTitle = await page.title();
        pageUrl = page.url();
      }
    } catch (titleError) {
      ctx.log("warn", `Could not retrieve page title/URL after navigation: ${titleError}`);
    }
    ctx.log("info", `Page loaded: ${pageUrl} (${pageTitle})`);
    if (pageUrl !== "N/A" && !pageUrl.includes("perplexity.ai")) {
      ctx.log("error", `Unexpected URL: ${pageUrl}`);
      throw new Error(`Navigation redirected to unexpected URL: ${pageUrl}`);
    }
    ctx.log("info", "Navigation and readiness check completed successfully");
  } catch (error) {
    ctx.log("error", `Navigation failed: ${error}`);
    try {
      if (page) {
        await page.screenshot({ path: "debug_navigation_failed.png", fullPage: true });
        ctx.log("info", "Captured screenshot of failed navigation state");
      }
    } catch (screenshotError) {
      ctx.log("error", `Failed to capture screenshot: ${screenshotError}`);
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
  const possibleSelectors = [
    'textarea[placeholder*="Ask"]',
    'textarea[placeholder*="Search"]',
    "textarea.w-full",
    'textarea[rows="1"]',
    '[role="textbox"]',
    "textarea",
  ];
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
          ctx.log("info", `Found working search input: ${selector}`);
          setSearchInputSelector(selector);
          return selector;
        }
      }
    } catch (error) {
      ctx.log("warn", `Selector '${selector}' not found or not interactive`);
    }
  }
  await page.screenshot({ path: "debug_search_not_found.png", fullPage: true });
  ctx.log("error", "No working search input found");
  return null;
}

export async function checkForCaptcha(ctx: PuppeteerContext): Promise<boolean> {
  const { page } = ctx;
  if (!page) return false;
  const captchaIndicators = [
    '[class*="captcha"]',
    '[id*="captcha"]',
    'iframe[src*="captcha"]',
    'iframe[src*="recaptcha"]',
    'iframe[src*="turnstile"]',
    "#challenge-running",
    "#challenge-form",
  ];
  return await page.evaluate((selectors) => {
    return selectors.some((selector) => !!document.querySelector(selector));
  }, captchaIndicators);
}

export async function recoveryProcedure(ctx: PuppeteerContext, error?: Error): Promise<void> {
  const recoveryLevel = ctx.determineRecoveryLevel ? ctx.determineRecoveryLevel(error) : 3;
  const opId = ctx.incrementOperationCount();

  ctx.log("info", "Starting recovery procedure");

  try {
    switch (recoveryLevel) {
      case 1: // Page refresh
        ctx.log("info", "Attempting page refresh (Recovery Level 1)");
        if (ctx.page && !ctx.page?.isClosed()) {
          try {
            await ctx.page.reload({ timeout: CONFIG.TIMEOUT_PROFILES.navigation });
          } catch (reloadError) {
            ctx.log(
              "warn",
              `Page reload failed: ${reloadError instanceof Error ? reloadError.message : String(reloadError)}. Proceeding with recovery.`,
            );
          }
        } else {
          ctx.log("warn", "Page was null or closed, cannot refresh. Proceeding with recovery.");
        }
        break;
      case 2: // New page
        ctx.log("info", "Creating new page instance (Recovery Level 2)");
        if (ctx.page) {
          try {
            if (!ctx.page?.isClosed()) await ctx.page.close();
          } catch (closeError) {
            ctx.log(
              "warn",
              `Ignoring error closing old page: ${closeError instanceof Error ? closeError.message : String(closeError)}`,
            );
          }
          ctx.setPage(null);
        }
        if (ctx.browser && ctx.browser.isConnected()) {
          try {
            const page = await ctx.browser.newPage();
            ctx.setPage(page);
            await setupBrowserEvasion(ctx);
            await page.setViewport({ width: 1920, height: 1080 });
            await page.setUserAgent(CONFIG.USER_AGENT);
          } catch (newPageError) {
            ctx.log(
              "error",
              `Failed to create new page: ${newPageError instanceof Error ? newPageError.message : String(newPageError)}. Escalating to full restart.`,
            );
            // Force level 3 if creating a new page fails
            return await recoveryProcedure(ctx, new Error("Fallback recovery: new page failed"));
          }
        } else {
          ctx.log(
            "warn",
            "Browser was null or disconnected, cannot create new page. Escalating to full restart.",
          );
          return await recoveryProcedure(ctx, new Error("Fallback recovery: browser disconnected"));
        }
        break;
      case 3:
        ctx.log("info", "Performing full browser restart (Recovery Level 3)");
        if (ctx.page) {
          try {
            if (!ctx.page?.isClosed()) await ctx.page.close();
          } catch (closeError) {
            ctx.log(
              "warn",
              `Ignoring error closing page during full restart: ${closeError instanceof Error ? closeError.message : String(closeError)}`,
            );
          }
        }
        if (ctx.browser) {
          try {
            if (ctx.browser.isConnected()) await ctx.browser.close();
          } catch (closeError) {
            ctx.log(
              "warn",
              `Ignoring error closing browser during full restart: ${closeError instanceof Error ? closeError.message : String(closeError)}`,
            );
          }
        }
        ctx.setPage(null);
        ctx.setBrowser(null);
        ctx.setIsInitializing(false); // Ensure flag is reset
        ctx.log("info", "Waiting before re-initializing browser...");
        await new Promise((resolve) => setTimeout(resolve, CONFIG.RECOVERY_WAIT_TIME));
        await initializeBrowser(ctx); // This will set page and browser again
        break;
    }
    ctx.log("info", "Recovery completed");
  } catch (recoveryError) {
    ctx.log(
      "error",
      `Recovery failed: ${recoveryError instanceof Error ? recoveryError.message : String(recoveryError)}`,
    );
    if (recoveryLevel < 3) {
      ctx.log("info", "Attempting higher level recovery");
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
      ctx.log("info", "Browser idle timeout reached, closing browser...");
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
        ctx.log("info", "Browser cleanup completed successfully");
      } catch (error) {
        ctx.log("error", `Error during browser cleanup: ${error}`);
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
      ctx.log("info", `Attempt ${i + 1}/${maxRetries}...`);
      const result = await operation();
      consecutiveTimeouts = 0;
      consecutiveNavigationErrors = 0;
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      ctx.log("error", `Attempt ${i + 1} failed: ${error}`);
      if (i === maxRetries - 1) {
        ctx.log("error", `Maximum retry attempts (${maxRetries}) reached. Giving up.`);
        break;
      }
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isTimeoutError = errorMsg.includes("timeout") || errorMsg.includes("Timed out");
      const isNavigationError = errorMsg.includes("navigation") || errorMsg.includes("Navigation");
      const isConnectionError =
        errorMsg.includes("net::") ||
        errorMsg.includes("connection") ||
        errorMsg.includes("network");
      const isProtocolError = errorMsg.includes("protocol error");
      const isDetachedFrameError =
        errorMsg.includes("frame") ||
        errorMsg.includes("detached") ||
        errorMsg.includes("session closed") ||
        errorMsg.includes("target closed");
      if (isDetachedFrameError || isProtocolError) {
        ctx.log(
          "error",
          `Detached frame or protocol error detected ('${errorMsg.substring(0, 100)}...'). Initiating immediate recovery.`,
        );
        await recoveryProcedure(ctx, lastError);
        const criticalWaitTime = 10000 + Math.random() * 5000;
        ctx.log(
          "info",
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
          ctx.log("warn", `Error checking for CAPTCHA: ${captchaCheckError}`);
        }
      } else {
        ctx.log("warn", "Skipping CAPTCHA check as page is invalid.");
      }
      if (captchaDetected) {
        ctx.log("error", "CAPTCHA detected! Initiating recovery...");
        await recoveryProcedure(ctx);
        await new Promise((resolve) => setTimeout(resolve, 3000));
        continue;
      }
      if (isTimeoutError) {
        ctx.log(
          "error",
          `Timeout detected during operation (${++consecutiveTimeouts} consecutive), attempting recovery...`,
        );
        await recoveryProcedure(ctx);
        const timeoutWaitTime = Math.min(5000 * consecutiveTimeouts, 30000);
        ctx.log("info", `Waiting ${timeoutWaitTime / 1000} seconds after timeout...`);
        await new Promise((resolve) => setTimeout(resolve, timeoutWaitTime));
        continue;
      }
      if (isNavigationError) {
        ctx.log(
          "error",
          `Navigation error detected (${++consecutiveNavigationErrors} consecutive), attempting recovery...`,
        );
        await recoveryProcedure(ctx);
        const navWaitTime = Math.min(8000 * consecutiveNavigationErrors, 40000);
        ctx.log("info", `Waiting ${navWaitTime / 1000} seconds after navigation error...`);
        await new Promise((resolve) => setTimeout(resolve, navWaitTime));
        continue;
      }
      if (isConnectionError || isProtocolError) {
        ctx.log(
          "error",
          "Connection or protocol error detected, attempting recovery with longer wait...",
        );
        await recoveryProcedure(ctx);
        const connectionWaitTime = 15000 + Math.random() * 10000;
        ctx.log(
          "info",
          `Waiting ${Math.round(connectionWaitTime / 1000)} seconds after connection error...`,
        );
        await new Promise((resolve) => setTimeout(resolve, connectionWaitTime));
        continue;
      }
      const baseDelay = Math.min(1000 * 2 ** i, 30000);
      const maxJitter = Math.min(1000 * (i + 1), 10000);
      const jitter = Math.random() * maxJitter;
      const delay = baseDelay + jitter;
      ctx.log(
        "info",
        `Retrying in ${Math.round(delay / 1000)} seconds (base: ${Math.round(baseDelay / 1000)}s, jitter: ${Math.round(jitter / 1000)}s)...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      try {
        ctx.log("info", "Attempting to re-navigate to Perplexity...");
        await navigateToPerplexity(ctx);
        ctx.log("info", "Re-navigation successful");
      } catch (navError) {
        ctx.log("error", `Navigation failed during retry: ${navError}`);
        const navFailWaitTime = 10000 + Math.random() * 5000;
        ctx.log(
          "info",
          `Navigation failed, waiting ${Math.round(navFailWaitTime / 1000)} seconds before next attempt...`,
        );
        await new Promise((resolve) => setTimeout(resolve, navFailWaitTime));
        if (i > 1) {
          ctx.log("info", "Multiple navigation failures, attempting full recovery...");
          await recoveryProcedure(ctx);
        }
      }
    }
  }
  const errorMessage = lastError
    ? `Operation failed after ${maxRetries} retries. Last error: ${lastError.message}`
    : `Operation failed after ${maxRetries} retries with unknown error`;
  ctx.log("error", errorMessage);
  throw new Error(errorMessage);
}
