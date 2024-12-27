import {
    Provider,
    IAgentRuntime,
    Memory,
    State,
    elizaLogger,
} from "@elizaos/core";
import { WorldState } from "../types";

/**
 * WorldStateProvider fetches state from RuneLite plugin endpoint
 */
export class WorldStateProvider implements Provider {
    private lastState: WorldState | null = null;
    private lastFetchTime = 0;
    private updateInterval = 1000; // 1 second caching
    private endpointUrl =
        "https://f2e6-67-252-4-136.ngrok-free.app/world-state"; // RuneLite plugin endpoint

    async get(
        _runtime: IAgentRuntime,
        message: Memory,
        _state: State
    ): Promise<WorldState> {
        const now = Date.now();

        // Only fetch if cache is stale
        if (!this.lastState || now - this.lastFetchTime > this.updateInterval) {
            try {
                elizaLogger.log(
                    "WorldStateProvider => Fetching fresh state from RuneLite..."
                );

                const response = await fetch(this.endpointUrl);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                this.lastState = this.transformState(data, message);
                this.lastFetchTime = now;

                elizaLogger.log(
                    "WorldStateProvider => Fetched new state:",
                    this.lastState
                );
            } catch (error) {
                elizaLogger.warn(
                    "WorldStateProvider => Error fetching state:",
                    error
                );
                // Fallback to message-based state if fetch fails
                this.lastState = this.fallbackState(message);
            }
        }

        return this.lastState;
    }

    private transformState(data: any, message: Memory): WorldState {
        // Transform the RuneLite plugin state into our WorldState format
        return {
            currentPlayer: {
                name:
                    data.currentPlayer?.name ||
                    message.content?.userName ||
                    "Unknown",
                location: {
                    x: data.currentPlayer?.location?.x || 0,
                    y: data.currentPlayer?.location?.y || 0,
                    plane: data.currentPlayer?.location?.plane || 0,
                    regionId: data.currentPlayer?.location?.regionId || 0,
                    description:
                        data.currentPlayer?.location?.description ||
                        "Unknown location",
                },
                equipment: {
                    slots: data.currentPlayer?.equipment?.slots || {},
                    description:
                        data.currentPlayer?.equipment?.description ||
                        "No equipment",
                },
                stats: data.currentPlayer?.stats || {},
                inventory: data.currentPlayer?.inventory || [],
            },
            nearbyPlayers: data.currentPlayer?.location?.nearbyPlayers || [],
            nearbyObjects: [], // Not implemented yet in plugin
            chatHistory: [], // Handled separately by message system
            timestamp: Date.now(),
        };
    }
    private fallbackState(message: Memory): WorldState {
        elizaLogger.log(
            "WorldStateProvider => Using fallback state from message"
        );

        const content: any = message?.content || {};

        return {
            currentPlayer: {
                name: content.userName || "Unknown",
                location: {
                    x: content.location?.x || 0,
                    y: content.location?.y || 0,
                    plane: content.location?.plane || 0,
                    regionId: content.location?.regionId || 0,
                    description: content.location?.description || "No data",
                },
                equipment: {
                    slots: content.equipment?.slots || {},
                    description:
                        content.equipment?.description || "No equipment data",
                },
                stats: {},
                inventory: [],
            },
            nearbyPlayers: content.location?.nearbyPlayers || [],
            nearbyObjects: [],
            chatHistory: [],
            timestamp: Date.now(),
        };
    }
}
