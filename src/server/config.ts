export type { AppConfig, TimeoutProfiles } from "../types/config.js";

import { z } from "zod";
import type { AppConfig, TimeoutProfiles } from "../types/config.js";

const Env = z.object({
  SEARCH_COOLDOWN: z.coerce.number().int().min(0).default(5000),
  PAGE_TIMEOUT: z.coerce.number().int().min(1000).default(180000),
  SELECTOR_TIMEOUT: z.coerce.number().int().min(1000).default(90000),
  MAX_RETRIES: z.coerce.number().int().min(0).default(10),
  MCP_TIMEOUT_BUFFER: z.coerce.number().int().min(0).default(60000),
  ANSWER_WAIT_TIMEOUT: z.coerce.number().int().min(0).default(120000),
  RECOVERY_WAIT_TIME: z.coerce.number().int().min(0).default(15000),
  USER_AGENT: z
    .string()
    .default(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ),
  TIMEOUT_PROFILES: z
    .string()
    .optional()
    .transform((val): TimeoutProfiles => {
      const def: TimeoutProfiles = {
        navigation: 45000,
        selector: 15000,
        content: 120000,
        recovery: 30000,
      };
      if (!val) return def;
      try {
        const parsed = JSON.parse(val);
        return {
          navigation: Number(parsed?.navigation ?? def.navigation),
          selector: Number(parsed?.selector ?? def.selector),
          content: Number(parsed?.content ?? def.content),
          recovery: Number(parsed?.recovery ?? def.recovery),
        };
      } catch {
        return def;
      }
    }),
});

const parsed = Env.parse(process.env);

export const TIMEOUT_PROFILES: TimeoutProfiles = parsed.TIMEOUT_PROFILES;

export const CONFIG: Readonly<AppConfig> = {
  SEARCH_COOLDOWN: parsed.SEARCH_COOLDOWN,
  PAGE_TIMEOUT: parsed.PAGE_TIMEOUT,
  SELECTOR_TIMEOUT: parsed.SELECTOR_TIMEOUT,
  MAX_RETRIES: parsed.MAX_RETRIES,
  MCP_TIMEOUT_BUFFER: parsed.MCP_TIMEOUT_BUFFER,
  ANSWER_WAIT_TIMEOUT: parsed.ANSWER_WAIT_TIMEOUT,
  RECOVERY_WAIT_TIME: parsed.RECOVERY_WAIT_TIME,
  USER_AGENT: parsed.USER_AGENT,
  TIMEOUT_PROFILES,
} as const;
