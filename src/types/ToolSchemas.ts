// src/types/ToolSchemas.ts
import { z } from "zod";

// Individual schemas
export const SearchToolSchema = z.object({
  query: z.string().min(2),
});

export const ChatPerplexitySchema = z.object({
  message: z.string().min(2),
});

export const ExtractUrlContentSchema = z.object({
  url: z.string().url(),
});

export const GetDocumentationSchema = z.object({
  topic: z.string(),
});

export const CheckDeprecatedCodeSchema = z.object({
  code: z.string().min(5),
});

export const FindApisSchema = z.object({
  code: z.string().min(5),
});

// Registry object for dynamic access
export const ToolSchemas = {
  search: SearchToolSchema,
  chat_perplexity: ChatPerplexitySchema,
  extract_url_content: ExtractUrlContentSchema,
  get_documentation: GetDocumentationSchema,
  check_deprecated_code: CheckDeprecatedCodeSchema,
  find_apis: FindApisSchema,
};

// Union of all tool names
export type ToolName = keyof typeof ToolSchemas;