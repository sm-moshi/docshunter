import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ChatMessage } from "./types/types.js";

export class ChatDatabase {
  private db: Database.Database;

  constructor(baseDir: string) {
    const dbPath = join(baseDir, "chat_history.db");
    const dbDir = dirname(dbPath);
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }
    this.db = new Database(dbPath, { fileMustExist: false });
    this.initializeDatabase();
  }

  private initializeDatabase() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chat_id) REFERENCES chats(id)
      )
    `);
  }

  getChatHistory(chatId: string): ChatMessage[] {
    const messages = this.db
      .prepare(
        "SELECT role, content FROM messages WHERE chat_id = ? ORDER BY created_at ASC",
      )
      .all(chatId);
    return messages as ChatMessage[];
  }

  saveChatMessage(chatId: string, message: ChatMessage) {
    this.db.prepare("INSERT OR IGNORE INTO chats (id) VALUES (?)").run(chatId);
    this.db
      .prepare("INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)")
      .run(chatId, message.role, message.content);
  }

  close() {
    this.db.close();
  }
}
