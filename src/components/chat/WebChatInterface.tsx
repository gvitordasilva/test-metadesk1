import { useState, useEffect, useRef } from "react";
import { useWebChat } from "@/hooks/useWebChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Loader2, Headset, FileIcon, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface WebChatInterfaceProps {
  flowId: string;
  flowName?: string;
}

export function WebChatInterface({ flowId, flowName }: WebChatInterfaceProps) {
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    isLoading,
    isEnded,
    isEscalated,
    isLiveChat,
    startChat,
    selectOption,
    sendMessage,
    escalateToLiveChat,
  } = useWebChat(flowId);

  useEffect(() => {
    startChat();
  }, [startChat]);

  // When escalated, automatically create the queue entry and switch to live chat
  useEffect(() => {
    if (isEscalated && !isLiveChat) {
      escalateToLiveChat();
    }
  }, [isEscalated, isLiveChat, escalateToLiveChat]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || isEnded) return;
    // In live chat mode or bot mode, allow sending
    if (!isLiveChat && isEscalated) return;

    sendMessage(inputValue.trim());
    setInputValue("");
    inputRef.current?.focus();
  };

  const handleOptionClick = (optionKey: string, nextNodeId: string | null) => {
    if (isLoading || isEnded || isEscalated) return;
    selectOption(optionKey, nextNodeId);
  };

  // Determine input state
  const canSend = isLiveChat || (!isEnded && !isEscalated);
  const placeholderText = isEnded
    ? "Atendimento encerrado"
    : isLiveChat
    ? "Digite sua mensagem para o atendente..."
    : isEscalated
    ? "Conectando ao atendente..."
    : messages.some((m) => m.sender === "bot" && m.options && m.options.length > 0)
    ? "Digite o número da opção..."
    : "Digite sua mensagem...";

  const statusText = isLiveChat
    ? "Conectado com atendente"
    : isEscalated
    ? "Conectando ao atendente..."
    : isEnded
    ? "Encerrado"
    : "Online";

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b text-[#232f3c]" style={{ backgroundColor: '#f5ff55' }}>
        <div className="w-10 h-10 rounded-full bg-[#232f3c]/20 flex items-center justify-center">
          {isLiveChat ? <Headset className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
        </div>
        <div>
          <h2 className="font-semibold">
            {isLiveChat ? "Atendente" : flowName || "Assistente Virtual"}
          </h2>
          <p className="text-xs opacity-80">{statusText}</p>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-2",
                message.sender === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.sender !== "user" && (
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                  message.sender === "agent" ? "bg-primary/20" : "bg-[#f5ff55]/20"
                )}>
                  {message.sender === "agent" ? (
                    <Headset className="w-4 h-4 text-primary" />
                  ) : (
                    <Bot className="w-4 h-4 text-[#232f3c]" />
                  )}
                </div>
              )}

              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2",
                  message.sender === "user"
                    ? "bg-[#f5ff55] text-[#232f3c] rounded-br-md"
                    : message.sender === "agent"
                    ? "bg-primary/10 rounded-bl-md"
                    : "bg-muted rounded-bl-md"
                )}
              >
                {(() => {
                  const imgMatch = message.content.match(/^\[imagem:(.+?)\]\((.+?)\)$/);
                  if (imgMatch) {
                    return (
                      <div className="space-y-1">
                        <img src={imgMatch[2]} alt={imgMatch[1]} className="max-w-[200px] rounded-md cursor-pointer" onClick={() => window.open(imgMatch[2], "_blank")} />
                        <p className="text-[10px] opacity-70">{imgMatch[1]}</p>
                      </div>
                    );
                  }
                  const fileMatch = message.content.match(/^\[arquivo:(.+?)\]\((.+?)\)$/);
                  if (fileMatch) {
                    return (
                      <a href={fileMatch[2]} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-md bg-background/30 hover:bg-background/50 transition-colors">
                        <FileIcon className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm truncate flex-1">{fileMatch[1]}</span>
                        <Download className="h-3 w-3 opacity-60" />
                      </a>
                    );
                  }
                  return <p className="text-sm whitespace-pre-wrap">{message.content}</p>;
                })()}
                
                {/* Options buttons */}
                {message.options && message.options.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.options.map((option) => (
                      <Button
                        key={option.key}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-left h-auto py-2 px-3"
                        onClick={() => handleOptionClick(option.key, option.nextNodeId)}
                        disabled={isLoading || isEnded || isEscalated || isLiveChat}
                      >
                        <span className="font-bold mr-2">{option.key}.</span>
                        {option.text}
                      </Button>
                    ))}
                  </div>
                )}

                <span className="text-[10px] opacity-60 mt-1 block">
                  {message.timestamp.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {message.sender === "user" && (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-secondary-foreground" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2 justify-start">
              <div className="w-8 h-8 rounded-full bg-[#f5ff55]/20 flex items-center justify-center">
                {isLiveChat ? <Headset className="w-4 h-4 text-primary" /> : <Bot className="w-4 h-4 text-[#232f3c]" />}
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}

          {/* Waiting for attendant indicator */}
          {isEscalated && !isLiveChat && !isLoading && (
            <div className="flex gap-2 justify-start">
              <div className="w-8 h-8 rounded-full bg-[#f5ff55]/20 flex items-center justify-center">
                <Headset className="w-4 h-4 text-[#232f3c]" />
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Conectando ao atendente...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholderText}
            disabled={!canSend || isLoading}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!canSend || isLoading || !inputValue.trim()}
            className="bg-[#f5ff55] text-[#232f3c] hover:bg-[#e6f04d]"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
