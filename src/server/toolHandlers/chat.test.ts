import { describe, expect, it, vi } from "vitest";
import type { BrowserManager } from "../browser.js";
import { handleChatPerplexity } from "./chat.js";

// Mock dependencies
const mockDb = {
  getChatHistory: vi.fn(() => []),
  saveChatMessage: vi.fn(),
};
const mockBrowserManager: Partial<BrowserManager> = {};
const mockPerformSearch = (query: string) => Promise.resolve(`Search: ${query}`);

describe("handleChatPerplexity", () => {
	it("returns a response from performSearch", async () => {
		const result = await handleChatPerplexity(
			{ message: "Hello, world!" },
      mockDb as unknown as import("../database").ChatDatabase,
			mockBrowserManager as BrowserManager,
			mockPerformSearch,
		);
		expect(result).toContain("Echo:");
	});
});
