import { storage } from "../storage";
import { type InsertLawText, type InsertLegalDomain } from "@shared/schema";

interface RetsinformationDocument {
  id: string;
  title: string;
  law_number?: string;
  chapter?: string;
  section?: string;
  paragraph?: string;
  content: string;
  category?: string;
  source_url?: string;
  last_updated?: string;
}

interface RetsinformationResponse {
  documents: RetsinformationDocument[];
  total: number;
  page: number;
  per_page: number;
}

export class RetsinformationService {
  private baseUrl = "https://www.retsinformation.dk/api/v1";
  private apiKey = process.env.RETSINFORMATION_API_KEY || "";

  async fetchLawTexts(category?: string, page: number = 1, perPage: number = 100): Promise<RetsinformationResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    });

    if (category) {
      params.append("category", category);
    }

    const response = await fetch(`${this.baseUrl}/documents?${params}`, {
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Retsinformation API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  async fetchDocumentById(id: string): Promise<RetsinformationDocument> {
    const response = await fetch(`${this.baseUrl}/documents/${id}`, {
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Retsinformation API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  async syncLegalDomains(): Promise<void> {
    console.log("Syncing legal domains...");
    
    const defaultDomains = [
      { name: "Strafferet", description: "Straffelov og relaterede bestemmelser" },
      { name: "Civilret", description: "Civilretlige bestemmelser og kontrakter" },
      { name: "Arbejdsret", description: "Ansættelsesret og arbejdsforhold" },
      { name: "Skatteret", description: "Skattelovgivning og -bestemmelser" },
      { name: "Selskabsret", description: "Selskabslovgivning og -regulering" },
      { name: "Forvaltningsret", description: "Offentlig forvaltning og sagsbehandling" },
      { name: "Miljøret", description: "Miljølovgivning og -beskyttelse" },
      { name: "Socialret", description: "Social sikring og velfærd" },
    ];

    for (const domain of defaultDomains) {
      try {
        await storage.createLegalDomain(domain);
        console.log(`Created legal domain: ${domain.name}`);
      } catch (error) {
        console.log(`Legal domain ${domain.name} already exists or error occurred`);
      }
    }
  }

  async syncLawTexts(fullSync: boolean = false): Promise<void> {
    console.log("Starting law texts synchronization...");
    
    const domains = await storage.getLegalDomains();
    const categoryMap = new Map([
      ["Strafferet", "criminal"],
      ["Civilret", "civil"],
      ["Arbejdsret", "employment"],
      ["Skatteret", "tax"],
      ["Selskabsret", "corporate"],
      ["Forvaltningsret", "administrative"],
      ["Miljøret", "environmental"],
      ["Socialret", "social"],
    ]);

    for (const domain of domains) {
      const category = categoryMap.get(domain.name);
      if (!category) continue;

      console.log(`Syncing texts for domain: ${domain.name}`);
      
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        try {
          const response = await this.fetchLawTexts(category, page, 50);
          
          for (const doc of response.documents) {
            try {
              // Check if document already exists
              if (!fullSync) {
                const existing = await storage.getLawTextByRetsinformationId(doc.id);
                if (existing) {
                  console.log(`Document ${doc.id} already exists, skipping...`);
                  continue;
                }
              }

              const lawText: InsertLawText = {
                title: doc.title,
                lawNumber: doc.law_number || null,
                chapter: doc.chapter || null,
                section: doc.section || null,
                paragraph: doc.paragraph || null,
                content: doc.content,
                domainId: domain.id,
                sourceUrl: doc.source_url || null,
                retsinformationId: doc.id,
              };

              const created = await storage.createLawText(lawText);
              console.log(`Created law text: ${created.title} (${created.id})`);

            } catch (error) {
              console.error(`Error creating law text ${doc.id}:`, error);
            }
          }

          hasMore = response.documents.length === 50 && page < Math.ceil(response.total / 50);
          page++;

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          console.error(`Error fetching page ${page} for category ${category}:`, error);
          break;
        }
      }
    }

    console.log("Law texts synchronization completed");
  }

  async updateSpecificDocument(retsinformationId: string): Promise<void> {
    try {
      const doc = await this.fetchDocumentById(retsinformationId);
      const existing = await storage.getLawTextByRetsinformationId(retsinformationId);
      
      if (existing) {
        await storage.updateLawText(existing.id, {
          title: doc.title,
          lawNumber: doc.law_number || null,
          chapter: doc.chapter || null,
          section: doc.section || null,
          paragraph: doc.paragraph || null,
          content: doc.content,
          sourceUrl: doc.source_url || null,
        });
        console.log(`Updated law text: ${doc.title}`);
      } else {
        console.log(`Document ${retsinformationId} not found in database`);
      }
    } catch (error) {
      console.error(`Error updating document ${retsinformationId}:`, error);
    }
  }
}

export const retsinformationService = new RetsinformationService();
