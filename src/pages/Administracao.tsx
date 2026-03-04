import { MainLayout } from "@/components/layout/MainLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Settings,
  Lock,
  Key,
  FolderTree,
} from "lucide-react";
import { WorkflowManager } from "@/components/admin/WorkflowManager";
import { SLASettings } from "@/components/admin/SLASettings";
import { NotificationSettings } from "@/components/admin/NotificationSettings";
import { UsersTab } from "@/components/admin/UsersTab";

export default function Administracao() {
  return (
    <MainLayout>
      <div className="mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-1">Administração</h1>
            <p className="text-muted-foreground">
              Configurações e gerenciamento do sistema
            </p>
          </div>
        </div>

        <Tabs defaultValue="usuarios" className="mb-6">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="usuarios" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="perfis" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Perfis
            </TabsTrigger>
            <TabsTrigger
              value="estrutura"
              className="flex items-center gap-2"
            >
              <FolderTree className="h-4 w-4" />
              Estrutura
            </TabsTrigger>
            <TabsTrigger
              value="configuracoes"
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="usuarios" className="mt-6">
            <UsersTab />
          </TabsContent>

          <TabsContent value="perfis" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Administrador</CardTitle>
                  <CardDescription>Acesso total ao sistema</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Badge className="mr-1">Atendimento</Badge>
                    <Badge className="mr-1">Solicitações</Badge>
                    <Badge className="mr-1">Conteúdo</Badge>
                    <Badge className="mr-1">Campanhas</Badge>
                    <Badge className="mr-1">Monitoramento</Badge>
                    <Badge className="mr-1">Administração</Badge>
                  </div>
                  <div className="mt-6">
                    <Button variant="outline" className="w-full">
                      Editar Permissões
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Supervisor</CardTitle>
                  <CardDescription>
                    Monitora e gerencia equipe de atendimento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Badge className="mr-1">Atendimento</Badge>
                    <Badge className="mr-1">Solicitações</Badge>
                    <Badge className="mr-1">Conteúdo</Badge>
                    <Badge className="mr-1">Campanhas</Badge>
                    <Badge className="mr-1">Monitoramento</Badge>
                  </div>
                  <div className="mt-6">
                    <Button variant="outline" className="w-full">
                      Editar Permissões
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Atendente</CardTitle>
                  <CardDescription>
                    Realiza atendimentos e registra solicitações
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Badge className="mr-1">Atendimento</Badge>
                    <Badge className="mr-1">Solicitações</Badge>
                    <Badge className="mr-1">Conteúdo (leitura)</Badge>
                  </div>
                  <div className="mt-6">
                    <Button variant="outline" className="w-full">
                      Editar Permissões
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="estrutura" className="mt-6">
            <WorkflowManager />
          </TabsContent>




          <TabsContent value="configuracoes" className="mt-6">
            <div className="space-y-8">
              <NotificationSettings />
              <SLASettings />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Segurança</CardTitle>
                    <CardDescription>
                      Políticas de acesso e autenticação
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="mr-2">
                      <Lock className="h-4 w-4 mr-2" />
                      Configurar
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Personalização</CardTitle>
                    <CardDescription>
                      Customize a aparência e comportamento
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="mr-2">
                      <Settings className="h-4 w-4 mr-2" />
                      Configurar
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
