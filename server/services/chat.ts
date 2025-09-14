import { embeddingsService } from "./embeddings";
import { storage } from "../storage";
import { type InsertChatMessage, type ChatMessage } from "@shared/schema";

interface LLMResponse {
  content: string;
  citations: Array<{
    lawTextId: string;
    relevanceScore: number;
    snippet: string;
  }>;
}

export class ChatService {

  async generateResponse(
    query: string,
    domainIds?: string[],
    sessionId?: string
  ): Promise<LLMResponse> {
    try {
      // Use semantic retrieval with vector embeddings instead of keyword matching
      console.log(`Starting semantic retrieval for query: "${query}"`);
      
      // Search for semantically similar law texts using vector embeddings
      const relevantTexts = await embeddingsService.searchSimilarLawTexts(
        query, 
        domainIds, 
        5 // Get top 5 most similar texts
      );
      
      console.log(`Found ${relevantTexts.length} semantically relevant law texts with similarity scores:`);
      relevantTexts.forEach((text, i) => {
        console.log(`  ${i + 1}. ${text.title} (similarity: ${(text.similarity * 100).toFixed(1)}%)`);
      });

      // Prepare context from semantically retrieved law texts
      const context = relevantTexts.map((text, index) => 
        `[${index + 1}] ${text.title} (${text.lawNumber || 'N/A'}) - Relevance: ${(text.similarity * 100).toFixed(1)}%\n` +
        `${text.section ? `§ ${text.section}` : ''} ${text.paragraph ? text.paragraph : ''}\n` +
        `${text.content.substring(0, 500)}...\n`
      ).join('\n');

      // Always prepare a comprehensive prompt that works with or without context
      let prompt: string;
      if (relevantTexts.length > 0) {
        // Use retrieved law texts as context
        prompt = `Du er en dansk juridisk AI-assistent. Besvar følgende spørgsmål baseret på de relevante lovbestemmelser nedenfor.

SPØRGSMÅL: ${query}

RELEVANTE LOVBESTEMMELSER:
${context}

INSTRUKTIONER:
- Giv et klart og præcist svar på dansk baseret på de angivne lovbestemmelser
- Referer specifikt til de relevante paragraffer og love
- Forklar komplekse juridiske begreber i forståelige termer
- Hvis der er usikkerhed eller manglende information, nævn det eksplicit
- Hold svaret struktureret og let at læse
- Brug kun informationen fra de angivne lovbestemmelser

SVAR:`;
      } else {
        // Fallback prompt when no specific law texts are found
        prompt = `Du er en dansk juridisk AI-assistent. Besvar følgende spørgsmål baseret på dansk lovgivning.

SPØRGSMÅL: ${query}

INSTRUKTIONER:
- Giv et klart og præcist svar på dansk
- Referer til relevante danske love og regler, hvis du kender dem
- Forklar komplekse juridiske begreber i forståelige termer
- Vær eksplicit om eventuelle begrænsninger i dit svar
- Anbefal at konsultere en juridisk ekspert for specifik rådgivning
- Hold svaret struktureret og let at læse

SVAR:`;
      }

      // Call LLM with the prepared prompt
      const llmResponse = await this.callLLM(prompt);

      // Prepare citations from semantically retrieved texts with actual similarity scores
      const citations = relevantTexts.map(text => ({
        lawTextId: text.id,
        relevanceScore: text.similarity, // This comes from vector similarity search
        snippet: text.content.substring(0, 200) + "...",
      }));
      
      console.log(`Generated ${citations.length} citations from semantic search with similarity scores`);

      return {
        content: llmResponse,
        citations,
      };

    } catch (error) {
      console.error("Error generating LLM response:", error);
      return {
        content: "Der opstod en fejl ved generering af svar. Prøv venligst igen.",
        citations: [],
      };
    }
  }

  // REMOVED: Old keyword matching method - replaced with semantic retrieval using embeddings

  private async callLLM(prompt: string): Promise<string> {
    // This will be replaced with DeepSeek API integration
    throw new Error("LLM integration pending - DeepSeek setup in progress");
  }








  async processUserMessage(
    sessionId: string,
    userMessage: string,
    domainIds?: string[]
  ): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> {
    // Store user message
    const userMessageData: InsertChatMessage = {
      sessionId,
      role: "user",
      content: userMessage,
      citations: [],
    };

    const savedUserMessage = await storage.createChatMessage(userMessageData);

    // Generate AI response
    const llmResponse = await this.generateResponse(userMessage, domainIds, sessionId);

    // Store assistant message
    const assistantMessageData: InsertChatMessage = {
      sessionId,
      role: "assistant",
      content: llmResponse.content,
      citations: llmResponse.citations,
    };

    const savedAssistantMessage = await storage.createChatMessage(assistantMessageData);

    // Update session timestamp
    await storage.updateChatSession(sessionId, {});

    return {
      userMessage: savedUserMessage,
      assistantMessage: savedAssistantMessage,
    };
  }

  async regenerateResponse(
    messageId: string,
    domainIds?: string[]
  ): Promise<ChatMessage> {
    // Get all messages from storage
    const allMessages = await storage.getChatMessages("");
    const messageToRegenerate = allMessages.find(m => m.id === messageId);
    
    if (!messageToRegenerate || messageToRegenerate.role !== "assistant") {
      throw new Error("Message not found or not an assistant message");
    }

    // Get all messages from the same session, ordered by creation time
    const sessionMessages = allMessages
      .filter(m => m.sessionId === messageToRegenerate.sessionId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Find the message to regenerate and the previous user message
    const messageIndex = sessionMessages.findIndex(m => m.id === messageId);
    const userMessage = sessionMessages[messageIndex - 1];
    
    if (!userMessage || userMessage.role !== "user") {
      throw new Error("Previous user message not found");
    }

    // Generate new response
    const llmResponse = await this.generateResponse(
      userMessage.content,
      domainIds,
      messageToRegenerate.sessionId
    );

    // Update the existing message content
    const updatedMessageData: InsertChatMessage = {
      sessionId: messageToRegenerate.sessionId,
      role: "assistant",
      content: llmResponse.content,
      citations: llmResponse.citations,
    };

    // Create a new message to replace the old one
    const newMessage = await storage.createChatMessage(updatedMessageData);
    
    // In a production app, you'd want to actually update the existing message
    // For now, we return the new message
    return newMessage;
  }
}

export const chatService = new ChatService();
