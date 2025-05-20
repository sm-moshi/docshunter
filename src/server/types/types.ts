// ─── TYPE DECLARATIONS ─────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// --- Recursive Content Extraction Types ---
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
