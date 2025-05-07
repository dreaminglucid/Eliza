import type { IAgentRuntime, KnowledgeItem, Memory, Provider, UUID } from '@elizaos/core'; // Ensure KnowledgeItem is imported
import { addHeader } from '@elizaos/core';

/**
 * Represents a knowledge provider that retrieves knowledge from the knowledge base,
 * scoped to the user and world of the incoming message, as well as agent-global knowledge.
 * @type {Provider}
 * @property {string} name - The name of the knowledge provider.
 * @property {string} description - The description of the knowledge provider.
 * @property {boolean} dynamic - Indicates if the knowledge provider is dynamic or static.
 * @property {Function} get - Asynchronously retrieves knowledge from the knowledge base.
 * @param {IAgentRuntime} runtime - The agent runtime object.
 * @param {Memory} message - The message containing the query and context (including user/world scope).
 * @returns {Object} An object containing the retrieved knowledge data, values, and text.
 */
export const knowledgeProvider: Provider = {
  name: 'KNOWLEDGE',
  description:
    'Knowledge from the knowledge base that the agent knows, retrieved whenever the agent needs to answer a question about their expertise. Includes both user-specific and agent-global context.',
  dynamic: true,
  get: async (runtime: IAgentRuntime, message: Memory) => {
    const userEntityId = message.entityId;
    const agentEntityId = runtime.agentId;
    const messageWorldId = message.worldId;
    const queryText = message.content?.text;

    // Define search parameters common to both searches
    const baseSearchParams = {
      tableName: 'knowledge',
      match_threshold: 0.1,
      embedding: await runtime.useModel('TEXT_EMBEDDING', { text: queryText }),
      query: queryText, // Pass query for potential reranking within each scope
      ...(messageWorldId && { worldId: messageWorldId }), // Add worldId if present
    };

    // --- Search 1: User-Specific Knowledge ---
    let userKnowledgeResults: KnowledgeItem[] = [];
    if (userEntityId && userEntityId !== agentEntityId) {
      // Only search if user is not the agent itself
      try {
        console.log('[Knowledge Provider] Searching user knowledge with scope:', {
          entityId: userEntityId,
          worldId: messageWorldId,
        });
        const userMemories = await runtime.searchMemories({
          ...baseSearchParams,
          entityId: userEntityId,
          count: 3, // Limit user-specific results
        });
        userKnowledgeResults = userMemories.map((m) => ({
          id: m.id,
          content: m.content,
          similarity: m.similarity,
          metadata: m.metadata,
          worldId: m.worldId,
        }));
        console.log('[Knowledge Provider] User knowledge results:', userKnowledgeResults.length);
      } catch (error) {
        console.error('[Knowledge Provider] Error fetching user knowledge:', error);
      }
    }

    // --- Search 2: Agent-Global Knowledge ---
    let agentKnowledgeResults: KnowledgeItem[] = [];
    try {
      console.log('[Knowledge Provider] Searching agent knowledge with scope:', {
        entityId: agentEntityId,
        worldId: messageWorldId,
      });
      const agentMemories = await runtime.searchMemories({
        ...baseSearchParams,
        entityId: agentEntityId,
        count: 3, // Limit agent-global results
      });
      agentKnowledgeResults = agentMemories.map((m) => ({
        id: m.id,
        content: m.content,
        similarity: m.similarity,
        metadata: m.metadata,
        worldId: m.worldId,
      }));
      console.log('[Knowledge Provider] Agent knowledge results:', agentKnowledgeResults.length);
    } catch (error) {
      console.error('[Knowledge Provider] Error fetching agent knowledge:', error);
    }

    // --- Format Combined Results ---
    let userKnowledgeText = '# Your Related Memories (None Found)';
    if (userKnowledgeResults.length > 0) {
      userKnowledgeText = addHeader(
        '# Your Related Memories',
        userKnowledgeResults
          .map((item) => `- ${item.content.text?.split('\n').join(' ')}`)
          .join('\n') // Format concisely
      );
    }

    let agentKnowledgeText = '# General Knowledge Base (None Found Relevant)';
    if (agentKnowledgeResults.length > 0) {
      agentKnowledgeText = addHeader(
        '# General Knowledge Base',
        agentKnowledgeResults
          .map((item) => `- ${item.content.text?.split('\n').join(' ')}`)
          .join('\n') // Format concisely
      );
    }

    let combinedKnowledge = `${userKnowledgeText}\n\n${agentKnowledgeText}\n`;

    // --- Truncation Logic ---
    const tokenLength = 3.5; // Assuming average token length approximation
    const maxLength = 4000 * tokenLength;
    if (combinedKnowledge.length > maxLength) {
      console.warn(
        `[Knowledge Provider] Combined knowledge text truncated from ${combinedKnowledge.length} to ${maxLength} characters.`
      );
      combinedKnowledge = combinedKnowledge.slice(0, maxLength) + '... [truncated]';
    }

    console.log(
      '[Knowledge Provider] Final combined knowledge text for prompt:\n',
      combinedKnowledge
    );

    return {
      data: {
        knowledge: combinedKnowledge,
        userItems: userKnowledgeResults,
        agentItems: agentKnowledgeResults,
      },
      values: {
        knowledge: combinedKnowledge, // Make the combined string available as a value
      },
      text: combinedKnowledge, // Use the combined string as the primary text output
    };
  },
};
