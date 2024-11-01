import {
  Message,
  CommonMessageBundle,
  Message as TelegramMessage,
} from "@telegraf/types";
import { Context } from "telegraf";
import { Telegraf } from "telegraf";
import fs from "fs";

import { composeContext } from "../../../core/context.ts";
import { log_to_file } from "../../../core/logger.ts";
import { embeddingZeroVector } from "../../../core/memory.ts";
import {
  Content,
  IAgentRuntime,
  Memory,
  State,
  UUID,
  HandlerCallback,
} from "../../../core/types.ts";
import { stringToUuid } from "../../../core/uuid.ts";
import {
  telegramMessageTemplate,
  telegramShouldRespondTemplate,
  telegramErrorTemplate,
} from "./templates.ts";
import ImageDescriptionService from "../../../services/image.ts";
import summarize from "../../discord/actions/summarize_conversation.ts";

const MAX_MESSAGE_LENGTH = 4096;

export class MessageManager {
  private bot: Telegraf<Context>;
  private runtime: IAgentRuntime;
  private imageService: ImageDescriptionService;
  private processingMessages: Set<string> = new Set();

  constructor(bot: Telegraf<Context>, runtime: IAgentRuntime) {
    this.bot = bot;
    this.runtime = runtime;
    this.imageService = ImageDescriptionService.getInstance(this.runtime);
  }

  private isCommonMessage(
    message: TelegramMessage
  ): message is CommonMessageBundle {
    return "reply_to_message" in message;
  }

  private hasText(
    message: TelegramMessage
  ): message is TelegramMessage.TextMessage {
    return "text" in message;
  }

  private hasCaption(
    message: TelegramMessage
  ): message is
    | TelegramMessage.PhotoMessage
    | TelegramMessage.DocumentMessage
    | TelegramMessage.AudioMessage
    | TelegramMessage.VideoMessage {
    return "caption" in message;
  }

  private hasPhoto(
    message: TelegramMessage
  ): message is TelegramMessage.PhotoMessage {
    return (
      "photo" in message &&
      Array.isArray(message.photo) &&
      message.photo.length > 0
    );
  }

  private hasDocument(
    message: TelegramMessage
  ): message is TelegramMessage.DocumentMessage {
    return "document" in message && message.document !== undefined;
  }

  private createBaseMemory(chatId: string, text: string = ""): Memory {
    return {
      id: stringToUuid("base"),
      userId: this.runtime.agentId,
      roomId: stringToUuid(chatId),
      content: { text, source: "telegram" },
      createdAt: Date.now(),
      embedding: embeddingZeroVector,
    };
  }

  private escapeMarkdown(text: string): string {
    return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
  }

  private async processImage(
    message: TelegramMessage
  ): Promise<{ description: string } | null> {
    if (
      !this.hasPhoto(message) &&
      !(
        this.hasDocument(message) &&
        message.document?.mime_type?.startsWith("image/")
      )
    ) {
      return null;
    }

    console.log("🖼️ Processing image message:");

    try {
      let imageUrl: string | null = null;

      if (this.hasPhoto(message)) {
        const photo = message.photo[message.photo.length - 1];
        const fileLink = await this.bot.telegram.getFileLink(photo.file_id);
        imageUrl = fileLink.toString();
      } else if (
        this.hasDocument(message) &&
        message.document?.mime_type?.startsWith("image/")
      ) {
        const fileLink = await this.bot.telegram.getFileLink(
          message.document.file_id
        );
        imageUrl = fileLink.toString();
      }

      if (imageUrl) {
        console.log("📸 Retrieved image URL:", imageUrl);
        const { title, description } =
          await this.imageService.describeImage(imageUrl);
        const fullDescription = `[Image: ${title}\n${description}]`;
        return { description: fullDescription };
      }
    } catch (error) {
      console.error("❌ Error processing image:", error);
    }

    return null;
  }

  private async sendMessageInChunks(
    ctx: Context,
    content: string,
    replyToMessageId?: number
  ): Promise<TelegramMessage.TextMessage[]> {
    const chunks = this.splitMessage(content);
    const sentMessages: TelegramMessage.TextMessage[] = [];

    for (let i = 0; i < chunks.length; i++) {
      try {
        const chunk = chunks[i];
        const escapedChunk = this.escapeMarkdown(chunk);

        const sentMessage = (await ctx.telegram.sendMessage(
          ctx.chat!.id,
          escapedChunk,
          {
            reply_parameters:
              i === 0 && replyToMessageId
                ? { message_id: replyToMessageId }
                : undefined,
            parse_mode: "MarkdownV2",
          }
        )) as TelegramMessage.TextMessage;

        sentMessages.push(sentMessage);
      } catch (error) {
        console.error(`Error sending message chunk ${i} with markdown:`, error);
        const sentMessage = (await ctx.telegram.sendMessage(
          ctx.chat!.id,
          chunks[i],
          {
            reply_parameters:
              i === 0 && replyToMessageId
                ? { message_id: replyToMessageId }
                : undefined,
          }
        )) as TelegramMessage.TextMessage;
        sentMessages.push(sentMessage);
      }
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

  private getMessageText(message: TelegramMessage): string {
    if (this.hasText(message)) {
      return message.text;
    }
    if (this.hasCaption(message)) {
      return message.caption || "";
    }
    return "";
  }

  private getReplyToMessageId(message: TelegramMessage): UUID | undefined {
    if (this.isCommonMessage(message) && message.reply_to_message) {
      return stringToUuid(message.reply_to_message.message_id.toString());
    }
    return undefined;
  }

  private async _shouldRespond(
    message: TelegramMessage,
    state: State
  ): Promise<boolean> {
    // Avoid responding to bot's own messages
    if (message.from?.id === this.bot.botInfo?.id) {
      console.log("🤖 Ignoring own message");
      return false;
    }

    // Prioritize direct mentions in group chats
    if (
      this.hasText(message) &&
      message.text?.includes(`@${this.bot.botInfo?.username}`)
    ) {
      console.log("👋 Responding to direct mention");
      return true;
    }

    // Respond to mentions with media (e.g., photo with caption mentioning bot)
    if (
      (this.hasPhoto(message) || this.hasDocument(message)) &&
      message.caption?.includes(`@${this.bot.botInfo?.username}`)
    ) {
      console.log("👋 Responding to mention with media");
      return true;
    }

    // Check for private chat responsiveness
    if (message.chat.type === "private") {
      if (this.hasText(message) || this.hasCaption(message)) {
        const shouldRespondContext = composeContext({
          state,
          template: telegramShouldRespondTemplate,
        });

        const response = await this.runtime.shouldRespondCompletion({
          context: shouldRespondContext,
          stop: ["\n"],
          max_response_length: 5,
        });

        console.log(`🤔 Should respond in private chat: ${response}`);
        return response === "RESPOND";
      }
      return true;
    }

    // Group chat: Check if replying directly to bot
    if (this.isCommonMessage(message)) {
      const isReplyToBot =
        message.reply_to_message?.from?.id === this.bot.botInfo?.id;

      if (
        isReplyToBot ||
        this.hasPhoto(message) ||
        (this.hasDocument(message) &&
          message.document?.mime_type?.startsWith("image/"))
      ) {
        const shouldRespondContext = composeContext({
          state,
          template: telegramShouldRespondTemplate,
        });

        const response = await this.runtime.shouldRespondCompletion({
          context: shouldRespondContext,
          stop: ["\n"],
          max_response_length: 5,
        });

        console.log(`🤔 Should respond in group chat: ${response}`);
        return response === "RESPOND";
      }
    }

    return false;
  }

  private async _generateResponse(
    message: Memory,
    state: State
  ): Promise<Content> {
    const { userId, roomId } = message;
    const datestr = new Date().toUTCString().replace(/:/g, "-");

    try {
      const optionalFields = [
        "recentFacts",
        "relevantFacts",
        "characterMessageExamples",
        "actionExamples",
        "actions",
        "providers",
        "attachments",
      ];

      const requiredFields = [
        "agentName",
        "bio",
        "lore",
        "messageDirections",
        "recentMessages",
      ];

      const missingRequired = requiredFields.filter((field) => !state[field]);
      if (missingRequired.length > 0) {
        console.error("❌ Missing required state fields:", missingRequired);
        throw new Error(
          `Missing required fields: ${missingRequired.join(", ")}`
        );
      }

      const missingOptional = optionalFields.filter((field) => !state[field]);
      if (missingOptional.length > 0) {
        console.log("⚠️ Missing optional state fields:", missingOptional);
      }

      // Log state values
      console.log("🔍 State values:", {
        agentName: state.agentName,
        bioLength: state.bio?.length,
        loreLength: state.lore?.length,
        messageDirectionsLength: state.messageDirections?.length,
        recentMessagesCount: state.recentMessages?.length,
        hasRecentFacts: !!state.recentFacts,
        hasRelevantFacts: !!state.relevantFacts,
      });

      const enhancedState = {
        ...state,
        recentFacts: state.recentFacts || "",
        relevantFacts: state.relevantFacts || "",
        characterMessageExamples: state.characterMessageExamples || "",
        actionExamples: state.actionExamples || "",
        actions: state.actions || "",
        providers: state.providers || "",
        attachments: state.attachments || "",
      };

      const context = composeContext({
        state: enhancedState,
        template: telegramMessageTemplate,
      });

      console.log("📝 Generated Context:", {
        length: context.length,
        firstChars: context.substring(0, 100) + "...",
        lastChars: "..." + context.substring(context.length - 100),
      });

      // Log completion request details
      const completionRequest = {
        context,
        stop: ["<|eot|>", "<|eom|>"],
        temperature: 0.5,
        frequency_penalty: 1.1,
        model: this.runtime.getSetting("XAI_MODEL") ?? "gpt-4o-mini",
      };

      console.log("🚀 OpenAI Request:", {
        model: completionRequest.model,
        contextLength: completionRequest.context.length,
        stop: completionRequest.stop,
        temperature: completionRequest.temperature,
        frequency_penalty: completionRequest.frequency_penalty,
      });

      log_to_file(
        `${state.agentName}_${datestr}_openai_request`,
        JSON.stringify(completionRequest, null, 2)
      );

      const response = await this.runtime.messageCompletion({
        ...completionRequest,
        serverUrl:
          this.runtime.getSetting("X_SERVER_URL") ?? this.runtime.serverUrl,
        token: this.runtime.getSetting("XAI_API_KEY") ?? this.runtime.token,
      });

      if (!response) {
        console.error("❌ No response from runtime.messageCompletion");
        return {
          text: "I'm sorry, I couldn't process that request\\. Please try again\\.",
          source: "telegram",
        };
      }

      log_to_file(
        `${state.agentName}_${datestr}_telegram_message_response`,
        JSON.stringify(response)
      );

      // Ensure the response content has the expected structure
      let parsedResponse;
      try {
        parsedResponse =
          typeof response === "string" ? JSON.parse(response) : response;
        console.log("✔️ Parsed response successfully:", parsedResponse);
      } catch (error) {
        console.error("❌ Error parsing response:", error);
        parsedResponse = null;
      }

      if (!parsedResponse || !parsedResponse.text) {
        console.error(
          "❌ Parsed response is null or missing 'text', aborting send"
        );
        return {
          text: "I'm sorry, I couldn't process that request\\. Please try again\\.",
          source: "telegram",
        };
      }

      await this.runtime.databaseAdapter.log({
        body: { message, context, response: parsedResponse },
        userId: userId,
        roomId,
        type: "response",
      });

      // Return the formatted response content
      return {
        text: parsedResponse.text,
        source: "telegram",
      };
    } catch (error) {
      console.error("❌ Error in _generateResponse:", error);

      if (error instanceof Error) {
        console.error("Error details:", {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      }

      return {
        text: "I'm sorry, I couldn't process that request\\. Please try again\\.",
        source: "telegram",
      };
    }
  }

  private async handleError(
    ctx: Context,
    error: Error,
    memory?: Memory
  ): Promise<void> {
    try {
      const baseMemory =
        memory ||
        this.createBaseMemory(ctx.chat?.id.toString() || "0", error.message);
      const state = await this.runtime.composeState(baseMemory);

      const errorContext = composeContext({
        state,
        template: telegramErrorTemplate,
      });

      const errorResponse = await this.runtime.messageCompletion({
        context: errorContext,
        stop: ["<|eot|>", "<|eom|>"],
        temperature: 0.7,
      });

      if (errorResponse?.text) {
        const escapedText = this.escapeMarkdown(errorResponse.text);
        await ctx.telegram.sendMessage(ctx.chat!.id, escapedText, {
          parse_mode: "MarkdownV2",
        });
      } else {
        const defaultMessage = this.escapeMarkdown(
          "I'm sorry, I encountered an error processing your message. Please try again."
        );
        await ctx.telegram.sendMessage(ctx.chat!.id, defaultMessage, {
          parse_mode: "MarkdownV2",
        });
      }
    } catch (e) {
      console.error("Failed to handle error:", e);
      await ctx.reply(
        "Sorry, I encountered an error while processing your request."
      );
    }
  }

  public async handleMessage(ctx: Context): Promise<void> {
    if (!ctx.message || !ctx.from) {
      return;
    }

    const message = ctx.message;
    const messageId = message.message_id.toString();
    let memory: Memory | undefined;

    // Check for duplicate processing
    if (this.processingMessages.has(messageId)) {
      console.log(`⏭️ Skipping duplicate message ${messageId}`);
      return;
    }

    try {
      // Add message to processing set
      this.processingMessages.add(messageId);
      console.log(`📥 Processing message ${messageId}`);

      const userId = stringToUuid(ctx.from.id.toString()) as UUID;
      const userName =
        ctx.from.username || ctx.from.first_name || "Unknown User";
      const chatId = stringToUuid(ctx.chat?.id.toString()) as UUID;
      const agentId = this.runtime.agentId;
      const roomId = chatId;

      await Promise.all([
        this.runtime.ensureUserExists(
          agentId,
          this.bot.botInfo?.username || "Bot",
          this.runtime.character.name,
          "telegram"
        ),
        this.runtime.ensureUserExists(userId, userName, userName, "telegram"),
        this.runtime.ensureRoomExists(roomId),
        this.runtime.ensureParticipantInRoom(userId, roomId),
        this.runtime.ensureParticipantInRoom(agentId, roomId),
      ]);

      const messageUuid = stringToUuid(message.message_id.toString()) as UUID;

      // Only process image if message contains one
      let imageInfo = null;
      if (
        this.hasPhoto(message) ||
        (this.hasDocument(message) &&
          message.document?.mime_type?.startsWith("image/"))
      ) {
        imageInfo = await this.processImage(message);
      }

      const messageText = this.getMessageText(message);
      const fullText = imageInfo
        ? `${messageText} ${imageInfo.description}`
        : messageText;

      if (!fullText) {
        this.processingMessages.delete(messageId);
        return;
      }

      const content: Content = {
        text: fullText,
        source: "telegram",
        inReplyTo: this.getReplyToMessageId(message),
      };

      memory = {
        id: messageUuid,
        userId,
        roomId,
        content,
        createdAt: message.date * 1000,
        embedding: embeddingZeroVector,
      };

      await this.runtime.messageManager.createMemory(memory);

      const callback: HandlerCallback = async (
        content: Content,
        attachments?: string[]
      ) => {
        if (attachments?.length) {
          for (const attachment of attachments) {
            try {
              const fileContent = fs.readFileSync(attachment);
              await ctx.replyWithDocument(
                {
                  source: Buffer.from(fileContent),
                  filename: attachment.split("/").pop(),
                },
                {
                  reply_parameters: {
                    message_id: message.message_id,
                  },
                }
              );
            } catch (error) {
              console.error("Error sending attachment:", error);
            }
          }
        }

        let sentMessages: TelegramMessage.TextMessage[] = [];
        if (content.text) {
          sentMessages = await this.sendMessageInChunks(
            ctx,
            content.text,
            message.message_id
          );
        }

        const memories: Memory[] = [];

        for (let i = 0; i < sentMessages.length; i++) {
          const sentMessage = sentMessages[i];
          const isLastMessage = i === sentMessages.length - 1;

          const memory: Memory = {
            id: stringToUuid(sentMessage.message_id.toString()),
            userId: agentId,
            roomId,
            content: {
              ...content,
              text: sentMessage.text,
              action: !isLastMessage ? "CONTINUE" : undefined,
              inReplyTo: messageUuid,
            },
            createdAt: sentMessage.date * 1000,
            embedding: embeddingZeroVector,
          };

          await this.runtime.messageManager.createMemory(memory);
          memories.push(memory);
        }

        return memories;
      };

      let state = await this.runtime.composeState(memory);
      state = await this.runtime.updateRecentMessageState(state);

      // Check for summarize action first
      if (this.hasText(message)) {
        const isSummarizeRequest = await summarize.validate(
          this.runtime,
          memory,
          state
        );

        if (isSummarizeRequest) {
          console.log("🔄 Processing summarize request");
          await summarize.handler(this.runtime, memory, state, {}, callback);
          this.processingMessages.delete(messageId);
          return;
        }
      }

      // Only proceed with normal flow if not a summarize request
      const shouldRespond = await this._shouldRespond(message, state);
      if (!shouldRespond) {
        console.log("⏭️ Skipping message - should not respond");
        this.processingMessages.delete(messageId);
        return;
      }

      console.log("🤖 Generating response...");
      const responseContent = await this._generateResponse(memory, state);
      if (!responseContent || !responseContent.text) {
        console.log("❌ No response content generated");
        this.processingMessages.delete(messageId);
        return;
      }

      console.log("📤 Sending response...");

      // Parsing and validating response JSON
      let parsedContent;
      try {
        parsedContent = JSON.parse(JSON.stringify(responseContent));
        console.log("✔️ Parsed content successfully:", parsedContent);
      } catch (error) {
        console.error("❌ Error parsing response content:", error);
        console.log("Response content was:", responseContent);
        parsedContent = null;
      }

      if (!parsedContent) {
        console.error("❌ Parsed content is null, aborting send");
        this.processingMessages.delete(messageId);
        return;
      }

      const responseMessages = await callback(parsedContent);
      state = await this.runtime.updateRecentMessageState(state);

      try {
        await this.runtime.evaluate(memory, state);
        await this.runtime.processActions(
          memory,
          responseMessages,
          state,
          callback
        );
      } catch (actionError) {
        console.error("❌ Error processing actions:", actionError);
        await this.handleError(ctx, actionError as Error, memory);
      }
    } catch (error) {
      console.error("❌ Error handling message:", error);
      await this.handleError(ctx, error as Error, memory);
    } finally {
      // Always clean up the processing set
      this.processingMessages.delete(messageId);
      console.log(`✅ Completed processing message ${messageId}`);
    }
  }

  public async stop(): Promise<void> {
    console.log("🛑 Stopping Message Manager...");
    try {
      this.processingMessages.clear();
      console.log("✅ Message Manager stopped successfully");
    } catch (error) {
      console.error("❌ Error stopping Message Manager:", error);
      throw error;
    }
  }
}
