// src/actions/GameActionHandler.ts
import {
    Action,
    IAgentRuntime,
    Memory,
    State,
    HandlerCallback,
    elizaLogger,
} from "@elizaos/core";
import { GameAction, GameActionSchema } from "../types";

/**
 * GameActionHandler with no external endpoint calls.
 * It simply interprets the action from the AI and simulates / logs.
 */
export const GameActionHandler: Action = {
    name: "GAME_ACTION",
    description:
        "Execute a game action in RuneScape (move, interact, chat, etc.)—no new endpoints",
    similes: [],
    examples: [],

    // Validate that the message content matches our GameAction schema
    validate: async (_runtime: IAgentRuntime, message: Memory) => {
        return GameActionSchema.safeParse(message.content).success;
    },

    handler: async (
        _runtime: IAgentRuntime,
        message: Memory,
        _state: State,
        _options: unknown,
        callback: HandlerCallback
    ) => {
        try {
            // The AI's message content is shaped like { type: <ActionType>, params: {...} }
            const action = message.content as GameAction;

            elizaLogger.log("Received RuneScape action from AI:", action);

            // Instead of calling an HTTP endpoint, we can simulate or log the action.
            // For example, if the AI says "MOVE_TO" => do your local logic, or just log it:
            switch (action.type) {
                case "MOVE_TO":
                    elizaLogger.log(
                        `Simulating "MOVE_TO" => ${JSON.stringify(action.params)}`
                    );
                    break;
                case "CHAT_MESSAGE":
                    elizaLogger.log(
                        `Simulating "CHAT_MESSAGE" => ${JSON.stringify(action.params)}`
                    );
                    break;
                // ... handle other types similarly ...
                default:
                    elizaLogger.log(
                        `Unknown or unhandled action type: ${action.type}`
                    );
                    break;
            }

            // Return a success callback to the AI
            callback(
                {
                    text: `Simulated action: ${action.type}\nParams: ${JSON.stringify(action.params)}`,
                    action: JSON.stringify(action),
                },
                []
            );
        } catch (error) {
            elizaLogger.error("Error executing game action:", error);
            callback(
                {
                    text: `Failed to execute action. Error: ${
                        error instanceof Error ? error.message : String(error)
                    }`,
                    error: error,
                },
                []
            );
        }
    },
};
