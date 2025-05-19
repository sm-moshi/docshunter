// src/types/ToolContext.ts
import { z } from "zod";

export interface ToolContext {
  input: unknown;
  inputSchema: z.ZodTypeAny;
  server: any;
  toolName: string;
}