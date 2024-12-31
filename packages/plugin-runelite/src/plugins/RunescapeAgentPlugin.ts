import { Plugin } from "@elizaos/core";
import { WorldStateProvider } from "../providers/WorldStateProvider";
import { GameActionHandler } from "../actions/GameActionHandler";
import { GameStateEvaluator } from "../evaluators/GameStateEvaluator";
import { EmoteAction } from "../actions/EmoteAction";

/**
 * A plugin that wires up:
 *  - A provider (WorldStateProvider),
 *  - Some actions (GameActionHandler, EmoteAction),
 *  - An evaluator (GameStateEvaluator).
 */
export const RunescapeAgentPlugin: Plugin = {
    name: "plugin-runelite",
    description: "RuneScape game interaction plugin for Eliza OS",

    // Include BOTH your normal game actions AND the new EmoteAction
    actions: [GameActionHandler, EmoteAction],

    providers: [new WorldStateProvider()],
    evaluators: [GameStateEvaluator],
    services: [],
};
