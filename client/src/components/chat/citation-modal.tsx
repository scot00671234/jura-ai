import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalLink, Copy, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { LawTextWithDomain } from "@shared/schema";

interface CitationModalProps {
  citation: LawTextWithDomain & { relevanceScore?: number; snippet?: string };
  isOpen: boolean;
  onClose: () => void;
}

export default function CitationModal({ citation, isOpen, onClose }: CitationModalProps) {
  const { toast } = useToast();

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(citation.content);
      toast({
        title: "Kopieret",
        description: "Lovteksten er kopieret til udklipsholderen",
      });
    } catch (error) {
      toast({
        title: "Fejl",
        description: "Kunne ikke kopiere teksten",
        variant: "destructive",
      });
    }
  };

  const handleViewOnRetsinformation = () => {
    if (citation.sourceUrl) {
      window.open(citation.sourceUrl, "_blank");
    } else {
      toast({
        title: "Link ikke tilgængeligt",
        description: "Der er intet link til Retsinformation for denne tekst",
        variant: "destructive",
      });
    }
  };

  const formatLawNumber = () => {
    if (citation.lawNumber) {
      return citation.lawNumber;
    }
    return "Ukendt lovnummer";
  };

  const formatSection = () => {
    const parts = [];
    if (citation.chapter) parts.push(`Kapitel ${citation.chapter}`);
    if (citation.section) parts.push(`§ ${citation.section}`);
    if (citation.paragraph) parts.push(citation.paragraph);
    return parts.join(", ") || "Ingen sektion angivet";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden" data-testid="citation-modal">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold text-foreground">
                {citation.title}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {formatLawNumber()} • {formatSection()}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-modal">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[60vh] pr-2">
          <div className="space-y-4">
            {/* Domain and metadata */}
            <div className="flex items-center space-x-4 text-sm">
              {citation.domain && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-legal/10 text-legal">
                  {citation.domain.name}
                </span>
              )}
              {citation.relevanceScore && (
                <span className="text-muted-foreground">
                  Relevans: {Math.round(citation.relevanceScore * 100)}%
                </span>
              )}
            </div>

            {/* Content */}
            <div className="prose prose-sm max-w-none text-foreground">
              <div className="whitespace-pre-wrap">{citation.content}</div>
            </div>

            {/* Last updated */}
            <div className="text-xs text-muted-foreground border-t pt-3">
              Sidst opdateret: {new Date(citation.lastUpdated).toLocaleDateString("da-DK", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between border-t pt-4 bg-muted/50 -mx-6 -mb-6 px-6 pb-6">
          <div className="text-sm text-muted-foreground">
            Kilde: <span className="text-legal">retsinformation.dk</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCopyText}
              data-testid="button-copy-text"
            >
              <Copy className="w-4 h-4 mr-2" />
              Kopiér tekst
            </Button>
            <Button 
              onClick={handleViewOnRetsinformation}
              disabled={!citation.sourceUrl}
              size="sm"
              data-testid="button-view-external"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Vis på Retsinformation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
