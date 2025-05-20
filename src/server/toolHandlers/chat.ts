import crypto from "node:crypto";
import type { BrowserManager } from "../browser.js";
import type { ChatDatabase } from "../database.js";
import type { ChatMessage } from "../types/types.js";

export async function handleChatPerplexity(
  args: { message: string; chat_id?: string },
  db: ChatDatabase,
  browserManager: BrowserManager,
  performSearch: (query: string) => Promise<string>,
): Promise<string> {
  const { message, chat_id = crypto.randomUUID() } = args;
  const history = db.getChatHistory(chat_id);
  const userMessage: ChatMessage = { role: "user", content: message };
  db.saveChatMessage(chat_id, userMessage);

  let conversationPrompt = "";
  for (const msg of history) {
    conversationPrompt +=
      msg.role === "user"
        ? `User: ${msg.content}\n`
        : `Assistant: ${msg.content}\n`;
  }
  conversationPrompt += `User: ${message}\n`;

  return await performSearch(conversationPrompt);
}
