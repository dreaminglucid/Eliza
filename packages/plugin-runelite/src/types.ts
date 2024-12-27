// src/types.ts
import { z } from "zod";

export const PlayerStateSchema = z.object({
    name: z.string(),
    location: z.object({
        x: z.number(),
        y: z.number(),
        plane: z.number(),
        regionId: z.number(),
        description: z.string(),
    }),
    equipment: z.object({
        slots: z.record(z.string(), z.number()),
        description: z.string(),
    }),
    stats: z.record(z.string(), z.number()).optional(),
    inventory: z.array(z.string()).optional(),
});

export const WorldStateSchema = z.object({
    currentPlayer: PlayerStateSchema,
    nearbyPlayers: z.array(
        z.object({
            name: z.string(),
            distance: z.number(),
        })
    ),
    nearbyObjects: z.array(z.string()).optional(),
    chatHistory: z.array(
        z.object({
            sender: z.string(),
            message: z.string(),
            timestamp: z.number(),
        })
    ),
    timestamp: z.number().default(0),
});

export const GameActionSchema = z.object({
    type: z.enum([
        "MOVE_TO",
        "INTERACT_OBJECT",
        "INTERACT_NPC",
        "INTERACT_PLAYER",
        "USE_ITEM",
        "CHAT_MESSAGE",
    ]),
    params: z.record(z.string(), z.any()).default({}),
});

// optional plugin config
export const RunescapePluginConfigSchema = z.object({
    apiKey: z.string().optional(),
    apiEndpoint: z.string().optional(),
    responseDelay: z.number().optional(),
    chatProbability: z.number().optional(),
});

export type PlayerState = z.infer<typeof PlayerStateSchema>;
export type WorldState = z.infer<typeof WorldStateSchema>;
export type GameAction = z.infer<typeof GameActionSchema>;
export type RunescapePluginConfig = z.infer<typeof RunescapePluginConfigSchema>;
