import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, vector, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Legal domains/categories
export const legalDomains = pgTable("legal_domains", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
});

// Law texts from Retsinformation API
export const lawTexts = pgTable("law_texts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  lawNumber: text("law_number"),
  chapter: text("chapter"),
  section: text("section"),
  paragraph: text("paragraph"),
  content: text("content").notNull(),
  domainId: varchar("domain_id").references(() => legalDomains.id),
  sourceUrl: text("source_url"),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  retsinformationId: text("retsinformation_id").unique(),
}, (table) => ({
  retsinformationIdx: index("retsinformation_idx").on(table.retsinformationId),
  domainIdx: index("domain_idx").on(table.domainId),
}));

// Text embeddings for semantic search
export const textEmbeddings = pgTable("text_embeddings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lawTextId: varchar("law_text_id").references(() => lawTexts.id).notNull(),
  embedding: vector("embedding", { dimensions: 384 }).notNull(), // Using sentence-transformers/all-MiniLM-L6-v2
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  lawTextIdx: index("law_text_idx").on(table.lawTextId),
  embeddingIdx: index("embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
}));

// Chat sessions
export const chatSessions = pgTable("chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  title: text("title"),
  selectedDomains: jsonb("selected_domains").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Chat messages
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => chatSessions.id).notNull(),
  role: text("role").$type<"user" | "assistant">().notNull(),
  content: text("content").notNull(),
  citations: jsonb("citations").$type<Array<{
    lawTextId: string;
    relevanceScore: number;
    snippet: string;
  }>>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  sessionIdx: index("session_idx").on(table.sessionId),
}));

// Relations
export const legalDomainsRelations = relations(legalDomains, ({ many }) => ({
  lawTexts: many(lawTexts),
}));

export const lawTextsRelations = relations(lawTexts, ({ one, many }) => ({
  domain: one(legalDomains, {
    fields: [lawTexts.domainId],
    references: [legalDomains.id],
  }),
  embeddings: many(textEmbeddings),
}));

export const textEmbeddingsRelations = relations(textEmbeddings, ({ one }) => ({
  lawText: one(lawTexts, {
    fields: [textEmbeddings.lawTextId],
    references: [lawTexts.id],
  }),
}));

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [chatSessions.userId],
    references: [users.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertLegalDomainSchema = createInsertSchema(legalDomains).omit({ id: true });
export const insertLawTextSchema = createInsertSchema(lawTexts).omit({ id: true, lastUpdated: true });
export const insertTextEmbeddingSchema = createInsertSchema(textEmbeddings).omit({ id: true, createdAt: true });
export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true });

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertLegalDomain = z.infer<typeof insertLegalDomainSchema>;
export type LegalDomain = typeof legalDomains.$inferSelect;
export type InsertLawText = z.infer<typeof insertLawTextSchema>;
export type LawText = typeof lawTexts.$inferSelect;
export type InsertTextEmbedding = z.infer<typeof insertTextEmbeddingSchema>;
export type TextEmbedding = typeof textEmbeddings.$inferSelect;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// Extended types for API responses
export type LawTextWithDomain = LawText & { domain: LegalDomain | null };
export type ChatMessageWithCitations = ChatMessage & {
  citedLawTexts?: Array<LawTextWithDomain & { relevanceScore: number; snippet: string }>;
};
export type ChatSessionWithMessages = ChatSession & { messages: ChatMessageWithCitations[] };
