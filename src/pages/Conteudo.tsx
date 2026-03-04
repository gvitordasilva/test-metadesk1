
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, FolderPlus, FileText, Edit, Trash } from "lucide-react";

export default function Conteudo() {
  return (
    <MainLayout>
      <div className="mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-1">Base de Conhecimento</h1>
            <p className="text-muted-foreground">
              Gerenciamento de artigos, FAQs e conteúdos
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <FolderPlus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Artigo
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <Tabs defaultValue="artigos">
            <TabsList className="mb-4">
              <TabsTrigger value="artigos">Artigos</TabsTrigger>
              <TabsTrigger value="faqs">FAQs</TabsTrigger>
              <TabsTrigger value="mensagens">Mensagens Padrão</TabsTrigger>
              <TabsTrigger value="avisos">Avisos</TabsTrigger>
            </TabsList>

            <div className="flex gap-4 mb-6">
              <div className="flex-grow relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar artigos ou conteúdos..."
                  className="pl-8"
                />
              </div>
            </div>

            <TabsContent value="artigos" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <Card key={item} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-3">
                          <Badge variant="outline" className="mb-2">
                            Produtos
                          </Badge>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <h3 className="font-semibold text-lg mb-2">
                          Como configurar seu novo dispositivo
                        </h3>
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                          Um guia passo a passo para configurar seu novo
                          dispositivo, incluindo dicas para configuração de rede,
                          contas de usuário e recursos avançados.
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Atualizado: 10/05/2025</span>
                          <div className="flex items-center gap-2">
                            <FileText className="h-3 w-3" />
                            <span>Artigo Completo</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="faqs" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="overflow-hidden">
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-2">Como cancelar uma assinatura?</h3>
                    <p className="text-muted-foreground text-sm">
                      Para cancelar sua assinatura, acesse sua conta, vá até "Minhas assinaturas" e clique em "Cancelar assinatura". Siga as instruções na tela para confirmar o cancelamento.
                    </p>
                  </CardContent>
                </Card>
                <Card className="overflow-hidden">
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-2">Qual é o prazo de entrega?</h3>
                    <p className="text-muted-foreground text-sm">
                      O prazo de entrega varia de acordo com sua localização. Geralmente, capitais e regiões metropolitanas têm prazo de 1-3 dias úteis, enquanto outras localidades podem levar de 3-7 dias úteis.
                    </p>
                  </CardContent>
                </Card>
                <Card className="overflow-hidden">
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-2">Como solicitar reembolso?</h3>
                    <p className="text-muted-foreground text-sm">
                      Reembolsos podem ser solicitados em até 7 dias após o recebimento do produto. Acesse "Meus pedidos", selecione o pedido desejado e clique em "Solicitar reembolso".
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="mensagens" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <Badge variant="outline">Saudação</Badge>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="bg-muted p-3 rounded-md text-sm">
                      Olá [nome_cliente], tudo bem? Sou [nome_atendente] e vou te ajudar hoje. Como posso auxiliar?
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <Badge variant="outline">Despedida</Badge>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="bg-muted p-3 rounded-md text-sm">
                      Fico feliz em ter ajudado, [nome_cliente]! Caso precise de algo mais, é só entrar em contato novamente. Tenha um ótimo dia!
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="avisos" className="mt-0">
              <div className="grid grid-cols-1 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <Badge className="bg-yellow-100 text-yellow-800">Ativo</Badge>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <h3 className="font-semibold text-lg mb-2">
                      Manutenção Programada
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Informamos que no dia 20/05/2025, das 23h às 5h, realizaremos manutenção programada em nossos sistemas. Durante este período, o acesso aos serviços online estará temporariamente indisponível.
                    </p>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <span>Válido até: 21/05/2025</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}
