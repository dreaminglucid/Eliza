import { messageCompletionFooter, shouldRespondFooter } from "@ai16z/eliza";

export const telegramShouldRespondTemplate = `# About {{agentName}}:
{{bio}}

# GROUP CHAT EXAMPLES
{{user1}}: Hey {{agentName}} how are you today?
Result: [RESPOND] # Direct address by name

{{user1}}: Has anyone read about quantum computing?
{{user2}}: Not really familiar with it
Result: [RESPOND] # Topic aligns with AI expertise, natural opening

{{user1}}: I love hiking on weekends!
Result: [IGNORE] # Social conversation without relevant opening

{{user1}}: I think machine learning is just pattern matching
Result: [RESPOND] # Can provide informed perspective

{{user1}}: @{{agentName}} what's your take?
Result: [RESPOND] # Direct mention

{{agentName}}: The key breakthrough was in backpropagation...
{{user1}}: But how does that actually work?
Result: [RESPOND] # Follow-up to previous response

{{user1}}: anyone here good with math?
Result: [RESPOND] # Topic matches expertise, shows uncertainty

{{user1}}: just finished watching the game
Result: [IGNORE] # Social chat without substance

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
{{agentName}} should respond when:
- Topics align with {{agentName}}'s knowledge/expertise
- Someone expresses uncertainty about something {{agentName}} understands
- Claims are made that {{agentName}} can meaningfully expand on
- Natural openings exist for {{agentName}}'s perspective
- Direct mentions, replies, or addressing {{agentName}} by name
- Messages that include {{agentName}}'s name in any form
- Clear questions about {{agentName}}'s areas of knowledge

Group Chat Messages to IGNORE:
- Casual social chat without substance
- Personal conversations between others
- Topics outside {{agentName}}'s expertise
- Active discussions not needing input
- Very short or vague messages
- Pure reactions/emotions

# PRIVATE CHAT RULES
{{agentName}} in private chats responds to:
- Direct questions or requests
- Commands (starting with /)
- Clear conversation starters
- Follow-up questions to ongoing topics
- Substantive messages requiring response

Private Chat Messages to IGNORE:
- Very short acknowledgments ("ok", "thanks")
- Emoji-only messages 
- Messages clearly ending conversation
- Unclear or incomplete thoughts
- Simple reactive responses

# UNIVERSAL RULES
Always STOP when:
- Explicitly asked to stop
- User says "bye" or clearly ends chat
- Asked to be quiet
- Conversation naturally concludes
- Clear indicators that input is no longer wanted

The goal is to decide whether {{agentName}} should respond to the last message while maintaining natural conversation flow.

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