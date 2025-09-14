
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";

export default function AdminPanel() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});

  const createMutation = (endpoint: string, successMessage: string) => {
    return useMutation({
      mutationFn: async (data?: any) => {
        setIsLoading(prev => ({ ...prev, [endpoint]: true }));
        const response = await apiRequest("POST", endpoint, data);
        return await response.json();
      },
      onSuccess: () => {
        toast({
          title: "Success",
          description: successMessage,
        });
        setIsLoading(prev => ({ ...prev, [endpoint]: false }));
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: `Failed: ${error.message}`,
          variant: "destructive",
        });
        setIsLoading(prev => ({ ...prev, [endpoint]: false }));
      },
    });
  };

  const syncDomainsMutation = createMutation("/api/admin/sync-domains", "Legal domains synced successfully");
  const syncLawTextsMutation = createMutation("/api/admin/sync-law-texts", "Law texts sync started");
  const generateEmbeddingsMutation = createMutation("/api/admin/generate-embeddings", "Embeddings generation started");

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground">Manage legal data and embeddings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Legal Domains</CardTitle>
            <CardDescription>
              Sync legal domain categories from the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => syncDomainsMutation.mutate()}
              disabled={isLoading["/api/admin/sync-domains"]}
              className="w-full"
            >
              {isLoading["/api/admin/sync-domains"] ? "Syncing..." : "Sync Domains"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Law Texts</CardTitle>
            <CardDescription>
              Fetch and store law texts from Retsinformation API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => syncLawTextsMutation.mutate({ fullSync: false })}
              disabled={isLoading["/api/admin/sync-law-texts"]}
              className="w-full"
              variant="outline"
            >
              {isLoading["/api/admin/sync-law-texts"] ? "Syncing..." : "Sync New Texts"}
            </Button>
            <Button
              onClick={() => syncLawTextsMutation.mutate({ fullSync: true })}
              disabled={isLoading["/api/admin/sync-law-texts"]}
              className="w-full"
            >
              {isLoading["/api/admin/sync-law-texts"] ? "Syncing..." : "Full Sync"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Embeddings</CardTitle>
            <CardDescription>
              Generate embeddings for semantic search
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => generateEmbeddingsMutation.mutate({ batchSize: 10 })}
              disabled={isLoading["/api/admin/generate-embeddings"]}
              className="w-full"
            >
              {isLoading["/api/admin/generate-embeddings"] ? "Processing..." : "Generate Embeddings"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
          <CardDescription>
            Current system status and information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Database:</span>
              <span className="text-green-600">Connected</span>
            </div>
            <div className="flex justify-between">
              <span>Embeddings Model:</span>
              <span className="text-green-600">Loaded</span>
            </div>
            <div className="flex justify-between">
              <span>LLM Endpoint:</span>
              <span className="text-yellow-600">Local (Configure if needed)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
