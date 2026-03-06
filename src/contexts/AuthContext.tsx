import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'atendente';

export interface AttendantProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  working_hours: { start: string; end: string };
  status: 'online' | 'offline' | 'busy' | 'break';
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  profile: AttendantProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<AttendantProfile>) => Promise<{ error: Error | null }>;
  updateStatus: (status: AttendantProfile['status']) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<AttendantProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user role from database
  const fetchUserRole = async (userId: string): Promise<AppRole | null> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      return data?.role as AppRole || null;
    } catch (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
  };

  // Fetch attendant profile
  const fetchProfile = async (userId: string): Promise<AttendantProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('attendant_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data as unknown as AttendantProfile || null;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  // Cria ou atualiza o perfil de atendente (necessário para usuários sem registro em attendant_profiles)
  const ensureAttendantProfile = async (
    userId: string,
    email: string,
    fullName?: string,
    initialStatus: AttendantProfile['status'] = 'online'
  ): Promise<AttendantProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('attendant_profiles')
        .upsert(
          {
            user_id: userId,
            email,
            full_name: fullName || email.split('@')[0] || 'Atendente',
            status: initialStatus,
            working_hours: { start: '09:00', end: '18:00' },
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (error) {
        console.error('Error ensuring attendant profile:', error);
        return null;
      }

      return data as unknown as AttendantProfile;
    } catch (error) {
      console.error('Error ensuring attendant profile:', error);
      return null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Defer to avoid blocking
          setTimeout(async () => {
            const userRole = await fetchUserRole(currentSession.user.id);
            setRole(userRole);
            
            let userProfile = await fetchProfile(currentSession.user.id);
            // Criar perfil se não existir (atendente sem attendant_profile)
            if (!userProfile && userRole === 'atendente') {
              const u = currentSession.user;
              userProfile = await ensureAttendantProfile(
                u.id,
                u.email!,
                u.user_metadata?.full_name as string | undefined,
                'online'
              );
              setProfile(userProfile);
            } else {
              setProfile(userProfile);
            }
            
            // Auto-set status to online on login
            if (userProfile && userProfile.status !== 'online') {
              await supabase
                .from('attendant_profiles')
                .update({ status: 'online' })
                .eq('user_id', currentSession.user.id);
              setProfile(prev => prev ? { ...prev, status: 'online' } : null);
            }
            
            setLoading(false);
          }, 0);
        } else {
          setRole(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (existingSession?.user) {
        setSession(existingSession);
        setUser(existingSession.user);
        
        (async () => {
          const userRole = await fetchUserRole(existingSession.user.id);
          setRole(userRole);
          
          let userProfile = await fetchProfile(existingSession.user.id);
          if (!userProfile && userRole === 'atendente') {
            const u = existingSession.user;
            userProfile = await ensureAttendantProfile(
              u.id,
              u.email!,
              u.user_metadata?.full_name as string | undefined,
              'online'
            );
          }
          setProfile(userProfile);
          setLoading(false);
        })();
      } else {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    // Set status to offline before signing out
    if (user) {
      await supabase
        .from('attendant_profiles')
        .update({ status: 'offline' })
        .eq('user_id', user.id);
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setProfile(null);
  };

  const updateProfile = async (updates: Partial<AttendantProfile>) => {
    if (!user) {
      return { error: new Error('Usuário não autenticado') };
    }

    try {
      const { error } = await supabase
        .from('attendant_profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) {
        return { error };
      }

      // Refresh profile
      const updatedProfile = await fetchProfile(user.id);
      setProfile(updatedProfile);

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const updateStatus = async (status: AttendantProfile['status']) => {
    if (!user) return;

    try {
      // Se não tem perfil, cria primeiro (usuários sem attendant_profile)
      let updated = profile;
      if (!profile) {
        updated = await ensureAttendantProfile(
          user.id,
          user.email || '',
          user.user_metadata?.full_name,
          status
        );
      } else {
        const { data, error } = await supabase
          .from('attendant_profiles')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating status:', error);
          return;
        }
        updated = data as unknown as AttendantProfile;
      }

      if (updated) setProfile({ ...updated, status });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const value = {
    user,
    session,
    role,
    profile,
    loading,
    signIn,
    signOut,
    updateProfile,
    updateStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
