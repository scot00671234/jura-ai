import { useParams } from "wouter";
import ChatInterface from "@/components/chat/chat-interface";

export default function ChatPage() {
  const { sessionId } = useParams<{ sessionId?: string }>();
  
  return (
    <div className="h-screen overflow-hidden">
      <ChatInterface sessionId={sessionId} />
    </div>
  );
}
