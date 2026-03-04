import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: AppRole;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { role, canAccess } = useRole();
  const location = useLocation();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access
  if (requiredRole && role !== requiredRole) {
    // Redirect to appropriate page based on user's role
    if (role === 'atendente') {
      return <Navigate to="/atendimento" replace />;
    }
    if (role === 'admin') {
      return <Navigate to="/dashboard" replace />;
    }
    // If no role assigned, redirect to login
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Component that redirects based on user role
export function RoleBasedRedirect() {
  const { loading } = useAuth();
  const { getDefaultRoute } = useRole();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return <Navigate to={getDefaultRoute()} replace />;
}
