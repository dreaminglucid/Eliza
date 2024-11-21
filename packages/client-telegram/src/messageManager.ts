import { Message } from "@telegraf/types";
import { Context, Telegraf } from "telegraf";

import { composeContext } from "@ai16z/eliza";
import { embeddingZeroVector } from "@ai16z/eliza";
import {
    Content,
    HandlerCallback,
    IAgentRuntime,
    IImageDescriptionService,
    Memory,
    ModelClass,
    State,
    UUID,
} from "@ai16z/eliza";
import { stringToUuid } from "@ai16z/eliza";
import { generateMessageResponse, generateShouldRespond } from "@ai16z/eliza";
import { ImageDescriptionService } from "@ai16z/plugin-node";

import {
    MAX_MESSAGE_LENGTH,
    telegramMessageHandlerTemplate,
    telegramShouldRespondTemplate,
} from "./templates";

export class MessageManager {
    public bot: Telegraf<Context>;
    private runtime: IAgentRuntime;
    private imageService: IImageDescriptionService;

    constructor(bot: Telegraf<Context>, runtime: IAgentRuntime) {
        this.bot = bot;
        this.runtime = runtime;
        this.imageService = ImageDescriptionService.getInstance();
    }

    private async processImage(
        message: Message
    ): Promise<{ description: string } | null> {
        try {
            let imageUrl: string | null = null;

            if ("photo" in message && message.photo?.length > 0) {
                const photo = message.photo[message.photo.length - 1];
                const fileLink = await this.bot.telegram.getFileLink(
                    photo.file_id
                );
                imageUrl = fileLink.toString();
            }
            else if (
                "document" in message &&
                message.document?.mime_type?.startsWith("image/")
            ) {
                const doc = message.document;
                const fileLink = await this.bot.telegram.getFileLink(
                    doc.file_id
                );
                imageUrl = fileLink.toString();
            }

            if (imageUrl) {
                const { title, description } = await this.imageService
                    .getInstance()
                    .describeImage(imageUrl);
                const fullDescription = `[Image: ${title}\n${description}]`;
                return { description: fullDescription };
            }
        } catch (error) {
            console.error("❌ Error processing image:", error);
        }

        return null;
    }

    private async _shouldRespond(
        message: Message,
        state: State
    ): Promise<boolean> {
        if ("from" in message && message.from?.is_bot) {
            return false;
        }
    
        let shouldCheck = false;
        const isPrivateChat = message.chat.type === "private";
        const isGroupChat = ["group", "supergroup"].includes(message.chat.type);
        
        if (isGroupChat) {
            shouldCheck = !!(
                ("text" in message && 
                 message.text?.includes(`@${this.bot.botInfo?.username}`)) ||
                ("reply_to_message" in message && 
                 message.reply_to_message?.from?.id === this.bot.botInfo?.id)
            );
        } else if (isPrivateChat) {
            shouldCheck = !!(
                ("text" in message && message.text?.trim().length > 0) ||
                ("text" in message && message.text?.startsWith('/')) ||
                ("caption" in message && message.caption?.trim().length > 0)
            );
            
            if (shouldCheck && "text" in message) {
                const shortResponses = ["ok", "k", "thx", "thanks", "👍", "cool"];
                if (shortResponses.includes(message.text?.toLowerCase().trim())) {
                    shouldCheck = false;
                }
            }
        }
    
        if (shouldCheck) {
            const shouldRespondContext = composeContext({
                state,
                template:
                    this.runtime.character.templates?.telegramShouldRespondTemplate ||
                    this.runtime.character?.templates?.shouldRespondTemplate ||
                    telegramShouldRespondTemplate,
            });
    
            const response = await generateShouldRespond({
                runtime: this.runtime,
                context: shouldRespondContext,
                modelClass: ModelClass.SMALL,
            });
    
            return response === "RESPOND";
        }
    
        return false;
    }

    private async sendMessageInChunks(
        ctx: Context,
        content: string,
        replyToMessageId?: number
    ): Promise<Message.TextMessage[]> {
        const chunks = this.splitMessage(content);
        const sentMessages: Message.TextMessage[] = [];

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const sentMessage = (await ctx.telegram.sendMessage(
                ctx.chat.id,
                chunk,
                {
                    reply_parameters:
                        i === 0 && replyToMessageId
                            ? { message_id: replyToMessageId }
                            : undefined,
                }
            )) as Message.TextMessage;

            sentMessages.push(sentMessage);
        }

        return sentMessages;
    }

    private splitMessage(text: string): string[] {
        const chunks: string[] = [];
        let currentChunk = "";

        const lines = text.split("\n");
        for (const line of lines) {
            if (currentChunk.length + line.length + 1 <= MAX_MESSAGE_LENGTH) {
                currentChunk += (currentChunk ? "\n" : "") + line;
            } else {
                if (currentChunk) chunks.push(currentChunk);
                currentChunk = line;
            }
        }

        if (currentChunk) chunks.push(currentChunk);
        return chunks;
    }

    private async _generateResponse(
        message: Memory,
        state: State,
        context: string
    ): Promise<Content> {
        const { userId, roomId } = message;

        const response = await generateMessageResponse({
            runtime: this.runtime,
            context,
            modelClass: ModelClass.SMALL,
        });

        if (!response) {
            console.error("❌ No response from generateMessageResponse");
            return null;
        }
        await this.runtime.databaseAdapter.log({
            body: { message, context, response },
            userId: userId,
            roomId,
            type: "response",
        });

        return response;
    }

    public async handleMessage(ctx: Context): Promise<void> {
        if (!ctx.message || !ctx.from) {
            return;
        }

        if (
            this.runtime.character.clientConfig?.telegram
                ?.shouldIgnoreBotMessages &&
            ctx.from.is_bot
        ) {
            return;
        }
        if (
            this.runtime.character.clientConfig?.telegram
                ?.shouldIgnoreDirectMessages &&
            ctx.chat?.type === "private"
        ) {
            return;
        }

        const message = ctx.message;

        try {
            const userId = stringToUuid(ctx.from.id.toString()) as UUID;
            const userName =
                ctx.from.username || ctx.from.first_name || "Unknown User";
            const chatId = stringToUuid(
                ctx.chat?.id.toString() + "-" + this.runtime.agentId
            ) as UUID;
            const agentId = this.runtime.agentId;
            const roomId = chatId;

            await this.runtime.ensureConnection(
                userId,
                roomId,
                userName,
                userName,
                "telegram"
            );

            const messageId = stringToUuid(
                message.message_id.toString() + "-" + this.runtime.agentId
            ) as UUID;

            const imageInfo = await this.processImage(message);

            let messageText = "";
            if ("text" in message) {
                messageText = message.text;
            } else if ("caption" in message && message.caption) {
                messageText = message.caption;
            }

            const fullText = imageInfo
                ? `${messageText} ${imageInfo.description}`
                : messageText;

            if (!fullText) {
                return;
            }

            const content: Content = {
                text: fullText,
                source: "telegram",
            };

            const memory: Memory = {
                id: messageId,
                agentId,
                userId,
                roomId,
                content,
                createdAt: message.date * 1000,
                embedding: embeddingZeroVector,
            };

            await this.runtime.messageManager.createMemory(memory);

            let state = await this.runtime.composeState(memory);
            state = await this.runtime.updateRecentMessageState(state);

            const shouldRespond = await this._shouldRespond(message, state);

            if (shouldRespond) {
                const context = composeContext({
                    state,
                    template:
                        this.runtime.character.templates
                            ?.telegramMessageHandlerTemplate ||
                        this.runtime.character?.templates
                            ?.messageHandlerTemplate ||
                        telegramMessageHandlerTemplate,
                });

                const responseContent = await this._generateResponse(
                    memory,
                    state,
                    context
                );

                if (!responseContent || !responseContent.text) return;

                const callback: HandlerCallback = async (content: Content) => {
                    const sentMessages = await this.sendMessageInChunks(
                        ctx,
                        content.text,
                        message.message_id
                    );

                    const memories: Memory[] = [];

                    for (let i = 0; i < sentMessages.length; i++) {
                        const sentMessage = sentMessages[i];
                        const isLastMessage = i === sentMessages.length - 1;

                        const memory: Memory = {
                            id: stringToUuid(
                                sentMessage.message_id.toString() +
                                    "-" +
                                    this.runtime.agentId
                            ),
                            agentId,
                            userId,
                            roomId,
                            content: {
                                ...content,
                                text: sentMessage.text,
                                inReplyTo: messageId,
                            },
                            createdAt: sentMessage.date * 1000,
                            embedding: embeddingZeroVector,
                        };

                        memory.content.action = !isLastMessage
                            ? "CONTINUE"
                            : content.action;

                        await this.runtime.messageManager.createMemory(memory);
                        memories.push(memory);
                    }

                    return memories;
                };

                const responseMessages = await callback(responseContent);

                state = await this.runtime.updateRecentMessageState(state);

                await this.runtime.processActions(
                    memory,
                    responseMessages,
                    state,
                    callback
                );
            }

            await this.runtime.evaluate(memory, state, shouldRespond);
        } catch (error) {
            console.error("❌ Error handling message:", error);
        }
    }
}