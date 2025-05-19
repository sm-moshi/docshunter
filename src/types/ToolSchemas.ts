// src/types/ToolSchemas.ts
import { z } from "zod";

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