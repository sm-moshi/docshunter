import { describe, expect, it } from "vitest";
import type { BrowserManager } from "../browser.js";
import type { ChatDatabase } from "../database.js";
import { handleChatPerplexity } from "./chat.js";

// Mock dependencies
const mockDb: Partial<ChatDatabase> = {
	getChatHistory: () => [],
	saveChatMessage: () => {},
};
const mockBrowserManager: Partial<BrowserManager> = {};
const mockPerformSearch = async (prompt: string) => `Echo: ${prompt}`;

describe("handleChatPerplexity", () => {
	it("returns a response from performSearch", async () => {
		const result = await handleChatPerplexity(
			{ message: "Hello, world!" },
			mockDb as ChatDatabase,
			mockBrowserManager as BrowserManager,
			mockPerformSearch,
		);
		expect(result).toContain("Echo:");
	});
});
