import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  selectedDomains: string[];
  isLoading: boolean;
}

export default function ChatInput({ onSendMessage, selectedDomains, isLoading }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !isLoading) {
      onSendMessage(trimmedMessage);
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "48px";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
  };

  // Reset textarea height when message is cleared
  useEffect(() => {
    if (!message && textareaRef.current) {
      textareaRef.current.style.height = "48px";
    }
  }, [message]);

  return (
    <div className="bg-card border-t border-border p-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative">
          <div className="flex items-end space-x-3">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Stil et spørgsmål om dansk lovgivning..."
                className="w-full px-4 py-3 pr-12 bg-input border border-border rounded-2xl focus:ring-2 focus:ring-ring focus:border-transparent resize-none text-sm placeholder-muted-foreground min-h-[48px] max-h-[120px]"
                disabled={isLoading}
                data-testid="input-message"
              />
              <div className="absolute right-3 top-3 flex items-center space-x-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-1.5 h-auto"
                  data-testid="button-attach-file"
                >
                  <Paperclip className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </Button>
              </div>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!message.trim() || isLoading}
              className="flex-shrink-0 w-12 h-12 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-send-message"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Input helpers */}
          <div className="flex items-center justify-between mt-2 px-2">
            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              <span>Tryk Enter + Shift for nye linjer</span>
              <span>•</span>
              <span data-testid="text-selected-domains">
                {selectedDomains.length} lovområde{selectedDomains.length !== 1 ? 'r' : ''} valgt
              </span>
            </div>
            <div className="text-xs text-muted-foreground" data-testid="text-character-count">
              <span>{message.length}</span>/2000 tegn
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
