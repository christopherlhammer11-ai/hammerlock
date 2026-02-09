import { z } from "zod";

export const vaultSchema = z.object({
  version: z.literal(1),
  profile: z.object({
    name: z.string().default(""),
    role: z.string().default(""),
    location: z.string().default(""),
    timezone: z.string().default("")
  }),
  preferences: z.object({
    tone: z.enum(["direct", "friendly", "formal", "playful"]).default("direct"),
    style_notes: z.string().default(""),
    default_length: z.enum(["short", "medium", "long"]).default("medium")
  }),
  rules: z.object({
    never_share: z.array(z.string()).default([]),
    allowed_context: z.array(z.string()).default([])
  }),
  notes: z.object({
    safe_memory: z.string().default("")
  })
});

export type VaultV1 = z.infer<typeof vaultSchema>;
