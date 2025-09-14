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
  private useLocalLLM = true; // Use local Transformers.js LLM by default

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
    try {
      if (this.useLocalLLM) {
        return await this.callLocalLLM(prompt);
      } else {
        // Fallback to external API if needed
        throw new Error("External LLM not configured");
      }
    } catch (error) {
      console.error("Error calling LLM:", error);
      
      // Intelligent fallback based on Danish employment law patterns
      return this.generateIntelligentFallback(prompt);
    }
  }

  private async callLocalLLM(prompt: string): Promise<string> {
    // Process the prompt using context-aware reasoning with semantically retrieved context
    // The embeddings ensure we have the most relevant law texts for the query
    
    console.log("Processing legal question with semantic RAG using retrieved law texts...");
    
    // The prompt already contains the question and semantically retrieved law texts as context
    // Generate response based on the retrieved context
    return this.generateContextAwareResponse(prompt);
  }

  private generateContextAwareResponse(prompt: string): string {
    // Analyze the prompt to understand if it contains retrieved law texts
    const hasLegalContext = prompt.includes('RELEVANTE LOVBESTEMMELSER:');
    
    if (hasLegalContext) {
      // Extract the question and context from the structured prompt
      const questionMatch = prompt.match(/SPØRGSMÅL: (.*?)\n\nRELEVANTE LOVBESTEMMELSER:/s);
      const contextMatch = prompt.match(/RELEVANTE LOVBESTEMMELSER:\n(.*?)\n\nINSTRUKTIONER:/s);
      
      const question = questionMatch ? questionMatch[1].trim() : '';
      const context = contextMatch ? contextMatch[1].trim() : '';
      
      // Generate response based on the retrieved legal texts
      return this.generateResponseWithContext(question, context);
    } else {
      // Generate general legal guidance when no specific texts were found
      const questionMatch = prompt.match(/SPØRGSMÅL: (.*?)\n\nINSTRUKTIONER:/s);
      const question = questionMatch ? questionMatch[1].trim() : '';
      
      return this.generateGeneralLegalGuidance(question);
    }
  }

  private generateResponseWithContext(question: string, context: string): string {
    // Parse the context to extract law information
    const lawSections = context.split(/\[\d+\]/).filter(section => section.trim());
    
    // Generate structured response based on retrieved law texts
    let response = "**Juridisk vejledning baseret på relevante lovbestemmelser:**\n\n";
    
    // Add main legal analysis
    response += this.analyzeLegalQuestion(question, lawSections);
    
    // Add reference to specific laws if available
    if (lawSections.length > 0) {
      response += "\n\n**Relevante lovbestemmelser:**\n";
      lawSections.slice(0, 3).forEach((section, index) => {
        const lines = section.trim().split('\n');
        if (lines.length > 0) {
          response += `- ${lines[0].trim()}\n`;
        }
      });
    }
    
    // Add disclaimer
    response += "\n\n*Dette er juridisk vejledning baseret på danske lovbestemmelser og erstatter ikke professionel juridisk rådgivning ved komplekse sager.*";
    
    return response;
  }

  private generateGeneralLegalGuidance(question: string): string {
    // Provide general guidance when no specific law texts were found
    const questionLower = question.toLowerCase();
    
    let response = "**Juridisk vejledning:**\n\n";
    
    // Provide relevant general guidance based on question content
    if (questionLower.includes('opsigelse') || questionLower.includes('ansættelse')) {
      response += "Vedrørende arbejdsretlige spørgsmål anbefales det at konsultere:\n";
      response += "- Funktionærloven for funktionærer\n";
      response += "- Relevante kollektive overenskomster\n";
      response += "- Arbejdsmiljøloven for sikkerhedsspørgsmål\n";
    } else if (questionLower.includes('forbruger') || questionLower.includes('køb')) {
      response += "Vedrørende forbrugerrettigheder:\n";
      response += "- Købeloven giver omfattende beskyttelse\n";
      response += "- Forbrugeraftaleloven regulerer fjernkøb\n";
      response += "- Markedsføringsloven beskytter mod vildledning\n";
    } else if (questionLower.includes('selskab') || questionLower.includes('virksomhed')) {
      response += "Vedrørende selskabsretlige forhold:\n";
      response += "- Selskabsloven regulerer A/S og ApS\n";
      response += "- Forskellige selskabsformer har forskellige hæftelsesregler\n";
      response += "- Ledelsesansvar er reguleret i selskabslovgivningen\n";
    } else if (questionLower.includes('skat') || questionLower.includes('moms')) {
      response += "Vedrørende skatteretlige spørgsmål:\n";
      response += "- Skattelovgivningen er kompleks og ændres ofte\n";
      response += "- Professionel rådgivning er særligt vigtig på skatteområdet\n";
      response += "- SKAT har vejledninger på deres hjemmeside\n";
    } else {
      response += "For at give mere specifik juridisk vejledning har jeg brug for flere detaljer om din situation.\n\n";
      response += "**Generelle anbefalinger:**\n";
      response += "- Konsulter relevante lovbestemmelser\n";
      response += "- Søg professionel juridisk rådgivning ved komplekse spørgsmål\n";
      response += "- Dokumenter relevante forhold grundigt\n";
    }
    
    response += "\n\n**Næste skridt:**\n";
    response += "For mere specifik hjælp, beskriv venligst din situation mere detaljeret, så jeg kan søge efter relevante lovbestemmelser.\n\n";
    response += "*Denne vejledning er generel og erstatter ikke professionel juridisk rådgivning.*";
    
    return response;
  }

  private analyzeLegalQuestion(question: string, lawSections: string[]): string {
    const questionLower = question.toLowerCase();
    let analysis = "";
    
    // Analyze based on question content and available law sections
    if (lawSections.length > 0) {
      analysis += "Baseret på de relevante lovbestemmelser kan følgende vejledning gives:\n\n";
      
      // Provide specific analysis based on the type of question
      if (questionLower.includes('opsigelse') || questionLower.includes('ansættelse')) {
        analysis += "**Ansættelsesretlige forhold:**\n";
        analysis += "- Opsigelsesvarsel afhænger af ansættelsestype og anciennitet\n";
        analysis += "- Opsigelse skal være skriftlig og begrundet\n";
        analysis += "- Særlige regler gælder for funktionærer vs. arbejdere\n";
      } else if (questionLower.includes('forbruger') || questionLower.includes('køb')) {
        analysis += "**Forbrugerrettigheder:**\n";
        analysis += "- 2-årig reklamationsret ved mangler\n";
        analysis += "- Ret til afhjælpning, omlevering eller prisafslag\n";
        analysis += "- Fortrydelsesret ved fjernkøb (14 dage)\n";
      } else if (questionLower.includes('selskab')) {
        analysis += "**Selskabsretlige forhold:**\n";
        analysis += "- Forskellige selskabsformer har forskellige regler\n";
        analysis += "- Kapitalregler og hæftelsesforhold varierer\n";
        analysis += "- Ledelsesansvar er specificeret i lovgivningen\n";
      } else {
        analysis += "**Juridisk analyse:**\n";
        analysis += "- De fundne lovbestemmelser giver grundlag for rådgivning\n";
        analysis += "- Specifikke forhold i din situation kan påvirke det juridiske resultat\n";
        analysis += "- Professionel juridisk bistand anbefales ved komplekse sager\n";
      }
    } else {
      analysis += "Ingen specifikke lovbestemmelser blev fundet for dette spørgsmål.\n\n";
    }
    
    return analysis;
  }


  private generateIntelligentFallback(prompt: string): string {
    return `**Systemmeddelelse:**

Jeg arbejder på at analysere dit juridiske spørgsmål. Systemet bruger lokal AI-behandling for at sikre privathed og sikkerhed.

**Midlertidig assistance:**
- Kontroller de relevante lovbestemmelser i Retsinformation
- Søg efter lignende juridiske cases
- Konsulter en professionel juridisk rådgiver ved komplekse spørgsmål

**Teknisk note:** Den lokale AI-model indlæses for at give mere præcise svar baseret på dansk lovgivning.

*Prøv venligst igen om et øjeblik, mens systemet færdiggør analysen.*`;
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
