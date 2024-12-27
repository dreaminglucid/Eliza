// src/evaluators/GameStateEvaluator.ts
import {
    Evaluator,
    IAgentRuntime,
    Memory,
    State,
    elizaLogger,
} from "@elizaos/core";

/**
 * Evaluates how “interesting” the game state is: e.g.
 *  - Are there players nearby?
 *  - Is there recent chat?
 *  - Are there interesting objects?
 *  This might affect how the LLM decides to respond.
 */
export const GameStateEvaluator: Evaluator = {
    name: "gameStateEvaluator",
    description: "Evaluates the current game state (players, chat, objects).",
    alwaysRun: true,
    similes: [],
    examples: [],

    handler: async (runtime: IAgentRuntime, memory: Memory, state: State) => {
        try {
            // The system automatically sets state.worldState from the provider
            const worldState = state.worldState as {
                nearbyPlayers: unknown[];
                chatHistory: { timestamp: number }[];
                nearbyObjects?: unknown[];
            };

            if (!worldState) {
                return {
                    score: 0,
                    reason: "No world state available",
                };
            }

            let score = 0;
            const reasons: string[] = [];

            // #1: If players are nearby
            if (worldState.nearbyPlayers.length > 0) {
                score += 0.3;
                reasons.push("players nearby");
            }

            // #2: Check for recent chat activity in the last 30 seconds
            const thirtySecAgo = Date.now() - 30_000;
            const recentMessages = worldState.chatHistory.filter(
                (msg) => msg.timestamp >= thirtySecAgo
            );
            if (recentMessages.length > 0) {
                score += 0.4;
                reasons.push("recent chat activity");
            }

            // #3: Check for interesting objects
            if (
                worldState.nearbyObjects &&
                worldState.nearbyObjects.length > 0
            ) {
                score += 0.3;
                reasons.push("objects nearby");
            }

            return {
                score: Math.min(1, score),
                reason: reasons.join(", ") || "no interesting features",
            };
        } catch (error) {
            elizaLogger.error("Error in gameStateEvaluator:", error);
            return {
                score: 0,
                reason: `Evaluation failed: ${String(error)}`,
            };
        }
    },

    validate: async () => true,
};
