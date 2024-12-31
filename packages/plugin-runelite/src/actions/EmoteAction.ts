// src/actions/EmoteAction.ts

import {
    Action,
    IAgentRuntime,
    Memory,
    State,
    HandlerCallback,
    elizaLogger,
} from "@elizaos/core";

/**
 * A custom "EMOTE" action in Eliza OS.
 *
 * According to docs:
 * - name: Unique action name
 * - similes: synonyms or alternative triggers
 * - description: Explains when/how to use
 * - validate: checks if the action is appropriate
 * - handler: performs the action
 * - examples: usage patterns that the LLM sees
 */
export const EmoteAction: Action = {
    name: "EMOTE",
    similes: ["DO_EMOTE", "PERFORM_EMOTE"], // synonyms
    description:
        "Perform an in-game emote in OSRS. Accepts { emote: string } in params.",

    // 1) Validation logic. We can check if `params.emote` is a string or recognized.
    validate: async (_runtime: IAgentRuntime, message: Memory) => {
        // If we wanted to do real checks, we could do:
        // const content = message.content as { params?: { emote?: string }};
        // return content.params?.emote !== undefined;
        return true;
    },

    // 2) The main logic. For now, we just log that we want to do "wave/dance" etc.
    //    If hooking to RuneLite, you'd likely just produce text that RuneLite sees,
    //    or you might call a bridging function. But the official doc approach is just
    //    "Implement what you'd do if the LLM chooses 'EMOTE'."
    handler: async (
        _runtime: IAgentRuntime,
        _message: Memory,
        _state: State,
        _options: unknown,
        callback: HandlerCallback
    ) => {
        try {
            // Suppose the LLM sent { "action": "EMOTE", "params": { "emote": "wave" } }
            const content = _message.content as {
                params?: { emote?: string };
            };
            const chosenEmote = content.params?.emote ?? "wave";

            elizaLogger.log(
                `EmoteAction => The LLM wants to do an emote: ${chosenEmote}`
            );

            // Return a text saying we "did the emote"
            callback(
                {
                    text: `Performing ${chosenEmote} emote!`,
                    action: "EMOTE",
                },
                []
            );
        } catch (error) {
            elizaLogger.error("Error in EmoteAction:", error);
            callback(
                {
                    text: `Failed to do emote. Error: ${
                        error instanceof Error ? error.message : String(error)
                    }`,
                },
                []
            );
        }
    },

    // 3) Provide usage examples so the LLM sees how to produce this action
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Can you do a dance emote please?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Sure, I'm dancing now!",
                    action: "EMOTE",
                    params: {
                        emote: "dance",
                    },
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Haha, wave at everyone with me!",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Performing wave emote!",
                    action: "EMOTE",
                    params: {
                        emote: "wave",
                    },
                },
            },
        ],
    ],
};
