import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { retsinformationService } from "./services/retsinformation";
import { embeddingsService } from "./services/embeddings";
import { chatService } from "./services/chat";
import { insertChatSessionSchema, insertChatMessageSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check
  app.get("/api/health", async (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Legal domains
  app.get("/api/legal-domains", async (req, res) => {
    try {
      const domains = await storage.getLegalDomains();
      res.json(domains);
    } catch (error) {
      console.error("Error fetching legal domains:", error);
      res.status(500).json({ error: "Failed to fetch legal domains" });
    }
  });

  // Law texts
  app.get("/api/law-texts", async (req, res) => {
    try {
      const domainIds = req.query.domainIds as string[];
      const lawTexts = await storage.getLawTexts(domainIds);
      res.json(lawTexts);
    } catch (error) {
      console.error("Error fetching law texts:", error);
      res.status(500).json({ error: "Failed to fetch law texts" });
    }
  });

  app.get("/api/law-texts/:id", async (req, res) => {
    try {
      const lawText = await storage.getLawTextById(req.params.id);
      if (!lawText) {
        return res.status(404).json({ error: "Law text not found" });
      }
      res.json(lawText);
    } catch (error) {
      console.error("Error fetching law text:", error);
      res.status(500).json({ error: "Failed to fetch law text" });
    }
  });

  // Search
  app.post("/api/search", async (req, res) => {
    try {
      const { query, domainIds, limit = 10 } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      const results = await embeddingsService.searchSimilarLawTexts(
        query,
        domainIds,
        limit
      );

      res.json(results);
    } catch (error) {
      console.error("Error performing search:", error);
      res.status(500).json({ error: "Search failed" });
    }
  });

  // Chat sessions
  app.get("/api/chat-sessions", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const sessions = await storage.getChatSessions(userId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching chat sessions:", error);
      res.status(500).json({ error: "Failed to fetch chat sessions" });
    }
  });

  app.get("/api/chat-sessions/:id", async (req, res) => {
    try {
      const session = await storage.getChatSessionById(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Chat session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error fetching chat session:", error);
      res.status(500).json({ error: "Failed to fetch chat session" });
    }
  });

  app.post("/api/chat-sessions", async (req, res) => {
    try {
      const validatedData = insertChatSessionSchema.parse(req.body);
      const session = await storage.createChatSession(validatedData);
      res.status(201).json(session);
    } catch (error) {
      console.error("Error creating chat session:", error);
      res.status(500).json({ error: "Failed to create chat session" });
    }
  });

  app.patch("/api/chat-sessions/:id", async (req, res) => {
    try {
      const updatedSession = await storage.updateChatSession(req.params.id, req.body);
      if (!updatedSession) {
        return res.status(404).json({ error: "Chat session not found" });
      }
      res.json(updatedSession);
    } catch (error) {
      console.error("Error updating chat session:", error);
      res.status(500).json({ error: "Failed to update chat session" });
    }
  });

  // Chat messages
  app.post("/api/chat-sessions/:sessionId/messages", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { message, domainIds } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const result = await chatService.processUserMessage(
        sessionId,
        message,
        domainIds
      );

      res.status(201).json(result);
    } catch (error) {
      console.error("Error processing chat message:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  app.get("/api/chat-sessions/:sessionId/messages", async (req, res) => {
    try {
      const messages = await storage.getChatMessages(req.params.sessionId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages/:messageId/regenerate", async (req, res) => {
    try {
      const { domainIds } = req.body;
      const regeneratedMessage = await chatService.regenerateResponse(
        req.params.messageId,
        domainIds
      );
      res.json(regeneratedMessage);
    } catch (error) {
      console.error("Error regenerating message:", error);
      res.status(500).json({ error: "Failed to regenerate message" });
    }
  });

  // Data management endpoints
  app.post("/api/admin/sync-domains", async (req, res) => {
    try {
      await retsinformationService.syncLegalDomains();
      res.json({ message: "Legal domains synced successfully" });
    } catch (error) {
      console.error("Error syncing legal domains:", error);
      res.status(500).json({ error: "Failed to sync legal domains" });
    }
  });

  app.post("/api/admin/sync-law-texts", async (req, res) => {
    try {
      const { fullSync = false } = req.body;
      await retsinformationService.syncLawTexts(fullSync);
      res.json({ message: "Law texts sync started" });
    } catch (error) {
      console.error("Error syncing law texts:", error);
      res.status(500).json({ error: "Failed to sync law texts" });
    }
  });

  app.post("/api/admin/generate-embeddings", async (req, res) => {
    try {
      const { batchSize = 10 } = req.body;
      await embeddingsService.processLawTextsEmbeddings(batchSize);
      res.json({ message: "Embeddings generation started" });
    } catch (error) {
      console.error("Error generating embeddings:", error);
      res.status(500).json({ error: "Failed to generate embeddings" });
    }
  });

  // Initialize embeddings service on startup
  embeddingsService.initialize().catch(console.error);

  const httpServer = createServer(app);
  return httpServer;
}
