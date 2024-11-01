import { Context, Telegraf } from "telegraf";
import { Action, IAgentRuntime } from "../../../core/types.ts";
import { MessageManager } from "./messageManager.ts";
import summarize from "../../discord/actions/summarize_conversation.ts";

export class TelegramClient {
  private bot: Telegraf<Context>;
  private runtime: IAgentRuntime;
  private messageManager: MessageManager;
  private processingMessages: Set<string> = new Set();

  constructor(runtime: IAgentRuntime, botToken: string) {
    console.log("📱 Constructing new TelegramClient...");
    this.runtime = runtime;
    this.bot = new Telegraf(botToken);
    this.messageManager = new MessageManager(this.bot, this.runtime);

    // Register the summarize action
    this.runtime.registerAction(summarize as Action);

    this.setupMessageHandlers();
    console.log("✅ TelegramClient constructor completed");
  }

  private setupMessageHandlers(): void {
    console.log("Setting up message handlers...");
    
    this.bot.on("message", async (ctx) => {
      try {
        const messageId = ctx.message?.message_id.toString();
        if (!messageId) {
          console.log("⚠️ Received message without ID, skipping...");
          return;
        }

        // Check if we're already processing this message
        if (this.processingMessages.has(messageId)) {
          console.log(`⏭️ Already processing message ${messageId}, skipping duplicate`);
          return;
        }

        // Add message to processing set
        this.processingMessages.add(messageId);
        console.log(`📥 Processing message ${messageId}:`, ctx.message);

        try {
          await this.messageManager.handleMessage(ctx);
        } finally {
          // Always remove message from processing set
          this.processingMessages.delete(messageId);
          console.log(`✅ Completed processing message ${messageId}`);
        }
      } catch (error) {
        console.error("❌ Error handling message:", error);
        await ctx.reply("An error occurred while processing your message.")
          .catch(e => console.error("Failed to send error message:", e));
      }
    });

    // Enhanced logging for specific message types
    this.bot.on("photo", (ctx) => {
      const messageId = ctx.message?.message_id.toString();
      console.log(`📸 Received photo message ${messageId} with caption:`, ctx.message.caption);
    });

    this.bot.on("document", (ctx) => {
      const messageId = ctx.message?.message_id.toString();
      console.log(`📎 Received document message ${messageId}:`, ctx.message.document.file_name);
    });

    // Global error handler
    this.bot.catch((err, ctx) => {
      console.error(`❌ Telegram Error for ${ctx.updateType}:`, err);
      ctx.reply("An unexpected error occurred. Please try again later.")
        .catch(e => console.error("Failed to send error message:", e));
    });
  }

  public async start(): Promise<void> {
    console.log("🚀 Starting Telegram bot...");
    try {
      await this.bot.launch({
        dropPendingUpdates: true,
      });
      console.log("✨ Telegram bot successfully launched and is running!");
      console.log(`Bot username: @${this.bot.botInfo?.username}`);

      this.setupShutdownHandlers();
    } catch (error) {
      console.error("❌ Failed to launch Telegram bot:", error);
      throw error;
    }
  }

  private setupShutdownHandlers(): void {
    const shutdownHandler = async (signal: string) => {
      console.log(`⚠️ Received ${signal}. Shutting down Telegram bot gracefully...`);
      try {
        await this.stop();
        console.log("🛑 Telegram bot stopped gracefully");
      } catch (error) {
        console.error("❌ Error during Telegram bot shutdown:", error);
        throw error;
      }
    };

    process.once("SIGINT", () => shutdownHandler("SIGINT"));
    process.once("SIGTERM", () => shutdownHandler("SIGTERM"));
    process.once("SIGHUP", () => shutdownHandler("SIGHUP"));
  }

  public async stop(): Promise<void> {
    console.log("Stopping Telegram bot...");
    this.processingMessages.clear();
    await this.bot.stop();
    console.log("Telegram bot stopped");
  }
}