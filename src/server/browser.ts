import puppeteer, {
  type Browser,
  type Page,
  type WaitForSelectorOptions,
} from "puppeteer";
import { CONFIG } from "./config.js";

export class BrowserManager {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private isInitializing = false;
  private searchInputSelector = 'textarea[placeholder*="Ask"]';
  private lastSearchTime = 0;
  private idleTimeout: NodeJS.Timeout | null = null;
  private readonly IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  private operationCount = 0;

  // --- Exposed Methods/Properties ---
  public async close() {
    if (this.page?.isClosed()) await this.page.close();
    if (this.browser?.isConnected()) await this.browser.close();
    this.page = null;
    this.browser = null;
  }

  public async launch(options?: Parameters<typeof puppeteer.launch>[0]) {
    this.browser = await puppeteer.launch(options);
    this.page = await this.browser.newPage();
  }

  public async setViewport(viewport: Parameters<Page["setViewport"]>[0]) {
    if (this.page) await this.page.setViewport(viewport);
  }

  public async setUserAgent(ua: string) {
    if (this.page) await this.page.setUserAgent(ua);
  }

  public setDefaultNavigationTimeout(timeout: number) {
    if (this.page) this.page.setDefaultNavigationTimeout(timeout);
  }

  public async goto(url: string, options?: Parameters<Page["goto"]>[1]) {
    if (!this.page) throw new Error("Page not initialized");
    return this.page.goto(url, options);
  }

  public async evaluate<T>(
    pageFunction: (...args: unknown[]) => T | Promise<T> | string,
    ...args: unknown[]
  ): Promise<T> {
    if (!this.page) throw new Error("Page not initialized");
    // @ts-expect-error: page.evaluate may require any type for args
    return this.page.evaluate(pageFunction, ...args);
  }

  public isClosed(): boolean {
    return !this.page || this.page.isClosed();
  }

  public mainFrame() {
    if (!this.page) throw new Error("Page not initialized");
    return this.page.mainFrame();
  }

  public async screenshot(options?: Parameters<Page["screenshot"]>[0]) {
    if (!this.page) throw new Error("Page not initialized");
    return this.page.screenshot(options);
  }

  public async evaluateOnNewDocument(
    pageFunction: (...args: unknown[]) => unknown,
    ...args: unknown[]
  ) {
    if (!this.page) throw new Error("Page not initialized");
    return this.page.evaluateOnNewDocument(pageFunction, ...args);
  }

  public async waitForSelector(
    selector: string,
    options?: WaitForSelectorOptions,
  ) {
    if (!this.page) throw new Error("Page not initialized");
    return this.page.waitForSelector(selector, options);
  }

  public async reload(options?: Parameters<Page["reload"]>[0]) {
    if (!this.page) throw new Error("Page not initialized");
    return this.page.reload(options);
  }

  public isConnected(): boolean {
    return !!this.browser && this.browser.isConnected();
  }

  public async newPage() {
    if (!this.browser) throw new Error("Browser not initialized");
    this.page = await this.browser.newPage();
    return this.page;
  }

  public async title() {
    if (!this.page) throw new Error("Page not initialized");
    return this.page.title();
  }

  public url() {
    if (!this.page) throw new Error("Page not initialized");
    return this.page.url();
  }

  public async content() {
    if (!this.page) throw new Error("Page not initialized");
    return this.page.content();
  }

  public async click(selector: string, options?: Parameters<Page["click"]>[1]) {
    if (!this.page) throw new Error("Page not initialized");
    return this.page.click(selector, options);
  }

  public get keyboard() {
    if (!this.page) throw new Error("Page not initialized");
    return this.page.keyboard;
  }

  public async type(
    selector: string,
    text: string,
    options?: Parameters<Page["type"]>[2],
  ) {
    if (!this.page) throw new Error("Page not initialized");
    return this.page.type(selector, text, options);
  }

  public async waitForSearchInput(
    _timeout = CONFIG.SELECTOR_TIMEOUT,
  ): Promise<string | null> {
    if (!this.page) return null;
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
        const element = await this.page.waitForSelector(selector, {
          timeout: 5000,
          visible: true,
        });
        if (element) {
          const isInteractive = await this.page.evaluate((sel: string) => {
            const el = document.querySelector(sel);
            return (
              el &&
              !el.hasAttribute("disabled") &&
              el.getAttribute("aria-hidden") !== "true"
            );
          }, selector);
          if (isInteractive) {
            console.log(`Found working search input: ${selector}`);
            this.searchInputSelector = selector;
            return selector;
          }
        }
      } catch (error) {
        console.warn(`Selector '${selector}' not found or not interactive`);
      }
    }
    // Take a screenshot for debugging if none is found
    await this.page.screenshot({
      path: "debug_search_not_found.png",
      fullPage: true,
    });
    console.error("No working search input found");
    return null;
  }

  // --- Existing logic ---
  async initializeBrowser() {
    if (this.isInitializing) {
      console.log("Browser initialization already in progress...");
      return;
    }
    this.isInitializing = true;
    try {
      if (this.browser) {
        await this.browser.close();
      }
      this.browser = await puppeteer.launch({
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
          "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        ],
      });
      this.page = await this.browser.newPage();
      await this.setupBrowserEvasion();
      await this.page.setViewport({
        width: 1280,
        height: 720,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
      });
      await this.page.setUserAgent(CONFIG.USER_AGENT);
      this.page.setDefaultNavigationTimeout(CONFIG.PAGE_TIMEOUT);
      await this.navigateToPerplexity();
    } catch (e) {
      console.error("Browser initialization failed:", e);
      throw e;
    } finally {
      this.isInitializing = false;
    }
  }

  async navigateToPerplexity() {
    if (!this.page) throw new Error("Page not initialized");
    try {
      console.log("Navigating to Perplexity.ai...");
      try {
        await this.page.goto("https://www.perplexity.ai/", {
          waitUntil: "domcontentloaded",
          timeout: CONFIG.PAGE_TIMEOUT,
        });
        const isInternalError = await this.page.evaluate(() => {
          return (
            document
              .querySelector("main")
              ?.textContent?.includes("internal error") || false
          );
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
          console.error("Initial navigation request failed:", gotoError);
          throw gotoError;
        }
        console.warn(
          "Navigation issue detected:",
          gotoError instanceof Error ? gotoError.message : String(gotoError),
        );
      }
      if (this.page.isClosed() || this.page.mainFrame().isDetached()) {
        console.error(
          "Page closed or frame detached immediately after navigation attempt.",
        );
        throw new Error("Frame detached during navigation");
      }
      console.log(
        "Navigation initiated, waiting for search input to confirm readiness...",
      );
      const searchInput = await this.waitForSearchInput();
      if (!searchInput) {
        console.error(
          "Search input not found after navigation, taking screenshot for debugging",
        );
        if (!this.page.isClosed()) {
          await this.page.screenshot({
            path: "debug_no_search_input.png",
            fullPage: true,
          });
        }
        throw new Error(
          "Search input not found after navigation - page might not have loaded correctly",
        );
      }
      console.log("Search input found, page appears ready.");
      await new Promise((resolve) => setTimeout(resolve, 3000));
      let pageTitle = "N/A";
      let pageUrl = "N/A";
      try {
        if (!this.page.isClosed()) {
          pageTitle = await this.page.title();
          pageUrl = this.page.url();
        }
      } catch (titleError) {
        console.warn(
          "Could not retrieve page title/URL after navigation:",
          titleError,
        );
      }
      console.log(`Page loaded: ${pageUrl} (${pageTitle})`);
      if (pageUrl !== "N/A" && !(pageUrl ?? "").includes("perplexity.ai")) {
        console.error(`Unexpected URL: ${pageUrl}`);
        throw new Error(`Navigation redirected to unexpected URL: ${pageUrl}`);
      }
      console.log("Navigation and readiness check completed successfully");
    } catch (e) {
      console.error("Navigation failed:", e);
      try {
        if (this.page) {
          await this.page.screenshot({
            path: "debug_navigation_failed.png",
            fullPage: true,
          });
          console.log("Captured screenshot of failed navigation state");
        }
      } catch (screenshotError) {
        console.error("Failed to capture screenshot:", screenshotError);
      }
      throw e;
    }
  }

  async setupBrowserEvasion() {
    if (!this.page) return;
    await this.page.evaluateOnNewDocument(() => {
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
            isInstalled: false,
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
              onMessage: {},
            }),
          },
        };
      }
    });
  }

  // TODO: Add more browser-related methods as needed...
}
