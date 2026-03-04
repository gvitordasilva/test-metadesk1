import { useState } from "react";
import { Book, Search, FileText, HelpCircle, Copy, ExternalLink, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Article {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

// Mock data - in production, this would come from the database
const mockArticles: Article[] = [
  {
    id: "1",
    title: "Como rastrear pedidos",
    excerpt: "Guia completo para rastrear pedidos e verificar status de entregas...",
    category: "Entregas",
    tags: ["rastreamento", "pedidos", "entrega"]
  },
  {
    id: "2", 
    title: "Política de trocas e devoluções",
    excerpt: "Procedimentos para solicitar troca ou devolução de produtos...",
    category: "Trocas",
    tags: ["troca", "devolução", "reembolso"]
  },
  {
    id: "3",
    title: "Problemas com pagamento",
    excerpt: "Soluções para os problemas mais comuns relacionados a pagamentos...",
    category: "Pagamentos",
    tags: ["pagamento", "boleto", "cartão"]
  },
  {
    id: "4",
    title: "Alteração de endereço",
    excerpt: "Como alterar o endereço de entrega antes e depois da compra...",
    category: "Cadastro",
    tags: ["endereço", "cadastro", "alteração"]
  }
];

const mockFAQs: FAQ[] = [
  {
    id: "1",
    question: "Qual o prazo de entrega?",
    answer: "O prazo varia de 3 a 15 dias úteis dependendo da região. Após o envio, você receberá o código de rastreamento."
  },
  {
    id: "2",
    question: "Como cancelar um pedido?",
    answer: "Pedidos podem ser cancelados em até 2 horas após a confirmação. Acesse Meus Pedidos > Cancelar Pedido."
  },
  {
    id: "3",
    question: "Posso alterar o método de pagamento?",
    answer: "Não é possível alterar após a confirmação. Cancele o pedido atual e faça um novo com a forma de pagamento desejada."
  }
];

export function ContentSidebar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const filteredArticles = mockArticles.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredFAQs = mockFAQs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência");
  };

  return (
    <div className="w-72 border-l h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b bg-muted/20">
        <h3 className="font-medium flex items-center gap-2">
          <Book className="h-4 w-4" />
          Base de Conhecimento
        </h3>
      </div>

      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar artigos..."
            className="pl-8 h-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Quick Articles */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
              Artigos Relevantes
            </h4>
            <div className="space-y-2">
              {filteredArticles.map(article => (
                <div
                  key={article.id}
                  className="p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <FileText className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        <span className="text-sm font-medium truncate">{article.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {article.excerpt}
                      </p>
                      <div className="flex gap-1 mt-1.5">
                        <Badge variant="secondary" className="text-[10px] px-1.5">
                          {article.category}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(article.excerpt);
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FAQs */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
              <HelpCircle className="h-3.5 w-3.5 inline mr-1" />
              Respostas Rápidas
            </h4>
            <div className="space-y-1">
              {filteredFAQs.map(faq => (
                <Collapsible
                  key={faq.id}
                  open={expandedFAQ === faq.id}
                  onOpenChange={(open) => setExpandedFAQ(open ? faq.id : null)}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-left text-sm rounded-lg hover:bg-muted/50 transition-colors">
                    <span className="flex-1 pr-2">{faq.question}</span>
                    {expandedFAQ === faq.id ? (
                      <ChevronDown className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 flex-shrink-0" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-2 pb-2">
                      <div className="p-2 bg-muted/30 rounded-md text-xs text-muted-foreground">
                        {faq.answer}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 mt-2 text-xs w-full"
                          onClick={() => copyToClipboard(faq.answer)}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copiar resposta
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t">
        <Button variant="outline" size="sm" className="w-full text-xs">
          <Book className="h-3.5 w-3.5 mr-1.5" />
          Ver toda a base de conhecimento
        </Button>
      </div>
    </div>
  );
}
