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
 *  - Possibly: should we do an emote?
 */
export const GameStateEvaluator: Evaluator = {
    name: "gameStateEvaluator",
    description: "Evaluates the current game state (players, chat, objects).",
    alwaysRun: true,
    similes: [],
    examples: [],

    handler: async (runtime: IAgentRuntime, memory: Memory, state: State) => {
        try {
            // The system automatically sets state.worldState from our provider
            const worldState = state.worldState as {
                nearbyPlayers: unknown[];
                chatHistory: { timestamp: number }[];
                nearbyObjects?: unknown[];
            };

            if (!worldState) {
                return {
                    score: 0,
                    reason: "No world state available",
                    shouldEmote: false,
                };
            }

            let score = 0;
            const reasons: string[] = [];

            // #1: If players are nearby
            const playerCount = worldState.nearbyPlayers.length;
            if (playerCount > 0) {
                score += 0.3;
                reasons.push("players nearby");
            }

            // #2: Check for recent chat activity in the last 30 seconds
            const now = Date.now();
            const thirtySecAgo = now - 30_000;
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

            // Summarize “interest”
            const finalScore = Math.min(1, score);
            const reasonSummary = reasons.length
                ? reasons.join(", ")
                : "no interesting features";

            // Possibly decide to emote if we see multiple players or if there's chat
            let shouldEmote = false;
            if (playerCount > 2 || recentMessages.length > 1) {
                shouldEmote = true;
            }

            return {
                score: finalScore, // 0..1 scale of how interesting the state is
                reason: reasonSummary, // textual explanation
                shouldEmote, // might help the AI decide to produce an emote word
            };
        } catch (error) {
            elizaLogger.error("Error in gameStateEvaluator:", error);
            return {
                score: 0,
                reason: `Evaluation failed: ${String(error)}`,
                shouldEmote: false,
            };
        }
    },

    validate: async () => true,
};
