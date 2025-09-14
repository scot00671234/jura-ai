import OpenAI from "openai";

/**
 * DeepSeek API integration using OpenAI SDK compatibility
 * DeepSeek provides better multilingual support and reasoning at lower cost
 */
export class DeepSeekService {
  private client: OpenAI;
  
  constructor() {
    // DeepSeek API is fully compatible with OpenAI SDK - just change the base URL
    this.client = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY || 'not-configured'
    });
  }

  /**
   * Generate a response using DeepSeek's reasoning model as a Danish legal expert
   */
  async generateLegalResponse(
    userQuery: string,
    legalContext?: string,
    conversationHistory?: Array<{role: "user" | "assistant", content: string}>
  ): Promise<string> {
    if (!process.env.DEEPSEEK_API_KEY) {
      throw new Error("DEEPSEEK_API_KEY not configured. Please add your DeepSeek API key to environment variables.");
    }

    // Prepare the system prompt for Danish legal expertise
    const systemPrompt = this.buildDanishLegalSystemPrompt();
    
    // Build the conversation messages
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt }
    ];

    // Add conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      // Only include last 6 messages to stay within context limits
      const recentHistory = conversationHistory.slice(-6);
      messages.push(...recentHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })));
    }

    // Build the user message with legal context if available
    let userMessage = userQuery;
    if (legalContext) {
      userMessage = `Brugerens spørgsmål: ${userQuery}

Relevante lovbestemmelser fundet via semantisk søgning:
${legalContext}

Besvar spørgsmålet som en dansk juridisk ekspert baseret på de angivne lovbestemmelser.`;
    }

    messages.push({ role: "user", content: userMessage });

    try {
      const completion = await this.client.chat.completions.create({
        model: "deepseek-reasoner", // Use reasoning model for complex legal analysis
        messages: messages,
        temperature: 0.3, // Lower temperature for more consistent legal advice
        max_tokens: 1500, // Reasonable length for legal responses
        // DeepSeek supports system messages and reasoning
      });

      const response = completion.choices[0]?.message?.content;
      
      if (!response) {
        throw new Error("No response generated from DeepSeek API");
      }

      return response;
    } catch (error: any) {
      console.error("Error calling DeepSeek API:", error);
      
      if (error.status === 401) {
        throw new Error("Invalid DeepSeek API key. Please check your DEEPSEEK_API_KEY environment variable.");
      } else if (error.status === 429) {
        throw new Error("DeepSeek rate limit exceeded. Please try again later.");
      } else if (error.status === 400) {
        throw new Error("Invalid request to DeepSeek API. Please check your input.");
      }
      
      throw new Error(`DeepSeek API error: ${error.message}`);
    }
  }

  /**
   * Simple chat completion for basic conversations
   */
  async simpleChat(message: string): Promise<string> {
    if (!process.env.DEEPSEEK_API_KEY) {
      return "DeepSeek API key ikke konfigureret. Tilføj venligst din API-nøgle for at aktivere AI-svar.";
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: "deepseek-chat", // Faster model for simple conversations
        messages: [
          { 
            role: "system", 
            content: "Du er en venlig dansk juridisk AI-assistent. Svar naturligt og hjælpsomt på dansk. Hold svarene korte og venlige til almindelige hilsner og småtalk." 
          },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 200
      });

      return completion.choices[0]?.message?.content || "Undskyld, jeg kunne ikke generere et svar.";
    } catch (error) {
      console.error("Error in simple chat:", error);
      return "Der opstod en fejl. Prøv venligst igen.";
    }
  }

  /**
   * Build the system prompt for Danish legal expertise
   */
  private buildDanishLegalSystemPrompt(): string {
    return `Du er en erfaren dansk juridisk ekspert og AI-assistent. Din opgave er at give præcis, pålidelig juridisk vejledning baseret på dansk lovgivning.

KOMPETENCER:
- Dyb forståelse af dansk lovgivning (alle retsområder)
- Evne til at forklare komplekse juridiske begreber i forståelige termer
- Erfaring med praktisk anvendelse af loven
- Kendskab til retspraksis og administrative praksisser

KOMMUNIKATIONSSTIL:
- Skriv på klart, professionelt dansk
- Vær præcis og konkret i dine svar
- Forklar juridiske termer når nødvendigt
- Struktur dine svar logisk og læsevenligt
- Vær hjælpsom men objektiv

SVARSTRUKTUR:
1. Direkte svar på spørgsmålet
2. Juridisk baggrund og relevante regler
3. Praktiske overvejelser eller næste skridt
4. Anbefalinger og advarsler hvor relevant

VIGTIGE RETNINGSLINJER:
- Basér altid svar på de angivne lovbestemmelser når de er tilgængelige
- Vær eksplicit om usikkerhed eller manglende information
- Anbefal professionel juridisk rådgivning ved komplekse sager
- Nævn relevante frister og procedurekrav
- Vær opmærksom på forskelle mellem retsområder

EKSEMPEL PÅ GOD KOMMUNIKATION:
Bruger: "Hej"
Assistent: "Hej! Jeg er din juridiske AI-assistent. Hvordan kan jeg hjælpe dig med juridiske spørgsmål i dag?"

Bruger: "Kan jeg opsige min medarbejder?"
Assistent: [Struktureret juridisk svar baseret på arbejdsret]

Husk: Du er en ekspert, men erstatter ikke personlig juridisk rådgivning i komplekse situationer.`;
  }

  /**
   * Check if DeepSeek API is properly configured
   */
  isConfigured(): boolean {
    return !!process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY !== 'not-configured';
  }

  /**
   * Get API status and configuration info
   */
  getStatus(): { configured: boolean; model: string; endpoint: string } {
    return {
      configured: this.isConfigured(),
      model: "deepseek-reasoner / deepseek-chat",
      endpoint: "https://api.deepseek.com"
    };
  }
}

export const deepSeekService = new DeepSeekService();