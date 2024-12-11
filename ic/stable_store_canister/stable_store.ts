import { IDL, query, update, preUpgrade, postUpgrade } from 'azle';

interface Agent {
    config: Record<string, any>;
    status: string;
    messages: string[];
}

let agents: Record<string, Agent> = {};

export default class {
    @preUpgrade
    preUpgradeMethod(): void {
        (globalThis as any).__azle_stable_storage__ = agents;
    }

    @postUpgrade([])
    postUpgradeMethod(): void {
        agents = (globalThis as any).__azle_stable_storage__ ?? {};
    }

    @update([IDL.Text, IDL.Record({})], IDL.Null)
    setAgent(name: string, config: Record<string, any>): void {
        agents[name] = {
            config,
            status: 'running',
            messages: []
        };
    }

    @update([IDL.Text, IDL.Text], IDL.Null)
    sendMessage(name: string, message: string): void {
        const agent = agents[name];
        if (agent) {
            agent.messages.push(message);
        }
    }

    @query([IDL.Text], IDL.Opt(IDL.Record({
        config: IDL.Record({}),
        status: IDL.Text,
        messages: IDL.Vec(IDL.Text)
    })))
    getAgent(name: string) {
        const agent = agents[name];
        return agent ? [agent] : [];
    }

    @query([], IDL.Nat)
    getAgentCount(): bigint {
        return BigInt(Object.keys(agents).length);
    }
}
