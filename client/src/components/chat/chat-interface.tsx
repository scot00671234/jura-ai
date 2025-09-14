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

  const { data: legalDomains = [] } = useQuery({
    queryKey: ["/api/legal-domains"],
  });

  const handleSendMessage = async (message: string) => {
    await sendMessage(message, selectedDomains);
  };

  const handleNewChat = async () => {
    await createNewSession();
  };

  const handleUseSuggestion = (suggestion: string) => {
    handleSendMessage(suggestion);
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
        {/* Chat Header */}
        <div className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              data-testid="button-toggle-sidebar"
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Juridisk AI Chat</h2>
              <p className="text-sm text-muted-foreground">Stil spørgsmål om dansk lovgivning</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-legal/10 text-legal">
              <span className="w-2 h-2 bg-legal rounded-full mr-1.5"></span>
              Tilgængelig
            </span>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto bg-background" data-testid="chat-container">
          <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
            
            {!messages || messages.length === 0 ? (
              /* Welcome Message */
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Velkommen til JuraAssist</h3>
                <p className="text-muted-foreground max-w-lg mx-auto">
                  Stil spørgsmål om dansk lovgivning og få præcise svar baseret på opdaterede lovtekster fra Retsinformation. 
                  AI'en vil finde relevante paragraffer og give dig en klar forklaring.
                </p>
                
                {/* Suggested Questions */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                  {suggestedQuestions.map((item, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="p-4 h-auto text-left justify-start hover:border-primary/50 hover:bg-secondary/50 transition-all group"
                      onClick={() => handleUseSuggestion(item.question)}
                      data-testid={`button-suggestion-${index}`}
                    >
                      <div className="w-full">
                        <div className="text-sm font-medium text-foreground group-hover:text-primary mb-1">
                          {item.question}
                        </div>
                        <div className="text-xs text-muted-foreground">{item.category}</div>
                      </div>
                    </Button>
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
                        <div className="flex-shrink-0 w-8 h-8 bg-legal/10 rounded-full flex items-center justify-center mt-1">
                          <Brain className="w-4 h-4 text-legal animate-pulse" />
                        </div>
                        <div className="flex-1">
                          <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-muted-foreground">Søger i lovbestemmelser</span>
                              <div className="flex space-x-1">
                                <div className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse"></div>
                                <div className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse delay-100"></div>
                                <div className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse delay-200"></div>
                              </div>
                            </div>
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
