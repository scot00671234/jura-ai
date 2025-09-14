import { pipeline, env } from "@xenova/transformers";
import { storage } from "../storage";
import { type InsertTextEmbedding } from "@shared/schema";

// Allow remote models for development/testing
env.allowRemoteModels = true;

export class EmbeddingsService {
  private model: any = null;
  private modelName = "Xenova/all-MiniLM-L6-v2";

  async initialize(): Promise<void> {
    if (!this.model) {
      console.log("Loading embeddings model...");
      this.model = await pipeline("feature-extraction", this.modelName);
      console.log("Embeddings model loaded successfully");
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    await this.initialize();
    
    // Clean and prepare text
    const cleanedText = text.replace(/\s+/g, " ").trim();
    
    // Generate embedding
    const result = await this.model(cleanedText, { pooling: "mean", normalize: true });
    
    // Convert tensor to array
    return Array.from(result.data);
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    
    for (const text of texts) {
      const embedding = await this.generateEmbedding(text);
      embeddings.push(embedding);
    }
    
    return embeddings;
  }

  async processLawTextsEmbeddings(batchSize: number = 10): Promise<void> {
    console.log("Starting embeddings generation for law texts...");
    
    const lawTexts = await storage.getLawTexts();
    console.log(`Found ${lawTexts.length} law texts to process`);

    let processed = 0;
    for (let i = 0; i < lawTexts.length; i += batchSize) {
      const batch = lawTexts.slice(i, i + batchSize);
      
      for (const lawText of batch) {
        try {
          // Check if embedding already exists
          const existingEmbeddings = await storage.searchSimilarTexts([], [], 1);
          const hasEmbedding = existingEmbeddings.some(e => e.id === lawText.id);
          
          if (hasEmbedding) {
            console.log(`Embedding already exists for law text: ${lawText.title}`);
            continue;
          }

          // Prepare text for embedding - combine title, section info, and content
          const textForEmbedding = [
            lawText.title,
            lawText.lawNumber || "",
            lawText.chapter || "",
            lawText.section || "",
            lawText.paragraph || "",
            lawText.content.substring(0, 1000), // Limit content length
          ].filter(Boolean).join(" ");

          const embedding = await this.generateEmbedding(textForEmbedding);
          
          const embeddingData: InsertTextEmbedding = {
            lawTextId: lawText.id,
            embedding,
          };

          await storage.createTextEmbedding(embeddingData);
          processed++;
          
          console.log(`Generated embedding for: ${lawText.title} (${processed}/${lawTexts.length})`);
          
        } catch (error) {
          console.error(`Error generating embedding for law text ${lawText.id}:`, error);
        }
      }
      
      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`Embeddings generation completed. Processed ${processed} law texts.`);
  }

  async searchSimilarLawTexts(
    query: string, 
    domainIds?: string[], 
    limit: number = 10
  ): Promise<Array<any>> {
    const queryEmbedding = await this.generateEmbedding(query);
    return await storage.searchSimilarTexts(queryEmbedding, domainIds, limit);
  }

  async updateEmbeddingForLawText(lawTextId: string): Promise<void> {
    const lawText = await storage.getLawTextById(lawTextId);
    if (!lawText) {
      throw new Error(`Law text with ID ${lawTextId} not found`);
    }

    const textForEmbedding = [
      lawText.title,
      lawText.lawNumber || "",
      lawText.chapter || "",
      lawText.section || "",
      lawText.paragraph || "",
      lawText.content.substring(0, 1000),
    ].filter(Boolean).join(" ");

    const embedding = await this.generateEmbedding(textForEmbedding);
    
    const embeddingData: InsertTextEmbedding = {
      lawTextId: lawText.id,
      embedding,
    };

    await storage.createTextEmbedding(embeddingData);
    console.log(`Updated embedding for law text: ${lawText.title}`);
  }
}

export const embeddingsService = new EmbeddingsService();
