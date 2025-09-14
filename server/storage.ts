import {
  users, legalDomains, lawTexts, textEmbeddings, chatSessions, chatMessages,
  type User, type InsertUser, type LegalDomain, type InsertLegalDomain,
  type LawText, type InsertLawText, type LawTextWithDomain,
  type TextEmbedding, type InsertTextEmbedding,
  type ChatSession, type InsertChatSession, type ChatSessionWithMessages,
  type ChatMessage, type InsertChatMessage, type ChatMessageWithCitations
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, cosineDistance, inArray } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Legal Domains
  getLegalDomains(): Promise<LegalDomain[]>;
  createLegalDomain(domain: InsertLegalDomain): Promise<LegalDomain>;
  updateLegalDomain(id: string, domain: Partial<InsertLegalDomain>): Promise<LegalDomain | undefined>;

  // Law Texts
  getLawTexts(domainIds?: string[]): Promise<LawTextWithDomain[]>;
  getLawTextById(id: string): Promise<LawTextWithDomain | undefined>;
  createLawText(lawText: InsertLawText): Promise<LawText>;
  updateLawText(id: string, lawText: Partial<InsertLawText>): Promise<LawText | undefined>;
  getLawTextByRetsinformationId(retsinformationId: string): Promise<LawText | undefined>;

  // Text Embeddings
  createTextEmbedding(embedding: InsertTextEmbedding): Promise<TextEmbedding>;
  searchSimilarTexts(queryEmbedding: number[], domainIds?: string[], limit?: number): Promise<Array<LawTextWithDomain & { similarity: number }>>;

  // Chat Sessions
  getChatSessions(userId?: string): Promise<ChatSession[]>;
  getChatSessionById(id: string): Promise<ChatSessionWithMessages | undefined>;
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  updateChatSession(id: string, session: Partial<InsertChatSession>): Promise<ChatSession | undefined>;

  // Chat Messages
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(sessionId: string): Promise<ChatMessageWithCitations[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Legal Domains
  async getLegalDomains(): Promise<LegalDomain[]> {
    try {
      const result = await db.select().from(legalDomains).orderBy(legalDomains.name);
      return result;
    } catch (error) {
      console.error("Database error in getLegalDomains:", error);
      // Return empty array if database is not available instead of throwing
      if (error instanceof Error && error.message.includes('certificate')) {
        console.warn("Database connection failed due to SSL certificate issues. Returning empty array.");
        return [];
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to fetch legal domains from database: ${errorMessage}`);
    }
  }

  async createLegalDomain(domain: InsertLegalDomain): Promise<LegalDomain> {
    const [newDomain] = await db.insert(legalDomains).values(domain).returning();
    return newDomain;
  }

  async updateLegalDomain(id: string, domain: Partial<InsertLegalDomain>): Promise<LegalDomain | undefined> {
    const [updated] = await db.update(legalDomains)
      .set(domain)
      .where(eq(legalDomains.id, id))
      .returning();
    return updated || undefined;
  }

  // Law Texts
  async getLawTexts(domainIds?: string[]): Promise<LawTextWithDomain[]> {
    const query = db.select({
      id: lawTexts.id,
      title: lawTexts.title,
      lawNumber: lawTexts.lawNumber,
      chapter: lawTexts.chapter,
      section: lawTexts.section,
      paragraph: lawTexts.paragraph,
      content: lawTexts.content,
      domainId: lawTexts.domainId,
      sourceUrl: lawTexts.sourceUrl,
      lastUpdated: lawTexts.lastUpdated,
      retsinformationId: lawTexts.retsinformationId,
      domain: legalDomains,
    })
    .from(lawTexts)
    .leftJoin(legalDomains, eq(lawTexts.domainId, legalDomains.id));

    if (domainIds && domainIds.length > 0) {
      return await query.where(inArray(lawTexts.domainId, domainIds));
    }

    return await query;
  }

  async getLawTextById(id: string): Promise<LawTextWithDomain | undefined> {
    const [result] = await db.select({
      id: lawTexts.id,
      title: lawTexts.title,
      lawNumber: lawTexts.lawNumber,
      chapter: lawTexts.chapter,
      section: lawTexts.section,
      paragraph: lawTexts.paragraph,
      content: lawTexts.content,
      domainId: lawTexts.domainId,
      sourceUrl: lawTexts.sourceUrl,
      lastUpdated: lawTexts.lastUpdated,
      retsinformationId: lawTexts.retsinformationId,
      domain: legalDomains,
    })
    .from(lawTexts)
    .leftJoin(legalDomains, eq(lawTexts.domainId, legalDomains.id))
    .where(eq(lawTexts.id, id));

    return result || undefined;
  }

  async createLawText(lawText: InsertLawText): Promise<LawText> {
    const [newLawText] = await db.insert(lawTexts).values(lawText).returning();
    return newLawText;
  }

  async updateLawText(id: string, lawText: Partial<InsertLawText>): Promise<LawText | undefined> {
    const [updated] = await db.update(lawTexts)
      .set({ ...lawText, lastUpdated: new Date() })
      .where(eq(lawTexts.id, id))
      .returning();
    return updated || undefined;
  }

  async getLawTextByRetsinformationId(retsinformationId: string): Promise<LawText | undefined> {
    const [result] = await db.select().from(lawTexts)
      .where(eq(lawTexts.retsinformationId, retsinformationId));
    return result || undefined;
  }

  // Text Embeddings
  async createTextEmbedding(embedding: InsertTextEmbedding): Promise<TextEmbedding> {
    const [newEmbedding] = await db.insert(textEmbeddings).values(embedding).returning();
    return newEmbedding;
  }

  async searchSimilarTexts(
    queryEmbedding: number[],
    domainIds?: string[],
    limit: number = 10
  ): Promise<Array<LawTextWithDomain & { similarity: number }>> {
    const embeddingVector = `[${queryEmbedding.join(',')}]`;

    const baseQuery = db.select({
      id: lawTexts.id,
      title: lawTexts.title,
      lawNumber: lawTexts.lawNumber,
      chapter: lawTexts.chapter,
      section: lawTexts.section,
      paragraph: lawTexts.paragraph,
      content: lawTexts.content,
      domainId: lawTexts.domainId,
      sourceUrl: lawTexts.sourceUrl,
      lastUpdated: lawTexts.lastUpdated,
      retsinformationId: lawTexts.retsinformationId,
      domain: legalDomains,
      similarity: sql<number>`1 - (${textEmbeddings.embedding} <=> ${embeddingVector}::vector)`,
    })
    .from(textEmbeddings)
    .innerJoin(lawTexts, eq(textEmbeddings.lawTextId, lawTexts.id))
    .leftJoin(legalDomains, eq(lawTexts.domainId, legalDomains.id));

    const whereClause = domainIds && domainIds.length > 0
      ? inArray(lawTexts.domainId, domainIds)
      : undefined;

    const query = whereClause ? baseQuery.where(whereClause) : baseQuery;

    return await query
      .orderBy(sql`${textEmbeddings.embedding} <=> ${embeddingVector}::vector`)
      .limit(limit);
  }

  // Chat Sessions
  async getChatSessions(userId?: string): Promise<ChatSession[]> {
    try {
      if (userId) {
        return await db.select().from(chatSessions)
          .where(eq(chatSessions.userId, userId))
          .orderBy(desc(chatSessions.updatedAt));
      }

      return await db.select().from(chatSessions)
        .orderBy(desc(chatSessions.updatedAt));
    } catch (error) {
      console.error("Database error in getChatSessions:", error);
      // Return empty array if database is not available instead of throwing
      if (error instanceof Error && error.message.includes('certificate')) {
        console.warn("Database connection failed due to SSL certificate issues. Returning empty array.");
        return [];
      }
      throw new Error("Failed to fetch chat sessions from database");
    }
  }

  async getChatSessionById(id: string): Promise<ChatSessionWithMessages | undefined> {
    const [session] = await db.select().from(chatSessions).where(eq(chatSessions.id, id));

    if (!session) return undefined;

    const messages = await this.getChatMessages(id);

    return {
      ...session,
      messages,
    };
  }

  async createChatSession(data: InsertChatSession): Promise<ChatSession> {
    try {
      const [newSession] = await db.insert(chatSessions).values({
        title: data.title,
        userId: data.userId,
        selectedDomains: data.selectedDomains || [],
      }).returning();
      return newSession;
    } catch (error) {
      console.error("Database error in createChatSession:", error);
      // Provide more specific error handling for SSL issues
      if (error instanceof Error && error.message.includes('certificate')) {
        throw new Error("Database connection failed. Please check your database configuration.");
      }
      throw new Error("Failed to create chat session in database");
    }
  }

  async updateChatSession(id: string, session: Partial<InsertChatSession>): Promise<ChatSession | undefined> {
    const updateData: any = {
      updatedAt: new Date(),
    };
    if (session.title !== undefined) updateData.title = session.title;
    if (session.userId !== undefined) updateData.userId = session.userId;
    if (session.selectedDomains !== undefined) updateData.selectedDomains = session.selectedDomains;

    const [updated] = await db.update(chatSessions)
      .set(updateData)
      .where(eq(chatSessions.id, id))
      .returning();
    return updated || undefined;
  }

  // Chat Messages
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const citations = (message.citations ?? []) as Array<{
      lawTextId: string;
      relevanceScore: number;
      snippet: string;
    }>;
    const messageData: any = {
      sessionId: message.sessionId,
      role: message.role as "user" | "assistant",
      content: message.content,
      citations,
    };
    const [newMessage] = await db.insert(chatMessages).values(messageData).returning();
    return newMessage;
  }

  async getChatMessages(sessionId: string): Promise<ChatMessageWithCitations[]> {
    const messages = await db.select().from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.createdAt);

    const messagesWithCitations: ChatMessageWithCitations[] = [];

    for (const message of messages) {
      const citedLawTexts = [];

      const citations = (message.citations ?? []) as Array<{
        lawTextId: string;
        relevanceScore: number;
        snippet: string;
      }>;

      if (citations && Array.isArray(citations)) {
        for (const citation of citations) {
          const lawText = await this.getLawTextById(citation.lawTextId);
          if (lawText) {
            citedLawTexts.push({
              ...lawText,
              relevanceScore: citation.relevanceScore,
              snippet: citation.snippet,
            });
          }
        }
      }

      messagesWithCitations.push({
        ...message,
        citedLawTexts,
      });
    }

    return messagesWithCitations;
  }
}

export const storage = new DatabaseStorage();