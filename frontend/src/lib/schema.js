import { z } from "zod";

export const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["online", "broken", "idle"]),
  enabled: z.boolean(),
  ai: z.boolean().optional().default(false),
  updatedAt: z.any().optional(),
});

export const AgentsSchema = z.array(AgentSchema);

export const HistoryItemSchema = z.object({
  id: z.string(),
  agentId: z.string().nullable().optional(),
  content: z.string(),
  createdAt: z.any(),
});

export const HistorySchema = z.array(HistoryItemSchema);