// src/plugins/RunescapeAgentPlugin.ts
import { Plugin } from "@elizaos/core";
import { WorldStateProvider } from "../providers/WorldStateProvider";
import { GameActionHandler } from "../actions/GameActionHandler";
import { GameStateEvaluator } from "../evaluators/GameStateEvaluator";

/**
 * A plugin that wires up:
 *  - A provider (WorldStateProvider),
 *  - An action (GameActionHandler),
 *  - An evaluator (GameStateEvaluator).
 *
 * According to Eliza plugin docs, we create an object implementing the Plugin interface.
 */
export const RunescapeAgentPlugin: Plugin = {
    name: "plugin-runelite",
    description: "RuneScape game interaction plugin for Eliza OS",

    // The plugin can register multiple arrays:
    actions: [GameActionHandler],
    providers: [new WorldStateProvider()],
    evaluators: [GameStateEvaluator],
    services: [],
};
