// src/index.ts
import { RunescapeAgentPlugin } from "./plugins/RunescapeAgentPlugin";

// Re-export items if needed
export * from "./types";
export * from "./providers/WorldStateProvider";
export * from "./actions/GameActionHandler";
export * from "./evaluators/GameStateEvaluator";

// Default export: the main plugin
export default RunescapeAgentPlugin;
