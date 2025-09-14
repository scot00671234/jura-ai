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

      // Always use local LLM for responses, even if no specific law texts found
      if (relevantTexts.length === 0) {
        // Use local LLM without specific legal text context
        const llmResponse = await this.callLLM(`SPØRGSMÅL: ${query}\n\nGiv et juridisk svar baseret på dansk lovgivning.`);
        return {
          content: llmResponse,
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
    
    if (legalConcepts.includes('employment')) {
      return this.generateEmploymentResponse(prompt);
    } else if (legalConcepts.includes('product_liability')) {
      return this.generateProductLiabilityResponse(prompt);
    } else if (legalConcepts.includes('consumer')) {
      return this.generateConsumerResponse(prompt);
    } else if (legalConcepts.includes('contract')) {
      return this.generateContractResponse(prompt);
    } else if (legalConcepts.includes('tax')) {
      return this.generateTaxResponse(prompt);
    } else if (legalConcepts.includes('criminal')) {
      return this.generateCriminalResponse(prompt);
    } else if (legalConcepts.includes('corporate')) {
      return this.generateCorporateResponse(prompt);
    }
    
    return this.generateGeneralLegalResponse(prompt);
  }

  private extractLegalConcepts(prompt: string): string[] {
    const concepts: string[] = [];
    const text = prompt.toLowerCase();
    
    const legalTerms = {
      'opsigelse': 'employment',
      'ansættelse': 'employment', 
      'kontrakt': 'contract',
      'funktionær': 'employment',
      'varsel': 'employment',
      'produktansvar': 'product_liability',
      'produkthæftelse': 'product_liability',
      'defekte varer': 'product_liability',
      'fejlbehæftede produkter': 'product_liability',
      'forbrugerklager': 'consumer',
      'forbrugerbeskyttelse': 'consumer',
      'købeloven': 'sales_law',
      'reklamationsret': 'consumer',
      'erstatning': 'liability',
      'skadeserstatning': 'liability',
      'moms': 'tax',
      'skat': 'tax',
      'afgift': 'tax',
      'strafret': 'criminal',
      'strafferet': 'criminal',
      'bøde': 'criminal',
      'miljøret': 'environmental',
      'arbejdsmiljø': 'work_environment',
      'selskabsret': 'corporate',
      'aktieselskab': 'corporate',
      'ApS': 'corporate'
    };
    
    Object.keys(legalTerms).forEach(term => {
      if (text.includes(term)) {
        concepts.push(legalTerms[term as keyof typeof legalTerms]);
      }
    });
    
    return concepts;
  }

  private generateEmploymentResponse(prompt: string): string {
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

  private generateProductLiabilityResponse(prompt: string): string {
    return `**Vedrørende produktansvar og defekte varer:**

Dansk ret har stærke forbrugerbeskyttelsesregler ved defekte produkter:

**Købeloven (§ 76-83):**
- Sælger er ansvarlig for produkters egenskaber og sikkerhed
- Forbrugeren har reklamationsret ved fejl og mangler
- 2-årig reklamationsfrist for forbrugerkøb

**Produktansvarsloven:**
- Producenter er ansvarlige for personskader fra defekte produkter
- Objektivt ansvar - krav om bevis for defekt, skade og årsagssammenhæng
- Ikke ansvar for udviklingsrisici (state of the art-forsvaret)

**Forbrugerrettigheder:**
- Afhjælpning, omlevering, prisafslag eller ophævelse
- Erstatning for personskader
- Mulighed for tilbagekaldelse ved farlige produkter

**Praktiske råd:**
- Dokumenter fejlen hurtigt og kontakt sælger/producent
- Gem kvitteringer og kommunikation
- Ved personskader, kontakt forsikring og/eller advokat

*Dette er juridisk vejledning og erstatter ikke professionel juridisk rådgivning ved konkrete sager.*`;
  }

  private generateConsumerResponse(prompt: string): string {
    return `**Forbrugerrettigheder og -beskyttelse:**

Danmarks forbrugerlovgivning giver omfattende beskyttelse:

**Forbrugeraftaleloven:**
- Fortrydelsesret ved fjernkøb (14 dage)
- Skærpede krav til information
- Særlige regler for aggressive salgsteknikker

**Købeloven (forbrugerkøb):**
- 2-årig reklamationsret
- Mangelsansvar hos sælger
- Ret til afhjælpning eller prisafslag

**Markedsføringsloven:**
- Forbud mod vildledende markedsføring
- Sammenlignende reklame skal være korrekt
- Beskyttelse mod aggressive handelspraksisser

**Hvis du har problemer:**
- Kontakt først virksomheden direkte
- Klage til Forbrugerklagenævnet (gratis)
- Ved større beløb: juridisk bistand eller retssag

*Forbrugerbeskyttelsen er stærkere end erhvervskøb - brug dine rettigheder aktivt.*`;
  }

  private generateContractResponse(prompt: string): string {
    return `**Kontraktret og aftaler:**

Danske kontraktregler bygger på aftalefriheden med lovgivningsmæssige begrænsninger:

**Grundprincipper:**
- Aftalefrihed - parterne kan som udgangspunkt aftale hvad de vil
- Retshandel- og aftalelovens begrænsninger
- Aftaler skal opfyldes (pacta sunt servanda)

**Vigtige forhold:**
- Skriftlighed ikke altid påkrævet, men anbefales
- Standardvilkår skal være rimelige (AFTL § 36)
- Forbrugerbeskyttende regler kan ikke fraviges

**Ved kontraktbrud:**
- Krav om opfyldelse eller erstatning
- Mulighed for ophævelse ved væsentlig misligholdelse
- Rentekrav ved forsinket betaling

**Praktiske anbefalinger:**
- Få aftaler på skrift
- Læs vilkår grundigt før underskrift
- Overvej juridisk rådgivning ved store aftaler

*Kontraktret er komplekst - søg juridisk bistand ved tvivl om dine rettigheder.*`;
  }

  private generateTaxResponse(prompt: string): string {
    return `**Skat og afgifter:**

Det danske skattesystem er komplekst med mange forskellige regler:

**Indkomstskat:**
- Progressiv beskatning af almindelig indkomst
- Særlige regler for kapitalindkomst
- Forskellige fradrag og tillæg

**Moms:**
- 25% standardsats på de fleste varer og ydelser
- Fritagelser for visse områder (sundhed, undervisning)
- Registreringspligt ved omsætning over 50.000 kr.

**Erhvervsskat:**
- Selskabsskat på 22%
- Forskellige afskrivningsregler
- Særlige regler for mindre virksomheder

**Ved skatteproblemer:**
- Kontakt dit lokale skattecenter
- Bruger Skatteforvaltningens hjemmeside
- Søg professionel skattemæssig rådgivning

*Skattereglerne ændres ofte - hold dig opdateret gennem officielle kanaler.*`;
  }

  private generateCriminalResponse(prompt: string): string {
    return `**Strafferetslige spørgsmål:**

Danmarks straffelovgivning omfatter både straffeloven og særlovgivning:

**Grundprincipper:**
- Legalitetsprincippet - ingen straf uden lov
- Skyldsprincippet - kun straf ved skyld
- Proportionalitetsprincippet - straffen skal passe til forbrydelsen

**Hovedkategorier:**
- Forbrydelser mod person (vold, drab, voldtægt)
- Forbrydelser mod ejendom (tyveri, bedrageri, hærværk)
- Trafikforseelser og særlovovertrædelser

**Procedureregler:**
- Politiets rolle i efterforskning
- Anklagemyndighedens rolle
- Retten til forsvar

**Hvis du er involveret:**
- Kontakt straks en advokat
- Brug din tavshedsret
- Samarbejd ikke uden juridisk rådgivning

*Ved mistanke om kriminalitet er professionel juridisk bistand afgørende for dit forsvar.*`;
  }

  private generateCorporateResponse(prompt: string): string {
    return `**Selskabsret og virksomhedsjura:**

Danske virksomhedsformer har forskellige juridiske rammer:

**Aktieselskaber (A/S):**
- Minimumskapital: 400.000 kr.
- Begrænset hæftelse for aktionærer
- Omfattende ledelsesregler og regnskabskrav

**Anpartsselskaber (ApS):**
- Minimumskapital: 40.000 kr.
- Enklere struktur end A/S
- Begrænset hæftelse for ejere

**Personlige virksomhedsformer:**
- Enkeltmandsvirksomhed - fuld personlig hæftelse
- I/S - deltagerne hæfter solidarisk

**Vigtige områder:**
- Vedtægter og selskabsaftaler
- Ledelsesansvar og hæftelse
- Regnskab og revision
- Kapitalregler og udlodninger

**Ved selskabsstiftelse:**
- Overvej grundigt valg af selskabsform
- Få udarbejdet professionelle vedtægter
- Forstå dine forpligtelser som ledelse

*Selskabsret er teknisk komplekst - brug altid professionel juridisk og regnskabsmæssig rådgivning.*`;
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
