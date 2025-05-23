/**
 * Type definitions for MCP tools and server components
 * Centralized type definitions to avoid duplication across the codebase
 */

import type { Browser, Page } from "puppeteer";

// ─── GLOBAL DECLARATIONS ─────────────────────────────────────────────
declare global {
  interface Window {
    chrome: {
      app: {
        InstallState: {
          DISABLED: string;
          INSTALLED: string;
          NOT_INSTALLED: string;
        };
        RunningState: {
          CANNOT_RUN: string;
          READY_TO_RUN: string;
          RUNNING: string;
        };
        getDetails: () => void;
        getIsInstalled: () => void;
        installState: () => void;
        isInstalled: boolean;
        runningState: () => void;
      };
      runtime: {
        OnInstalledReason: {
          CHROME_UPDATE: string;
          INSTALL: string;
          SHARED_MODULE_UPDATE: string;
          UPDATE: string;
        };
        PlatformArch: {
          ARM: string;
          ARM64: string;
          MIPS: string;
          MIPS64: string;
          X86_32: string;
          X86_64: string;
        };
        PlatformNaclArch: {
          ARM: string;
          MIPS: string;
          PNACL: string;
          X86_32: string;
          X86_64: string;
        };
        PlatformOs: {
          ANDROID: string;
          CROS: string;
          LINUX: string;
          MAC: string;
          OPENBSD: string;
          WIN: string;
        };
        RequestUpdateCheckStatus: {
          NO_UPDATE: string;
          THROTTLED: string;
          UPDATE_AVAILABLE: string;
        };
        connect: () => {
          postMessage: () => void;
          onMessage: {
            addListener: () => void;
            removeListener: () => void;
          };
          disconnect: () => void;
        };
      };
    };
  }
}

// ─── CHAT & DATABASE TYPES ────────────────────────────────────────────
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ─── PUPPETEER CONTEXT TYPE ───────────────────────────────────────────
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

// ─── CONTENT EXTRACTION TYPES ─────────────────────────────────────────
export interface PageContentResult {
  url: string;
  title?: string | null;
  textContent?: string | null;
  error?: string | null;
}

export interface RecursiveFetchResult {
  status: "Success" | "SuccessWithPartial" | "Error";
  message?: string;
  rootUrl: string;
  explorationDepth: number;
  pagesExplored: number;
  content: PageContentResult[];
}

// ─── TOOL ARGUMENT TYPES ──────────────────────────────────────────────
export interface ChatPerplexityArgs {
  message: string;
  chat_id?: string;
}

export interface ExtractUrlContentArgs {
  url: string;
  depth?: number;
}

export interface GetDocumentationArgs {
  query: string;
  context?: string;
}

export interface FindApisArgs {
  requirement: string;
  context?: string;
}

export interface CheckDeprecatedCodeArgs {
  code: string;
  technology?: string;
}

export interface SearchArgs {
  query: string;
  detail_level?: "brief" | "normal" | "detailed";
}

// ─── UNION TYPES ──────────────────────────────────────────────────────
export type ToolArgs =
  | ChatPerplexityArgs
  | ExtractUrlContentArgs
  | GetDocumentationArgs
  | FindApisArgs
  | CheckDeprecatedCodeArgs
  | SearchArgs;

// ─── RESULT TYPES ─────────────────────────────────────────────────────
export interface ChatResult {
  chat_id: string;
  response: string;
}
