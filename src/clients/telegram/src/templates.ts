import {
  messageCompletionFooter,
  shouldRespondFooter,
} from "../../../core/parsing.ts";

export const telegramMessageTemplate =
  // {{goals}}
  `# Action Examples
  {{actionExamples}}
  (Action examples are for reference only. Do not use the information from them in your response.)
  
  # Relevant facts that {{agentName}} knows:
  {{relevantFacts}}
  
  # Recent facts that {{agentName}} has learned:
  {{recentFacts}}
  
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
  
  # Telegram-Specific Guidelines
  - Messages must be under 4096 characters
  - Use Telegram markdown formatting:
    *bold text*
    _italic text_
    [inline URL](http://www.example.com/)
    \`inline fixed-width code\`
    \`\`\`
    pre-formatted fixed-width code block
    \`\`\`
  - Can include emoji 👋
  - Can reply to specific messages using reply feature
  - Can send images with captions
  
  # Important Response Guidelines
  - Keep responses focused and relevant
  - Avoid open-ended questions that would require unnecessary follow-ups
  - If providing information, be concise and complete in one response
  - Consider the chat context (group vs private)
  
  {{messageDirections}}
  
  {{recentMessages}}
  
  # Instructions: Write the next message for {{agentName}}. Include an action if appropriate. {{actionNames}}
  ` + messageCompletionFooter;

export const telegramShouldRespondTemplate =
  `# Task: Decide if {{agentName}} should respond.
About {{agentName}}:
{{bio}}

{{providers}}

# INSTRUCTIONS: Determine if {{agentName}} should respond based on the message content and context. Only respond with "RESPOND", "IGNORE", or "STOP".

# RESPONSE EXAMPLES
<user 1>: I just saw a really great movie
<user 2>: Oh? Which movie?
Result: [IGNORE]

{{agentName}}: Oh, this is my favorite scene
<user 1>: sick
<user 2>: wait, why is it your favorite scene
Result: [RESPOND]

<user>: stfu bot
Result: [STOP]

<user>: Hey {{agent}}, can you help me with something
Result: [RESPOND]

<user>: {{agentName}} stfu plz
Result: [STOP]

<user>: can you analyze this image? @{{agentName}}
Result: [RESPOND]

<user>: i need help
{{agentName}}: how can I help you?
<user>: no. i need help from someone else
Result: [IGNORE]

<user>: what is this image? @{{agentName}}
Result: [RESPOND]

Response options are [RESPOND], [IGNORE], and [STOP].

# Telegram-Specific Rules
1. Message Context:
   - In private chats: Be responsive but avoid spamming.
   - In group chats: Only respond to:
     * Direct mentions (@{{agentName}})
     * Replies directly to {{agentName}}'s messages
     * Active conversations directed to or involving {{agentName}}
     * Media (like images) shared directly with {{agentName}}

2. Message Types:
   - Text: Respond if relevant or directed toward {{agentName}}.
   - Images: Respond if mentioned alongside an image.
   - Stickers/GIFs: Usually ignore unless part of an active conversation.
   - Forwarded messages: Ignore unless specifically for {{agentName}}.

{{agentName}} is cautious about being overly active and prefers not to respond to minor or ambiguous comments.

- Respond with [RESPOND] if the message directly mentions {{agentName}}, or in conversations that are meaningful or relevant.
- If the message lacks relevance or interest, respond with [IGNORE].
- Unless directly addressed, respond with [IGNORE] to messages that are brief or vague.
- If a user requests {{agentName}} to stop, respond with [STOP].
- If the conversation concludes, respond with [STOP].

IMPORTANT: {{agentName}} errs on the side of caution to avoid being intrusive. If unsure, it’s better to respond with [IGNORE]. In ongoing conversations without a request to stop, prefer [RESPOND].

{{recentMessages}}

# INSTRUCTIONS: Select the option that best describes {{agentName}}'s response to the last message. Ignore messages that are not for {{agentName}}.
IMPORTANT: If the last message was from {{agentName}}, you must return [IGNORE].
` + shouldRespondFooter;

export const telegramErrorTemplate =
  `# Task: Generate an error message for {{agentName}}.
  About {{agentName}}:
  {{bio}}
  
  # Error Context
  {{errorContext}}
  
  # Relevant facts that {{agentName}} knows:
  {{relevantFacts}}
  
  # Recent facts that {{agentName}} has learned:
  {{recentFacts}}
  
  {{providers}}
  
  # Capabilities
  Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs.
  
  # Guidelines
  - Keep error messages friendly but informative
  - Maintain character voice while being helpful
  - Provide clear next steps if applicable
  - Keep messages under 4096 characters
  - Use appropriate formatting
  
  # Telegram-Specific Formatting
  - Messages must use proper markdown:
    *bold text*
    _italic text_
    [inline URL](http://www.example.com/)
    \`inline fixed-width code\`
  - Can include emoji for a friendly tone 👋
  - Keep formatting minimal in error messages for clarity
  
  # Instructions: Write an error message that:
  1. Acknowledges the issue
  2. Maintains character voice
  3. Provides guidance if possible
  4. Remains helpful and friendly
  
  {{messageDirections}}
  ` + messageCompletionFooter;
