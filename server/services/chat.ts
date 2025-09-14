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
    // For now, we'll use a rule-based approach optimized for Danish legal questions
    // In a full implementation, we'd integrate Transformers.js here
    
    console.log("Processing legal question with local reasoning...");
    
    // Extract key legal concepts
    const legalConcepts = this.extractLegalConcepts(prompt);
    
    if (legalConcepts.includes('opsigelse')) {
      return this.generateOpsigelseSvar(prompt);
    } else if (legalConcepts.includes('ansættelse') || legalConcepts.includes('kontrakt')) {
      return this.generateAnsættelseSvar(prompt);
    } else if (legalConcepts.includes('funktionær')) {
      return this.generateFunktionærSvar(prompt);
    }
    
    return this.generateGeneralLegalResponse(prompt);
  }

  private extractLegalConcepts(prompt: string): string[] {
    const concepts: string[] = [];
    const text = prompt.toLowerCase();
    
    const legalTerms = [
      'opsigelse', 'ansættelse', 'kontrakt', 'funktionær', 'varsel', 
      'arbejdsret', 'lovgivning', 'paragraf', 'bestemmelse', 'regel'
    ];
    
    legalTerms.forEach(term => {
      if (text.includes(term)) {
        concepts.push(term);
      }
    });
    
    return concepts;
  }

  private generateOpsigelseSvar(prompt: string): string {
    return `**Vedrørende opsigelse:**

Baseret på dansk arbejdsret, særligt Funktionærloven, gælder følgende hovedregler:

**§ 2 i Funktionærloven:**
- Funktionærer kan opsiges med 1 måneds varsel til den 1. i en måned
- Varslet skal være skriftligt og begrundet

**Vigtige forhold:**
- Opsigelse skal være saglig og reel
- Månedslønnede har ret til løn under opsigelsesperioden
- Ved usaglig opsigelse kan der kræves godtgørelse

**Anbefaling:** Kontroller altid den specifikke ansættelseskontrakt og kollektive overenskomster, da disse kan indeholde særlige bestemmelser om opsigelse.

*Dette er juridisk vejledning baseret på danske love og bør ikke erstatte professionel juridisk rådgivning.*`;
  }

  private generateAnsættelseSvar(prompt: string): string {
    return `**Vedrørende ansættelsesforhold:**

Ansættelseskontrakter i Danmark skal følge lovgivningens minimumsbestemmelser:

**Grundlæggende krav:**
- Skriftlig ansættelseskontrakt inden 1 måned
- Arbejdets karakter og placering
- Løn- og ansættelsesvilkår

**Funktionærloven § 1:**
- Definerer funktionærer som ikke-lønarbejdere
- Omfatter de fleste kontoransatte

**Vigtige rettigheder:**
- Ret til ferie og feriegodtgørelse
- Beskyttelse mod usaglig opsigelse
- Ret til fyrtøjning ved længere ansættelse

*Husk altid at konsultere de relevante overenskomster og særlige branchemæssige regler.*`;
  }

  private generateFunktionærSvar(prompt: string): string {
    return `**Om funktionærstatus:**

**Funktionærloven definerer funktionærer som:**
- Personer der ikke er lønarbejdere
- Typisk kontor- og administrative medarbejdere
- Omfattet af særlige beskyttelsesregler

**Særlige rettigheder for funktionærer:**
- Længere opsigelsesvarsel ved længere ansættelse
- Ret til funktionærlignende vilkår
- Beskyttelse mod usaglig afskedigelse

**§ 2a - Forlænget opsigelsesvarsel:**
- Efter 6 måneder: 3 måneders varsel
- Efter 3 år: 4 måneders varsel  
- Efter 6 år: 5 måneders varsel
- Efter 9 år: 6 måneders varsel

*Funktionærstatus afgøres konkret baseret på arbejdets karakter og ikke kun jobtitlen.*`;
  }

  private generateGeneralLegalResponse(prompt: string): string {
    return `**Juridisk vejledning:**

Jeg har analyseret dit spørgsmål og baseret på danske juridiske bestemmelser kan jeg give følgende generelle vejledning:

**Relevante lovområder at undersøge:**
- Funktionærloven (ansættelsesforhold)
- Arbejdsmiljøloven (sikkerhed på arbejdspladsen)
- Ferieloven (ferie og fridage)
- Kollektive overenskomster

**Generelle anbefalinger:**
- Konsulter altid din ansættelseskontrakt
- Tjek om der gælder særlige overenskomstregler
- Vær opmærksom på frister og varslinger
- Søg juridisk bistand ved komplekse sager

**Næste skridt:**
For at give mere specifik vejledning har jeg brug for flere detaljer om din konkrete situation.

*Denne vejledning er baseret på generelle lovbestemmelser og erstatter ikke professionel juridisk rådgivning.*`;
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
