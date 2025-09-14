import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { ChatSession, ChatMessageWithCitations } from "@shared/schema";

export function useChat(sessionId?: string) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(sessionId);

  const { data: currentSession, isLoading: sessionLoading } = useQuery({
    queryKey: ["/api/chat-sessions", currentSessionId],
    enabled: !!currentSessionId,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/chat-sessions", currentSessionId, "messages"],
    enabled: !!currentSessionId,
  });

  const createSessionMutation = useMutation({
    mutationFn: async (data: { title?: string; selectedDomains?: string[] }) => {
      const response = await apiRequest("POST", "/api/chat-sessions", data);
      return await response.json();
    },
    onSuccess: (newSession: ChatSession) => {
      setCurrentSessionId(newSession.id);
      setLocation(`/chat/${newSession.id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/chat-sessions"] });
    },
    onError: (error) => {
      toast({
        title: "Fejl",
        description: "Kunne ikke oprette ny chat session",
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, domainIds }: { message: string; domainIds?: string[] }) => {
      if (!currentSessionId) {
        throw new Error("No active session");
      }
      const response = await apiRequest("POST", `/api/chat-sessions/${currentSessionId}/messages`, {
        message,
        domainIds,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/chat-sessions", currentSessionId, "messages"] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/chat-sessions", currentSessionId] 
      });
    },
    onError: (error) => {
      toast({
        title: "Fejl",
        description: "Kunne ikke sende besked",
        variant: "destructive",
      });
    },
  });

  const regenerateMessageMutation = useMutation({
    mutationFn: async ({ messageId, domainIds }: { messageId: string; domainIds?: string[] }) => {
      const response = await apiRequest("POST", `/api/messages/${messageId}/regenerate`, {
        domainIds,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/chat-sessions", currentSessionId, "messages"] 
      });
    },
    onError: (error) => {
      toast({
        title: "Fejl",
        description: "Kunne ikke regenerere svar",
        variant: "destructive",
      });
    },
  });

  const createNewSession = async () => {
    await createSessionMutation.mutateAsync({
      title: "Ny chat",
      selectedDomains: [],
    });
  };

  const sendMessage = async (message: string, domainIds?: string[]) => {
    if (!currentSessionId) {
      // Create new session if none exists
      const newSession = await createSessionMutation.mutateAsync({
        title: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
        selectedDomains: domainIds || [],
      });
      
      // Send message to new session
      await sendMessageMutation.mutateAsync({ message, domainIds });
    } else {
      await sendMessageMutation.mutateAsync({ message, domainIds });
    }
  };

  const regenerateMessage = async (messageId: string, domainIds?: string[]) => {
    await regenerateMessageMutation.mutateAsync({ messageId, domainIds });
  };

  const isLoading = 
    createSessionMutation.isPending ||
    sendMessageMutation.isPending ||
    regenerateMessageMutation.isPending;

  // Update session ID when route changes
  useEffect(() => {
    setCurrentSessionId(sessionId);
  }, [sessionId]);

  return {
    currentSession,
    messages: messages as ChatMessageWithCitations[],
    isLoading: isLoading || sessionLoading || messagesLoading,
    sendMessage,
    createNewSession,
    regenerateMessage,
  };
}
