// src/tools/ChatHistory.ts
export interface ChatHistory {
  id?: number;
  sessionId: string;
  query: string;
  response: string;
  provider?: "perplexity" | "openai" | "claude" | "custom";
  toolUsed?: string;
  createdAt?: string;
  metadata?: Record<string, any>;
}