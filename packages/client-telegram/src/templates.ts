import { messageCompletionFooter, shouldRespondFooter } from "@ai16z/eliza";

export const telegramShouldRespondTemplate = `# About {{agentName}}:
{{bio}}

# GROUP CHAT EXAMPLES
{{user1}}: Hey everyone
Result: [IGNORE]

{{user1}}: @{{agentName}} what do you think?
Result: [RESPOND]

{{user1}}: that's interesting
Result: [IGNORE]

{{agentName}}: I think the concept is fascinating because...
{{user1}}: why do you say that?
Result: [RESPOND]

{{user1}}: @{{agentName}} but what about...
Result: [RESPOND]

{{user1}}: makes sense
Result: [IGNORE]

# PRIVATE CHAT EXAMPLES
{{user1}}: hi
Result: [RESPOND]

{{user1}}: can you help me?
Result: [RESPOND]

{{user1}}: thanks!
Result: [IGNORE]

{{user1}}: /start
Result: [RESPOND]

{{user1}}: that's all for now
Result: [STOP]

Response options are [RESPOND], [IGNORE] and [STOP].

# GROUP CHAT RULES
{{agentName}} in group chats ONLY responds when:
- Directly @mentioned in the message
- Message is a direct reply to {{agentName}}'s last message
- Direct question includes {{agentName}}'s name

Group Chat Messages to IGNORE:
- General chat without mentions
- Follow-ups without new mentions
- Comments not directly replying
- Messages meant for others
- Very short or vague responses

# PRIVATE CHAT RULES
{{agentName}} in private chats responds to:
- Direct questions or requests
- Commands (starting with /)
- Clear conversation starters
- Follow-up questions to ongoing topics

Private Chat Messages to IGNORE:
- Very short acknowledgments ("ok", "thanks")
- Emoji-only messages
- Messages clearly ending the conversation
- Unclear or incomplete thoughts

# UNIVERSAL RULES
Always STOP when:
- Explicitly asked to stop
- User says "bye" or clearly ends chat
- Asked to be quiet
- Conversation naturally concludes

The goal is to decide whether {{agentName}} should respond to the last message.

{{recentMessages}}

Message Thread:
{{formattedConversation}}

# INSTRUCTIONS: Based on the chat type and rules above, choose [RESPOND], [IGNORE], or [STOP].
${shouldRespondFooter}`;

export const telegramMessageHandlerTemplate = `# Action Examples
{{actionExamples}}
(Action examples are for reference only. Do not use the information from them in your response.)

# Knowledge
{{knowledge}}

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

Examples of {{agentName}}'s dialog and actions:
{{characterMessageExamples}}

{{providers}}

{{attachments}}

{{actions}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

# Telegram Guidelines
- Messages must be under 4096 characters
- Use Telegram markdown: *bold*, _italic_, \`code\`
- Can include emoji and reply to specific messages
- Can send images with captions
- Consider group vs private chat context

{{messageDirections}}

{{recentMessages}}

# Task: Generate a message as {{agentName}} for Telegram:
Current Message:
{{currentMessage}}
Message Thread:

{{formattedConversation}}
${messageCompletionFooter}`;

export const MAX_MESSAGE_LENGTH = 4096; // Telegram's max message length