// memoryAdapter.ts
import { IDatabaseAdapter, GoalStatus } from '../dist/core';
import type { UUID, Character, MessageContent } from './types';

interface Participant {
    id: UUID;
    account: Account;  // Note: Account is required, not nullable
}

interface Memory {
    id?: UUID;
    userId: UUID;
    agentId: UUID;
    content: MessageContent;
    roomId: UUID;
    createdAt?: number;
    embedding?: number[];
    unique?: boolean;
    similarity?: number;
}

interface Room {
    id: UUID;
    participants: UUID[];
    userStates: Record<UUID, "FOLLOWED" | "MUTED" | null>;
}

interface Account {
    id: UUID;
    name: string;
    username: string;
    details?: Record<string, any>;
    email?: string;
    avatarUrl?: string;
}

interface Goal {
    id: UUID;
    roomId: UUID;
    userId: UUID;
    status: GoalStatus;
    name: string;
    objectives: Array<{
        id?: string;
        description: string;
        completed: boolean;
    }>;
}

interface Relationship {
    id: UUID;
    userA: UUID;
    userB: UUID;
    userId: UUID;
    roomId: UUID;
    status: string;
    createdAt?: string;
}

interface Actor {
    name: string;
    username: string;
    details: {
        tagline: string;
        summary: string;
        quote: string;
    };
    id: UUID;
}

export class InMemoryDatabaseAdapter implements IDatabaseAdapter {
    db: any = {};
    private memories: Map<string, Memory[]> = new Map();
    private accounts: Map<UUID, Account> = new Map();
    private rooms: Map<UUID, Room> = new Map();
    private goals: Map<string, Goal[]> = new Map();
    private memoryById: Map<UUID, Memory> = new Map();
    private relationships: Map<string, Relationship> = new Map();

    constructor() {
        console.warn('Using in-memory database adapter - data will not persist between canister upgrades');
    }

    async init(): Promise<void> {
        return Promise.resolve();
    }

    async close(): Promise<void> {
        return Promise.resolve();
    }

    async getAccountById(userId: UUID): Promise<Account | null> {
        return this.accounts.get(userId) || null;
    }

    async createAccount(account: Account): Promise<boolean> {
        this.accounts.set(account.id, account);
        return true;
    }

    async getMemories({ roomId, count = 10, unique = false, tableName, agentId, start, end }: {
        roomId: UUID;
        count?: number;
        unique?: boolean;
        tableName: string;
        agentId: UUID;
        start?: number;
        end?: number;
    }): Promise<Memory[]> {
        const key = `${tableName}:${roomId}`;
        let memories = this.memories.get(key) || [];
        
        if (unique) {
            memories = memories.filter(m => m.unique);
        }
        
        if (start !== undefined && end !== undefined) {
            memories = memories.slice(start, end);
        } else {
            memories = memories.slice(0, count);
        }
        
        return memories;
    }

    async getMemoryById(id: UUID): Promise<Memory | null> {
        return this.memoryById.get(id) || null;
    }

    async getMemoriesByRoomIds(params: {
        tableName: string;
        agentId: UUID;
        roomIds: UUID[];
    }): Promise<Memory[]> {
        const allMemories: Memory[] = [];
        params.roomIds.forEach(roomId => {
            const key = `${params.tableName}:${roomId}`;
            const memories = this.memories.get(key) || [];
            allMemories.push(...memories);
        });
        return allMemories;
    }

    async getCachedEmbeddings(params: {
        query_table_name: string;
        query_threshold: number;
        query_input: string;
        query_field_name: string;
        query_field_sub_name: string;
        query_match_count: number;
    }): Promise<{ embedding: number[]; levenshtein_score: number; }[]> {
        return [];
    }

    async createMemory(memory: Memory, tableName: string, unique = false): Promise<void> {
        const key = `${tableName}:${memory.roomId}`;
        const memories = this.memories.get(key) || [];
        memory.unique = unique;
        memories.push(memory);
        this.memories.set(key, memories);
        if (memory.id) {
            this.memoryById.set(memory.id, memory);
        }
    }

    async searchMemories(params: {
        tableName: string;
        agentId: UUID;
        roomId: UUID;
        embedding: number[];
        match_threshold: number;
        match_count: number;
        unique: boolean;
    }): Promise<Memory[]> {
        const key = `${params.tableName}:${params.roomId}`;
        const memories = this.memories.get(key) || [];
        return memories.slice(0, params.match_count);
    }

    async searchMemoriesByEmbedding(embedding: number[], params: {
        match_threshold?: number;
        count?: number;
        roomId?: UUID;
        agentId?: UUID;
        unique?: boolean;
        tableName: string;
    }): Promise<Memory[]> {
        const key = `${params.tableName}:${params.roomId}`;
        const memories = this.memories.get(key) || [];
        return memories.slice(0, params.count || 10);
    }

    async removeMemory(memoryId: UUID, tableName: string): Promise<void> {
        this.memoryById.delete(memoryId);
        for (const [key, memories] of this.memories.entries()) {
            if (key.startsWith(tableName)) {
                const filtered = memories.filter(m => m.id !== memoryId);
                this.memories.set(key, filtered);
            }
        }
    }

    async removeAllMemories(roomId: UUID, tableName: string): Promise<void> {
        const key = `${tableName}:${roomId}`;
        this.memories.delete(key);
    }

    async countMemories(roomId: UUID, unique = false, tableName?: string): Promise<number> {
        let count = 0;
        for (const [key, memories] of this.memories.entries()) {
            if (key.includes(roomId) && (!tableName || key.startsWith(tableName))) {
                count += unique ? memories.filter(m => m.unique).length : memories.length;
            }
        }
        return count;
    }

    async getGoals(params: {
        agentId: UUID;
        roomId: UUID;
        userId?: UUID | null;
        onlyInProgress?: boolean;
        count?: number;
    }): Promise<Goal[]> {
        const key = `${params.roomId}:${params.agentId}`;
        let goals = this.goals.get(key) || [];
        if (params.onlyInProgress) {
            goals = goals.filter(g => g.status === GoalStatus.IN_PROGRESS);
        }
        if (params.userId) {
            goals = goals.filter(g => g.userId === params.userId);
        }
        return goals.slice(0, params.count);
    }

    async updateGoal(goal: Goal): Promise<void> {
        const key = `${goal.roomId}:${goal.id}`;
        let goals = this.goals.get(key) || [];
        goals = goals.map(g => g.id === goal.id ? goal : g);
        this.goals.set(key, goals);
    }

    async updateGoalStatus(params: { goalId: UUID; status: GoalStatus }): Promise<void> {
        const { goalId, status } = params;
        for (const [key, goals] of this.goals.entries()) {
            const updatedGoals = goals.map(g => 
                g.id === goalId ? { ...g, status } : g
            );
            this.goals.set(key, updatedGoals);
        }
    }

    async createGoal(goal: Goal): Promise<void> {
        const key = `${goal.roomId}:${goal.id}`;
        const goals = this.goals.get(key) || [];
        goals.push(goal);
        this.goals.set(key, goals);
    }

    async removeGoal(goalId: UUID): Promise<void> {
        for (const [key, goals] of this.goals.entries()) {
            const filtered = goals.filter(g => g.id !== goalId);
            this.goals.set(key, filtered);
        }
    }

    async removeAllGoals(roomId: UUID): Promise<void> {
        for (const key of this.goals.keys()) {
            if (key.startsWith(roomId)) {
                this.goals.delete(key);
            }
        }
    }

    async log(params: {
        body: { [key: string]: unknown };
        userId: UUID;
        roomId: UUID;
        type: string;
    }): Promise<void> {
        // In-memory logging - no-op for now
        return Promise.resolve();
    }

    async getActorDetails(params: { roomId: UUID }): Promise<Actor[]> {
        const room = this.rooms.get(params.roomId);
        if (!room) return [];

        const actors: Actor[] = [];
        for (const participantId of room.participants) {
            const account = await this.getAccountById(participantId);
            if (account) {
                actors.push({
                    id: account.id,
                    name: account.name,
                    username: account.username,
                    details: {
                        tagline: account.details?.tagline || '',
                        summary: account.details?.summary || '',
                        quote: account.details?.quote || ''
                    }
                });
            }
        }
        return actors;
    }

    async getRoom(roomId: UUID): Promise<UUID | null> {
        const room = this.rooms.get(roomId);
        return room ? room.id : null;
    }

    async createRoom(roomId?: UUID): Promise<UUID> {
        if (!roomId) {
            roomId = `${crypto.randomUUID()}` as UUID;
        }
        this.rooms.set(roomId, { 
            id: roomId, 
            participants: [],
            userStates: {}
        });
        return roomId;
    }

    async removeRoom(roomId: UUID): Promise<void> {
        this.rooms.delete(roomId);
    }

    async getRoomsForParticipant(userId: UUID): Promise<UUID[]> {
        const rooms: UUID[] = [];
        for (const [roomId, room] of this.rooms.entries()) {
            if (room.participants?.includes(userId)) {
                rooms.push(roomId);
            }
        }
        return rooms;
    }

    async getRoomsForParticipants(userIds: UUID[]): Promise<UUID[]> {
        const rooms: UUID[] = [];
        for (const [roomId, room] of this.rooms.entries()) {
            if (userIds.some(id => room.participants?.includes(id))) {
                rooms.push(roomId);
            }
        }
        return rooms;
    }

    async addParticipant(userId: UUID, roomId: UUID): Promise<boolean> {
        const room = this.rooms.get(roomId) || { 
            id: roomId, 
            participants: [],
            userStates: {}
        };
        if (!room.participants.includes(userId)) {
            room.participants.push(userId);
        }
        this.rooms.set(roomId, room);
        return true;
    }

    async removeParticipant(userId: UUID, roomId: UUID): Promise<boolean> {
        const room = this.rooms.get(roomId);
        if (room) {
            room.participants = room.participants.filter(id => id !== userId);
            this.rooms.set(roomId, room);
            return true;
        }
        return false;
    }

    async getParticipantsForAccount(userId: UUID): Promise<Participant[]> {
        const participants: Participant[] = [];
        for (const room of this.rooms.values()) {
            if (room.participants?.includes(userId)) {
                const account = await this.getAccountById(userId);
                if (account) {  // Only add if we have an account
                    participants.push({
                        id: userId,
                        account: account
                    });
                }
            }
        }
        return participants;
    }

    async getParticipantsForRoom(roomId: UUID): Promise<UUID[]> {
        const room = this.rooms.get(roomId);
        return room?.participants || [];
    }

    async getParticipantUserState(roomId: UUID, userId: UUID): Promise<"FOLLOWED" | "MUTED" | null> {
        const room = this.rooms.get(roomId);
        return room?.userStates?.[userId] || null;
    }

    async setParticipantUserState(roomId: UUID, userId: UUID, state: "FOLLOWED" | "MUTED" | null): Promise<void> {
        const room = this.rooms.get(roomId) || { 
            id: roomId, 
            participants: [],
            userStates: {}
        };
        room.userStates[userId] = state;
        this.rooms.set(roomId, room);
    }

    async createRelationship(params: { userA: UUID; userB: UUID }): Promise<boolean> {
        const key = `${params.userA}:${params.userB}`;
        const relationship: Relationship = {
            id: `${crypto.randomUUID()}` as UUID,
            userA: params.userA,
            userB: params.userB,
            userId: params.userA,
            roomId: `${crypto.randomUUID()}` as UUID,
            status: 'ACTIVE',
            createdAt: new Date().toISOString()
        };
        this.relationships.set(key, relationship);
        return true;
    }

    async getRelationship(params: { userA: UUID; userB: UUID }): Promise<Relationship | null> {
        const key = `${params.userA}:${params.userB}`;
        return this.relationships.get(key) || null;
    }

    async getRelationships(params: { userId: UUID }): Promise<Relationship[]> {
        const relationships: Relationship[] = [];
        for (const [key, relationship] of this.relationships.entries()) {
            if (key.includes(params.userId)) {
                relationships.push(relationship);
            }
        }
        return relationships;
    }
}