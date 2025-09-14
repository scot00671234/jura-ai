import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Brain, User, RefreshCw, ExternalLink } from "lucide-react";
import type { ChatMessageWithCitations } from "@shared/schema";

interface MessageProps {
  message: ChatMessageWithCitations;
  onCitationClick: (citation: any) => void;
  onRegenerate?: () => void;
}

export default function Message({ message, onCitationClick, onRegenerate }: MessageProps) {
  const isUser = message.role === "user";
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleRegenerate = async () => {
    if (onRegenerate) {
      setIsRegenerating(true);
      try {
        await onRegenerate();
      } finally {
        setIsRegenerating(false);
      }
    }
  };

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString("da-DK", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isUser) {
    return (
      <div className="flex justify-end" data-testid="message-user">
        <div className="max-w-3xl">
          <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3 message-fade-in">
            <p className="text-sm">{message.content}</p>
          </div>
          <div className="text-xs text-muted-foreground mt-2 text-right">
            {formatTime(message.createdAt)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start" data-testid="message-assistant">
      <div className="max-w-3xl w-full">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 w-8 h-8 bg-legal/10 rounded-full flex items-center justify-center mt-1">
            <Brain className="w-4 h-4 text-legal" />
          </div>
          <div className="flex-1">
            <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3 message-fade-in">
              <div className="prose prose-sm max-w-none text-foreground">
                <div dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }} />
              </div>
            </div>
            
            {/* Citations */}
            {message.citedLawTexts && message.citedLawTexts.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="text-xs text-muted-foreground font-medium mb-2">
                  Relevante lovbestemmelser:
                </div>
                
                {message.citedLawTexts.map((citation, index) => (
                  <div
                    key={index}
                    className="bg-legal/5 border border-legal/20 rounded-lg p-3 citation-hover cursor-pointer hover:shadow-sm transition-all"
                    onClick={() => onCitationClick(citation)}
                    data-testid={`citation-${index}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-legal/10 text-legal">
                            {citation.domain?.name || "Lovgivning"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {citation.section ? `§ ${citation.section}` : citation.lawNumber}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-foreground mb-1">
                          {citation.title}
                        </div>
                        <p className="text-xs text-foreground line-clamp-2">
                          {citation.snippet}
                        </p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-legal flex-shrink-0 ml-2" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="text-xs text-muted-foreground mt-3 flex items-center space-x-4">
              <span>{formatTime(message.createdAt)}</span>
              {message.citedLawTexts && message.citedLawTexts.length > 0 && (
                <>
                  <span>•</span>
                  <span>Baseret på {message.citedLawTexts.length} lovbestemmelse{message.citedLawTexts.length !== 1 ? 'r' : ''}</span>
                </>
              )}
              {onRegenerate && (
                <>
                  <span>•</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRegenerate}
                    disabled={isRegenerating}
                    className="h-auto p-0 text-xs hover:text-foreground transition-colors"
                    data-testid="button-regenerate"
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${isRegenerating ? 'animate-spin' : ''}`} />
                    Generer igen
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatMessageContent(content: string): string {
  // Convert line breaks to paragraphs
  return content
    .split('\n\n')
    .map(paragraph => `<p class="mb-3">${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('');
}
