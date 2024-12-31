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
 * A simple game action handler that does not include an EMOTE case.
 * The AI is free to produce "chat" or "move" actions, etc.
 * Meanwhile, the RuneLite side will detect emote keywords in the final text.
 */
export const GameActionHandler: Action = {
    name: "GAME_ACTION",
    description:
        "Execute a game action in RuneScape (move, interact, chat, etc.)",
    similes: ["RUNESCAPE_ACTION", "RS_GAME_ACTION"],
    examples: [
        // Example: Chat usage
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Say hello to the world",
                    action: "GAME_ACTION",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "CHAT_MESSAGE => 'Hello world!'",
                    action: "GAME_ACTION",
                },
            },
        ],
    ],

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
            // The AI's JSON => e.g. { "type": "CHAT_MESSAGE", "params": { "message": "Hello" } }
            const action = message.content as GameAction;

            elizaLogger.log("Received RuneScape action from AI:", action);

            switch (action.type) {
                case "MOVE_TO":
                    elizaLogger.log(
                        `Simulating a MOVE_TO => ${JSON.stringify(action.params)}`
                    );
                    // If you had a real endpoint for movement, you'd call it here
                    callback(
                        {
                            text: `Moved to location: ${JSON.stringify(
                                action.params
                            )}`,
                            action: JSON.stringify(action),
                        },
                        []
                    );
                    return;

                case "CHAT_MESSAGE":
                    elizaLogger.log(
                        `Simulating a CHAT_MESSAGE => ${JSON.stringify(action.params)}`
                    );
                    // Possibly call your existing chat logic or do nothing
                    callback(
                        {
                            text: `Chat: ${action.params.message}`,
                            action: JSON.stringify(action),
                        },
                        []
                    );
                    return;

                // We omit EMOTE because we rely on the Java side to detect from text

                default:
                    elizaLogger.log(
                        `Unhandled action type: ${action.type} => ignoring`
                    );
                    callback(
                        { text: "No recognized action performed", action: "" },
                        []
                    );
                    return;
            }
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
