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
  private llmEndpoint = process.env.LLM_ENDPOINT || "http://localhost:11434/api/generate";
  private llmModel = process.env.LLM_MODEL || "llama2";

  async generateResponse(
    query: string,
    domainIds?: string[],
    sessionId?: string
  ): Promise<LLMResponse> {
    try {
      // For demo purposes, search law texts by simple text matching instead of embeddings
      let lawTexts = await storage.getLawTexts(domainIds);
      
      // Simple keyword matching for Danish employment terms
      const keywords = query.toLowerCase();
      const employmentTerms = ['opsigelse', 'ansættelse', 'kontrakt', 'varsel', 'funktionær', 'arbejder'];
      const hasEmploymentTerms = employmentTerms.some(term => keywords.includes(term));
      
      let relevantTexts = [];
      if (hasEmploymentTerms) {
        // Filter texts related to employment law
        relevantTexts = lawTexts.filter(text => 
          text.content.toLowerCase().includes('opsigelse') || 
          text.content.toLowerCase().includes('ansættelse') ||
          text.content.toLowerCase().includes('varsel') ||
          text.title.toLowerCase().includes('funktionær')
        ).map(text => ({
          ...text,
          similarity: 0.85 // Mock similarity score
        }));
      }

      if (relevantTexts.length === 0) {
        return {
          content: "Jeg kunne ikke finde relevante lovbestemmelser for dit spørgsmål. Prøv at omformulere dit spørgsmål eller kontroller om de rigtige lovområder er valgt.",
          citations: [],
        };
      }

      // Prepare context for LLM
      const context = relevantTexts.map((text, index) => 
        `[${index + 1}] ${text.title} (${text.lawNumber || 'N/A'})\n` +
        `${text.section ? `§ ${text.section}` : ''} ${text.paragraph ? text.paragraph : ''}\n` +
        `${text.content.substring(0, 500)}...\n`
      ).join('\n');

      // Prepare prompt for Danish legal assistant
      const prompt = `Du er en dansk juridisk AI-assistent. Besvar følgende spørgsmål baseret på de relevante lovbestemmelser nedenfor.

SPØRGSMÅL: ${query}

RELEVANTE LOVBESTEMMELSER:
${context}

INSTRUKTIONER:
- Giv et klart og præcist svar på dansk
- Referer specifikt til de relevante paragraffer
- Forklar komplekse juridiske begreber i forståelige termer
- Hvis der er usikkerhed, nævn det eksplicit
- Hold svaret struktureret og let at læse

SVAR:`;

      // Call local LLM
      const llmResponse = await this.callLLM(prompt);

      // Prepare citations
      const citations = relevantTexts.map(text => ({
        lawTextId: text.id,
        relevanceScore: text.similarity,
        snippet: text.content.substring(0, 200) + "...",
      }));

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

  private async callLLM(prompt: string): Promise<string> {
    try {
      const response = await fetch(this.llmEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.llmModel,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.3,
            top_p: 0.9,
            max_tokens: 1000,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.response || "Ingen svar fra LLM";

    } catch (error) {
      console.error("Error calling LLM:", error);
      
      // Fallback response
      return "LLM-tjenesten er ikke tilgængelig i øjeblikket. Prøv venligst igen senere.";
    }
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
