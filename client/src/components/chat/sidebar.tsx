import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, X, Plus, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { LegalDomain } from "@shared/schema";

interface SidebarProps {
  legalDomains: LegalDomain[];
  selectedDomains: string[];
  onDomainsChange: (domains: string[]) => void;
  onNewChat: () => void;
  onToggle: () => void;
}

export default function Sidebar({
  legalDomains,
  selectedDomains,
  onDomainsChange,
  onNewChat,
  onToggle,
}: SidebarProps) {
  const { data: recentSessions = [] } = useQuery({
    queryKey: ["/api/chat-sessions"],
  }) as { data: any[] };

  const handleDomainToggle = (domainId: string) => {
    if (selectedDomains.includes(domainId)) {
      onDomainsChange(selectedDomains.filter(id => id !== domainId));
    } else {
      onDomainsChange([...selectedDomains, domainId]);
    }
  };

  const getDomainStats = (domainId: string) => {
    // This would be calculated from actual law text counts
    const mockCounts: Record<string, number> = {
      "strafferet": 1247,
      "civilret": 2156,
      "arbejdsret": 892,
      "skatteret": 1543,
      "selskabsret": 654,
    };
    return mockCounts[domainId] || 0;
  };

  return (
    <div className="flex flex-col flex-grow bg-card border-r border-border overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">JuraAssist</h1>
            <p className="text-xs text-muted-foreground">AI Juridisk Assistent</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onToggle} data-testid="button-close-sidebar">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <Button 
          onClick={onNewChat} 
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          data-testid="button-new-chat"
        >
          <Plus className="w-4 h-4" />
          <span>Ny Chat</span>
        </Button>
      </div>

      {/* Legal Domain Filters */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Lovområder</h3>
            <div className="space-y-2">
              {legalDomains.map((domain) => (
                <div
                  key={domain.id}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-secondary cursor-pointer transition-colors group"
                  onClick={() => handleDomainToggle(domain.id)}
                  data-testid={`domain-${domain.id}`}
                >
                  <Checkbox
                    checked={selectedDomains.includes(domain.id)}
                    onChange={() => handleDomainToggle(domain.id)}
                    className="w-4 h-4"
                    data-testid={`checkbox-domain-${domain.id}`}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {domain.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {getDomainStats(domain.id)} paragraffer
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Searches */}
          <div className="pt-4 border-t border-border">
            <h3 className="text-sm font-medium text-foreground mb-3">Seneste søgninger</h3>
            <div className="space-y-2">
              {recentSessions.slice(0, 5).map((session: any) => (
                <div
                  key={session.id}
                  className="p-3 rounded-lg hover:bg-secondary cursor-pointer transition-colors group"
                  data-testid={`recent-session-${session.id}`}
                >
                  <div className="text-sm text-foreground group-hover:text-primary transition-colors">
                    {session.title || "Untitled Chat"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(session.createdAt).toLocaleDateString("da-DK", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Sidst opdateret: I dag</span>
          <Button variant="ghost" size="sm" data-testid="button-refresh-data">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
