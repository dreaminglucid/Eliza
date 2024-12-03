import express, { Request, Response } from "express";

let agents: { [key: string]: Agent } = {};
let globalState: Record<string, any> = {};

interface Agent {
    config: any;
    status: string;
    messages: string[];
    start: () => Promise<void>;
    stop: () => Promise<void>;
    sendMessage: (message: string) => Promise<string>;
    getStatus: () => Promise<any>;
}

const app = express();
app.use(express.json());

app.get("/status", (req, res) => {
    res.json({
        agentCount: Object.keys(agents).length,
        agents: Object.keys(agents),
    });
});

app.get("/agents/:name/status", async (req: Request, res: Response) => {
    const { name } = req.params;
    const agent = agents[name];
    if (!agent) {
        res.status(404).json({ error: "Agent not found" });
        return;
    }
    const status = await agent.getStatus();
    res.json(status);
});
app.post("/agents/:name", (req, res) => {
    const { name } = req.params;
    agents[name] = {
        config: req.body,
        status: "running",
        messages: [],
        start: async () => {
            agents[name].status = "running";
        },
        stop: async () => {
            agents[name].status = "stopped";
        },
        sendMessage: async (message) => {
            agents[name].messages.push(message);
            return message;
        },
        getStatus: async () => ({ status: agents[name].status }),
    };
    res.json({ status: "created", name });
});

app.post("/agents/:name/message", async (req: Request, res: Response) => {
    const { name } = req.params;
    const agent = agents[name];
    if (!agent) {
        res.status(404).json({ error: "Agent not found" });
        return;
    }

    const message = req.body.message;
    const response = await agent.sendMessage(message);
    res.json({ response });
});

app.listen();
