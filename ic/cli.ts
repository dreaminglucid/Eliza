#!/usr/bin/env node
import { Actor, HttpAgent } from "@dfinity/agent";
import { IDL } from "@dfinity/candid";
import { Principal } from "@dfinity/principal";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

// Interface for your agent canister
const agentInterface = ({ IDL }) => {
    return IDL.Service({
        start_agent: IDL.Func(
            [IDL.Text],
            [IDL.Variant({ Ok: IDL.Text, Err: IDL.Text })],
            []
        ),
        send_message: IDL.Func(
            [IDL.Text, IDL.Text],
            [IDL.Variant({ Ok: IDL.Text, Err: IDL.Text })],
            []
        ),
        list_agents: IDL.Func([], [IDL.Vec(IDL.Text)], ["query"]),
        get_status: IDL.Func(
            [],
            [
                IDL.Record({
                    agentCount: IDL.Nat64,
                    agents: IDL.Vec(IDL.Text),
                    state: IDL.Record({}),
                    memoryUsage: IDL.Nat64,
                }),
            ],
            ["query"]
        ),
        get_state: IDL.Func([], [IDL.Record({})], ["query"]),
        delete_agent: IDL.Func(
            [IDL.Text],
            [IDL.Variant({ Ok: IDL.Text, Err: IDL.Text })],
            []
        ),
    });
};

const CANISTER_ID = process.env.CANISTER_ID || "";
const agent = await HttpAgent.create({
    host:
        process.env.DFX_NETWORK === "local"
            ? "http://localhost:8000"
            : "https://ic0.app",
});

const actor = Actor.createActor(agentInterface, {
    agent,
    canisterId: CANISTER_ID,
});

yargs(hideBin(process.argv))
    .option("network", {
        alias: "n",
        type: "string",
        description: "Network to connect to (local/ic)",
        default: "ic",
    })
    .command(
        "start <name>",
        "Start an agent",
        (yargs) => {
            return yargs
                .positional("name", {
                    describe: "Name of the agent",
                    type: "string",
                })
                .option("config", {
                    alias: "c",
                    type: "string",
                    description: "Agent configuration JSON",
                    default: "{}",
                });
        },
        async (argv) => {
            try {
                const config = JSON.parse(argv.config);
                await actor.start_agent(argv.name);
                console.log(`Agent ${argv.name} started successfully`);
            } catch (error) {
                console.error("Error:", error);
            }
        }
    )
    .command(
        "send <agent> <message>",
        "Send message to agent",
        (yargs) => {
            return yargs
                .positional("agent", {
                    describe: "Agent name",
                    type: "string",
                })
                .positional("message", {
                    describe: "Message to send",
                    type: "string",
                });
        },
        async (argv) => {
            try {
                const response = await actor.send_message(
                    argv.agent,
                    argv.message
                );
                console.log("Response:", response);
            } catch (error) {
                console.error("Error:", error);
            }
        }
    )
    .command("list", "List all agents", {}, async () => {
        try {
            const agents = await actor.list_agents();
            console.log("Running agents:", agents);
        } catch (error) {
            console.error("Error:", error);
        }
    })
    .command("status", "Get system status", {}, async () => {
        try {
            const status = await actor.get_status();
            console.log("System status:", status);
        } catch (error) {
            console.error("Error:", error);
        }
    })
    .command("state", "Get global state", {}, async () => {
        try {
            const state = await actor.get_state();
            console.log("Global state:", state);
        } catch (error) {
            console.error("Error:", error);
        }
    })
    .command(
        "stop <name>",
        "Stop an agent",
        (yargs) => {
            return yargs.positional("name", {
                describe: "Agent name",
                type: "string",
            });
        },
        async (argv) => {
            try {
                await actor.delete_agent(argv.name);
                console.log(`Agent ${argv.name} stopped successfully`);
            } catch (error) {
                console.error("Error:", error);
            }
        }
    )
    .demandCommand(1)
    .help().argv;
