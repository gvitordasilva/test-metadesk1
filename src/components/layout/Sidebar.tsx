
import React, { useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { MessageSquare, ClipboardList, Book, Megaphone, BarChart3, Settings, Home, Menu, X, Plug, HelpCircle } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { AppRole } from "@/contexts/AuthContext";
import { useMenuBadges } from "@/hooks/useMenuBadges";
import { useActiveSession } from "@/contexts/ActiveSessionContext";
import { toast } from "sonner";

type MenuItem = {
  to: string;
  icon: React.ElementType;
  text: string;
  path: string;
  roles: AppRole[];
};

type SidebarItemProps = {
  to: string;
  icon: React.ElementType;
  text: string;
  active?: boolean;
  collapsed?: boolean;
  badgeCount?: number;
  blocked?: boolean;
  onBlocked?: () => void;
};

const SidebarItem = ({
  to,
  icon: Icon,
  text,
  active,
  collapsed,
  badgeCount,
  blocked,
  onBlocked,
}: SidebarItemProps) => {
  const handleClick = (e: React.MouseEvent) => {
    if (blocked && !active) {
      e.preventDefault();
      onBlocked?.();
    }
  };

  return (
    <Link 
      to={to} 
      onClick={handleClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg transition-all relative",
        active 
          ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium" 
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <div className="relative">
        <Icon size={20} />
        {badgeCount !== undefined && badgeCount > 0 && collapsed && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
      </div>
      {!collapsed && (
        <>
          <span>{text}</span>
          {badgeCount !== undefined && badgeCount > 0 && (
            <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          )}
        </>
      )}
    </Link>
  );
};

export function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { role } = useRole();
  const badgeCounts = useMenuBadges();
  
  const { hasActiveSession } = useActiveSession();

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  const handleBlockedNavigation = () => {
    toast.warning("Você possui um atendimento em andamento. Finalize ou encaminhe antes de sair.", {
      duration: 4000,
    });
  };

  const getBadgeCount = (path: string): number | undefined => {
    switch (path) {
      case "/atendimento": return badgeCounts.atendimento;
      case "/solicitacoes": return badgeCounts.solicitacoes;
      default: return undefined;
    }
  };

  const allMenuItems: MenuItem[] = [
    {
      to: "/dashboard",
      icon: Home,
      text: "Dashboard",
      path: "/dashboard",
      roles: ['admin']
    },
    {
      to: "/atendimento",
      icon: MessageSquare,
      text: "Atendimento",
      path: "/atendimento",
      roles: ['admin', 'atendente']
    },
    {
      to: "/solicitacoes",
      icon: ClipboardList,
      text: "Solicitações",
      path: "/solicitacoes",
      roles: ['admin', 'atendente']
    },
    {
      to: "/conteudo",
      icon: Book,
      text: "Conteúdo",
      path: "/conteudo",
      roles: ['admin', 'atendente']
    },
    {
      to: "/campanhas",
      icon: Megaphone,
      text: "Campanhas",
      path: "/campanhas",
      roles: ['admin']
    },
    {
      to: "/monitoramento",
      icon: BarChart3,
      text: "Monitoramento",
      path: "/monitoramento",
      roles: ['admin', 'atendente']
    },
    {
      to: "/administracao",
      icon: Settings,
      text: "Administração",
      path: "/administracao",
      roles: ['admin']
    },
    {
      to: "/integracoes",
      icon: Plug,
      text: "Integrações",
      path: "/integracoes",
      roles: ['admin', 'atendente']
    },
    {
      to: "/informacoes",
      icon: HelpCircle,
      text: "Informações",
      path: "/informacoes",
      roles: ['admin', 'atendente']
    }
  ];

  const menuItems = useMemo(() => {
    if (!role) return [];
    return allMenuItems.filter(item => item.roles.includes(role));
  }, [role]);

  return (
    <aside className={cn(
      "bg-sidebar flex flex-col h-screen transition-all duration-300",
      collapsed ? "w-[70px]" : "w-[240px]"
    )}>
      <div className="flex justify-center items-center border-b border-sidebar-border px-0 mx-0 py-[20px]">
        {collapsed ? (
          <img src="/lovable-uploads/metadesk-icon.svg" alt="Metadesk" className="h-20" />
        ) : (
          <img 
            src="/lovable-uploads/9dbe1620-8f79-4cd0-9b06-d66c24802e9e.png" 
            alt="Metadesk" 
            className="h-24 object-contain" 
          />
        )}
      </div>

      <div className="flex-grow overflow-y-auto py-4 px-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <nav className="space-y-1">
          {menuItems.map(item => (
            <SidebarItem 
              key={item.to} 
              to={item.to} 
              icon={item.icon} 
              text={item.text} 
              active={location.pathname === item.path} 
              collapsed={collapsed}
              badgeCount={getBadgeCount(item.path)}
              blocked={hasActiveSession && location.pathname === "/atendimento"}
              onBlocked={handleBlockedNavigation}
            />
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-sidebar-border">
        <button 
          onClick={toggleCollapse} 
          className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground"
        >
          {collapsed ? <Menu size={20} /> : <X size={20} />}
        </button>
      </div>
    </aside>
  );
}

