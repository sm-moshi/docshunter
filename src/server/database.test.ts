import { describe, expect, it, vi } from 'vitest';
import { ChatDatabase } from './database';

vi.mock('better-sqlite3', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      exec: vi.fn(),
      prepare: vi.fn(() => ({
        all: vi.fn(() => [{ role: 'user', content: 'hi' }]),
        run: vi.fn(),
      })),
      close: vi.fn(),
    })),
  };
});

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
}));

describe('ChatDatabase', () => {
  it('should initialize and get chat history', () => {
    const db = new ChatDatabase('/tmp');
    const history = db.getChatHistory('chat1');
    expect(history[0].role).toBe('user');
    expect(history[0].content).toBe('hi');
    db.close();
  });

  it('should save a chat message without error', () => {
    const db = new ChatDatabase('/tmp');
    expect(() => db.saveChatMessage('chat1', { role: 'user', content: 'hello' })).not.toThrow();
    db.close();
  });
});
