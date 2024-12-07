// ic/src/types.ts

import { z } from 'zod';
import { ModelProviderName, Clients } from './dist/core'; // Adjust the path as needed

// Define a Zod native enum schema based on ModelProviderName
const ModelProviderSchema = z.nativeEnum(ModelProviderName);

// Define a Zod native enum schema based on Clients
const ClientsSchema = z.nativeEnum(Clients);

// Define the UUID type as a template literal type
type UUID = `${string}-${string}-${string}-${string}-${string}`;

// Define the UUID regex pattern
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Define the MessageContent interface with index signature
export interface MessageContent {
    text: string;
    action?: string;
    source?: string;
    url?: string;
    inReplyTo?: UUID;
    attachments?: any[];
    [key: string]: any; // Add index signature to allow any string key
}

// Define the MessageExample interface
export interface MessageExample {
    user: string;
    content: MessageContent;
}

// Define the MessageContent schema with index signature support
const MessageContentSchema = z.object({
    text: z.string(),
    action: z.string().optional(),
    source: z.string().optional(),
    url: z.string().optional(),
    inReplyTo: z.string().regex(uuidRegex).optional().transform((val): UUID | undefined => val as UUID | undefined),
    attachments: z.array(z.any()).optional()
}).passthrough(); // Allow additional properties

// Define the MessageExample schema
const MessageExampleSchema = z.object({
    user: z.string(),
    content: MessageContentSchema
}) as z.ZodType<MessageExample>;

// Define the Character schema
export const CharacterSchema = z.object({
    name: z.string(),
    clients: z.array(ClientsSchema),
    modelProvider: ModelProviderSchema,
    settings: z.object({
        secrets: z.record(z.string()),
        voice: z.object({
            model: z.string()
        })
    }),
    people: z.array(z.any()),
    plugins: z.array(z.object({
        name: z.string(),
        description: z.string()
    })),
    system: z.string(),
    bio: z.array(z.string()),
    lore: z.array(z.string()),
    knowledge: z.array(z.string()),
    messageExamples: z.array(z.array(MessageExampleSchema)),
    postExamples: z.array(z.string()),
    topics: z.array(z.string()),
    style: z.object({
        all: z.array(z.string()),
        chat: z.array(z.string()),
        post: z.array(z.string())
    }),
    adjectives: z.array(z.string())
});

// Export the Character type
export type Character = z.infer<typeof CharacterSchema>;