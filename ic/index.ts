// ic/src/index.ts

import dotenv from 'dotenv';
dotenv.config();

import { Server, serialize } from 'azle/experimental';
import express, { Request, Response } from 'express';
import { createServer } from 'http';
import beffCharacter from './characters/beff.json';
import { Character, CharacterSchema } from './types'; // Import Character and schema
import { DirectClient } from './dist/client-direct';
import { 
    AgentRuntime, 
    CacheManager, 
    MemoryCacheAdapter, 
    ModelProviderName, 
    generateText, 
    Memory, 
    State 
} from './dist/core'; // Import concrete PostgresDatabaseAdapter and other types

// Replace with actual deployed stable_store canister ID
const STABLE_STORE_CANISTER_ID = process.env.STABLE_STORE_CANISTER_ID || "bkyz2-fmaaa-aaaaa-qaaaq-cai";

// Mapping from client/plugin names to their classes or factory functions
const CLIENT_MAP: Record<string, any> = {
    "client-direct": DirectClient,
};

const PLUGIN_MAP: Record<string, any> = {
};

// Initialize required components
const cacheManager = new CacheManager(new MemoryCacheAdapter());

// AgentRuntime instances mapped by character name
const RUNTIMES: Record<string, AgentRuntime> = {};

// Initialize characters inside an async function
async function initCharacters() {
    const parseResult = CharacterSchema.safeParse(beffCharacter);

    if (!parseResult.success) {
        console.error("Invalid character data:", parseResult.error.format());
        throw new Error("Character data validation failed.");
    }

    const characterData: Character = parseResult.data;

    // Instantiate AgentRuntime with all required parameters
    const runtime = new AgentRuntime({
        conversationLength: 100, // Example value; adjust as needed
        agentId: "123e4567-e89b-12d3-a456-426614174000", // Replace with actual UUID
        character: characterData,
        token: process.env.AGENT_TOKEN || "default-token", // Use environment variables for security
        serverUrl: process.env.SERVER_URL || "http://localhost:3000", // Use environment variables
        actions: [], // Populate as needed
        evaluators: [], // Populate as needed
        plugins: [], // Populate with actual plugin instances
        providers: [], // Populate as needed
        modelProvider: characterData.modelProvider as ModelProviderName, // Enum value from parsed data
        services: [], // Populate as needed
        managers: [], // Populate as needed
        databaseAdapter: databaseAdapter, // Use the concrete PostgresDatabaseAdapter
        fetch: fetch, // Or your custom fetch implementation
        speechModelPath: process.env.SPEECH_MODEL_PATH || "path/to/speech-model", // Use environment variables
        cacheManager: cacheManager,
        logging: true // Set to false in production if needed
    });

    // Initialize the database connection
    await databaseAdapter.init();

    // Initialize the runtime
    await runtime.initialize();

    // Use the character's name as the key
    RUNTIMES[characterData.name] = runtime;
}

// Cross-canister calls using fetch
async function setAgent(name: string, config: Record<string, any>): Promise<void> {
    const response = await fetch(`icp://${STABLE_STORE_CANISTER_ID}/setAgent`, {
        body: serialize({
            candidPath: '/stable_store.did',
            args: [name, config]
        })
    });
    if (!response.ok) {
        throw new Error(`Failed to setAgent: ${name}`);
    }
    // No return value to process
}

async function sendMessage(name: string, message: string): Promise<void> {
    const response = await fetch(`icp://${STABLE_STORE_CANISTER_ID}/sendMessage`, {
        body: serialize({
            candidPath: '/stable_store.did',
            args: [name, message]
        })
    });
    if (!response.ok) {
        throw new Error(`Failed to sendMessage to: ${name}`);
    }
    // No return value to process
}

type AgentData = { config: Record<string, any>; status: string; messages: string[] };

async function getAgent(name: string): Promise<AgentData[]> {
    const response = await fetch(`icp://${STABLE_STORE_CANISTER_ID}/getAgent`, {
        body: serialize({
            candidPath: '/stable_store.did',
            args: [name]
        })
    });
    if (!response.ok) {
        throw new Error(`Failed to getAgent: ${name}`);
    }
    const data = await response.json();
    return data as AgentData[];
}

async function getAgentCount(): Promise<bigint> {
    const response = await fetch(`icp://${STABLE_STORE_CANISTER_ID}/getAgentCount`, {
        body: serialize({
            candidPath: '/stable_store.did',
            args: []
        })
    });
    if (!response.ok) {
        throw new Error(`Failed to getAgentCount`);
    }
    const data = await response.json();
    return data as bigint;
}

// Example HTTPS outcall (if enabled), remove if not needed
async function fetchExternalData() {
    const response = await fetch('https://httpbin.org/headers', {
        headers: {
            'X-Example-Header': 'value'
        }
    });
    if (!response.ok) {
        throw new Error('Failed to fetch external data');
    }
    return await response.json();
}

function createApp() {
    const app = express();
    app.use(express.json());

    app.get("/", async (_req: Request, res: Response) => {
        try {
            const count = await getAgentCount();
            res.send(`We have ${count} agents in stable storage.`);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post("/agents/:name", async (req: Request, res: Response) => {
        const { name } = req.params;
        const config = req.body.config ?? {};
        try {
            await setAgent(name, config);
            res.json({ status: "created_or_updated", name });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    app.get("/agents/:name/status", async (req: Request, res: Response) => {
        const { name } = req.params;
        try {
            const agentData = await getAgent(name);
            if (agentData.length === 0) {
                res.status(404).json({ error: "Agent not found" });
                return;
            }
            res.json(agentData[0]);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post("/agents/:name/message", async (req: Request, res: Response) => {
        const { name } = req.params;
        const messageText = req.body.message || "";
        const runtime = RUNTIMES[name];
        if (!runtime) {
            res.status(404).json({ error: "Character not found" });
            return;
        }
        try {
            // Retrieve userId and roomId dynamically if possible
            const userId = req.body.userId || 'default-user-id'; // Replace with actual retrieval logic
            const roomId = req.body.roomId || 'default-room-id'; // Replace with actual retrieval logic

            // 1. Create a Memory object for the incoming message
            const userMessage: Memory = {
                userId: userId, // Dynamically retrieved
                agentId: runtime.agentId,
                content: {
                    text: messageText,
                    source: 'user'
                },
                roomId: roomId // Dynamically retrieved
            };

            // 2. Compose the state based on the message
            const state: State = await runtime.composeState(userMessage);

            // 3. Evaluate the message using registered evaluators
            const evaluationResults: string[] = await runtime.evaluate(userMessage, state, true);

            // 4. Generate a response using the generateText function
            const responseText = await generateText({
                runtime,
                context: `State: ${JSON.stringify(state)}\nEvaluations: ${evaluationResults.join(", ")}`,
                modelClass: 'large' // Adjust based on available model classes
            });

            // 5. Optionally, update recent messages
            const updatedState = await runtime.updateRecentMessageState(state);

            // 6. Send the generated response back to the client
            res.json({ reply: responseText });
        } catch (error: any) {
            console.error("Error processing message:", error);
            res.status(500).json({ error: error.message });
        }
    });

    // Example endpoint using HTTPS outcall
    app.get("/external", async (_req: Request, res: Response) => {
        try {
            const externalData = await fetchExternalData();
            res.json({ externalData });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    return app;
}

export default Server(async () => {
    // Initialize characters inside the async Server callback
    try {
        await initCharacters();
    } catch (error: any) {
        // Handle initialization error
        console.error("Failed to initialize characters:", error);
        // Optionally, halt server startup by throwing the error
        throw error;
    }

    const app = createApp();
    const server = createServer(app);
    server.listen();
    console.log("Server is running and listening for requests.");
    return server;
});
