import { useMemo } from 'react';
import { useAuth, AppRole } from '@/contexts/AuthContext';

export type ModuleName = 
  | 'dashboard' 
  | 'atendimento' 
  | 'solicitacoes' 
  | 'conteudo' 
  | 'campanhas' 
  | 'monitoramento' 
  | 'administracao' 
  | 'meu_perfil';

const MODULE_PERMISSIONS: Record<ModuleName, AppRole[]> = {
  dashboard: ['admin'],
  atendimento: ['admin', 'atendente'],
  solicitacoes: ['admin', 'atendente'],
  conteudo: ['admin', 'atendente'],
  campanhas: ['admin'],
  monitoramento: ['admin', 'atendente'],
  administracao: ['admin'],
  meu_perfil: ['admin', 'atendente'],
};

export function useRole() {
  const { role, loading } = useAuth();

  const isAdmin = useMemo(() => role === 'admin', [role]);
  const isAtendente = useMemo(() => role === 'atendente', [role]);

  const hasRole = (checkRole: AppRole): boolean => {
    return role === checkRole;
  };

  const canAccess = (module: ModuleName): boolean => {
    if (!role) return false;
    return MODULE_PERMISSIONS[module]?.includes(role) ?? false;
  };

  const canEditContent = (): boolean => {
    // Only admins can edit content, attendants have read-only access
    return isAdmin;
  };

  const getDefaultRoute = (): string => {
    if (isAdmin) return '/dashboard';
    if (isAtendente) return '/atendimento';
    return '/login';
  };

  return {
    role,
    loading,
    isAdmin,
    isAtendente,
    hasRole,
    canAccess,
    canEditContent,
    getDefaultRoute,
  };
}
