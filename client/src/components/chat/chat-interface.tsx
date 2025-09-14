import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/chat/sidebar";
import ChatInput from "@/components/chat/chat-input";
import Message from "@/components/chat/message";
import CitationModal from "@/components/chat/citation-modal";
import { useChat } from "@/hooks/use-chat";
import { Button } from "@/components/ui/button";
import { CheckCircle2, MessageSquare, Brain } from "lucide-react";

interface ChatInterfaceProps {
  sessionId?: string;
}

export default function ChatInterface({ sessionId }: ChatInterfaceProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [selectedCitation, setSelectedCitation] = useState<any>(null);
  
  const {
    currentSession,
    messages,
    isLoading,
    sendMessage,
    createNewSession,
    regenerateMessage,
  } = useChat(sessionId);

  // Create a new session if none exists and user tries to send a message
  const handleSendMessageWithSession = async (message: string) => {
    if (!sessionId && !currentSession) {
      await createNewSession();
    }
    await sendMessage(message, selectedDomains);
  };

  const { data: legalDomains = [] } = useQuery({
    queryKey: ["/api/legal-domains"],
  });

  const handleSendMessage = async (message: string) => {
    await handleSendMessageWithSession(message);
  };

  const handleNewChat = async () => {
    await createNewSession();
  };

  const handleUseSuggestion = (suggestion: string) => {
    handleSendMessageWithSession(suggestion);
  };

  const handleCitationClick = (citation: any) => {
    setSelectedCitation(citation);
  };

  const suggestedQuestions = [
    {
      question: "Hvad er reglerne for opsigelse af ansættelseskontrakter?",
      category: "Arbejdsret"
    },
    {
      question: "Hvornår er man skattepligtig til Danmark?",
      category: "Skatteret"
    },
    {
      question: "Regler for produktansvar ved defekte varer?",
      category: "Civilret"
    },
    {
      question: "Hvilke krav gælder for stiftelse af aktieselskab?",
      category: "Selskabsret"
    }
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden md:block hidden`}>
        <Sidebar
          legalDomains={legalDomains as any}
          selectedDomains={selectedDomains}
          onDomainsChange={setSelectedDomains}
          onNewChat={handleNewChat}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Minimal Header */}
        <div className="bg-background px-6 py-3 flex items-center justify-between border-b border-border/50">
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            data-testid="button-toggle-sidebar"
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-medium text-foreground mx-auto md:mx-0">Juridisk AI</h1>
          <div className="hidden md:block w-6"></div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto bg-background" data-testid="chat-container">
          <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
            
            {!messages || messages.length === 0 ? (
              /* Welcome Message */
              <div className="text-center py-16">
                <h2 className="text-2xl font-medium text-foreground mb-3">Hvordan kan jeg hjælpe dig?</h2>
                <p className="text-muted-foreground max-w-md mx-auto mb-8">
                  Stil spørgsmål om dansk lovgivning
                </p>
                
                {/* Simplified Suggestions */}
                <div className="max-w-md mx-auto space-y-2">
                  {suggestedQuestions.slice(0, 3).map((item, index) => (
                    <button
                      key={index}
                      className="w-full p-3 text-left border border-border/50 rounded-lg hover:bg-secondary/30 transition-colors text-sm"
                      onClick={() => handleUseSuggestion(item.question)}
                      data-testid={`button-suggestion-${index}`}
                    >
                      {item.question}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Chat Messages */
              <div className="space-y-6">
                {messages.map((message) => (
                  <Message
                    key={message.id}
                    message={message}
                    onCitationClick={handleCitationClick}
                    onRegenerate={() => regenerateMessage(message.id)}
                    data-testid={`message-${message.id}`}
                  />
                ))}
                
                {/* Loading Message */}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-3xl w-full">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-muted/20 rounded-full flex items-center justify-center mt-1">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></div>
                        </div>
                        <div className="flex-1">
                          <div className="bg-muted/20 rounded-lg px-4 py-3">
                            <span className="text-sm text-muted-foreground">Skriver...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chat Input */}
        <ChatInput
          onSendMessage={handleSendMessage}
          selectedDomains={selectedDomains}
          isLoading={isLoading}
        />
      </div>

      {/* Citation Modal */}
      {selectedCitation && (
        <CitationModal
          citation={selectedCitation}
          isOpen={!!selectedCitation}
          onClose={() => setSelectedCitation(null)}
        />
      )}
    </div>
  );
}
