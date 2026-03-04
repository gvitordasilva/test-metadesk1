import { useNavigate, Link } from "react-router-dom";
import { Bell, Search, User, LogOut, Settings, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent,
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { cn } from "@/lib/utils";

const statusColors = {
  online: "bg-green-500",
  offline: "bg-gray-400",
  busy: "bg-red-500",
  break: "bg-yellow-500",
};

const statusLabels = {
  online: "Online",
  offline: "Offline",
  busy: "Ocupado",
  break: "Pausa",
};

export function Header() {
  const { user, profile, signOut, updateStatus } = useAuth();
  const { role, isAdmin, isAtendente } = useRole();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleStatusChange = async (status: 'online' | 'offline' | 'busy' | 'break') => {
    await updateStatus(status);
  };

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Usuário';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const currentStatus = profile?.status || 'offline';

  return (
    <header className="border-b bg-white">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex-1 flex gap-4 items-center">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Buscar..." className="w-full pl-8 bg-muted/30" />
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Status indicator for attendants */}
          {isAtendente && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Circle className={cn("h-3 w-3 fill-current", statusColors[currentStatus])} />
                  <span className="text-sm">{statusLabels[currentStatus]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Alterar status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleStatusChange('online')}>
                  <Circle className="h-3 w-3 fill-current text-green-500 mr-2" />
                  Online
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange('busy')}>
                  <Circle className="h-3 w-3 fill-current text-red-500 mr-2" />
                  Ocupado
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange('break')}>
                  <Circle className="h-3 w-3 fill-current text-yellow-500 mr-2" />
                  Pausa
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange('offline')}>
                  <Circle className="h-3 w-3 fill-current text-gray-400 mr-2" />
                  Offline
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notificações</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-80 overflow-y-auto">
                <DropdownMenuItem className="py-2">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">Novo atendimento</span>
                    <span className="text-sm text-muted-foreground">
                      Cliente aguardando no WhatsApp
                    </span>
                    <span className="text-xs text-muted-foreground">
                      2 minutos atrás
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="py-2">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">Solicitação atualizada</span>
                    <span className="text-sm text-muted-foreground">
                      Protocolo #12345 alterado para "Em andamento"
                    </span>
                    <span className="text-xs text-muted-foreground">
                      15 minutos atrás
                    </span>
                  </div>
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="justify-center text-primary">
                Ver todas as notificações
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative flex items-center gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium">{displayName}</span>
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    {isAdmin ? 'Admin' : 'Atendente'}
                  </Badge>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{displayName}</span>
                  <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/meu-perfil" className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  Meu Perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/meu-perfil" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  Preferências
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
