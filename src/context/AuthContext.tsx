// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { User as AppUser, Achievement } from '../types'; // Verifique se o tipo AppUser está correto
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: AppUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// Se seu tipo 'User' estiver em 'types.ts', você precisará adicionar 'cpf' lá também.
// Por simplicidade, estou assumindo que está aqui ou que você fará o ajuste.
// A interface AppUser precisa ser atualizada para incluir o cpf
export interface UpdatedAppUser extends AppUser {
    cpf: string | null;
}


export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UpdatedAppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async (supabaseUser: SupabaseUser) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*') // O '*' já vai incluir a nova coluna 'cpf'
        .eq('id', supabaseUser.id)
        .single();
      if (profileError) throw profileError;

      // ... (resto da busca de dados, sem alterações)
      const { data: enrolledCoursesData, error: coursesError } = await supabase.from('user_courses').select('course_id').eq('user_id', supabaseUser.id);
      if (coursesError) throw coursesError;
      const enrolledCourseIds = enrolledCoursesData?.map(c => c.course_id) || [];
      const { data: allDbAchievements, error: allAchievementsError } = await supabase.from('achievements').select('*');
      if (allAchievementsError) throw allAchievementsError;
      const { data: unlockedAchievementsData, error: achievementsError } = await supabase.from('user_achievements').select('achievement_id').eq('user_id', supabaseUser.id);
      if (achievementsError) throw achievementsError;
      const unlockedIds = new Set((unlockedAchievementsData || []).map(a => a.achievement_id));
      const userAchievements: Achievement[] = (allDbAchievements || []).map(dbAch => ({
        id: dbAch.slug,
        title: dbAch.title,
        description: dbAch.description,
        icon: dbAch.icon_name,
        points: dbAch.points_reward,
        unlocked: unlockedIds.has(dbAch.id),
        condition: { type: dbAch.slug, value: 0 }
      }));
      const { count: certificateCount, error: certificateError } = await supabase.from('certificates').select('id', { count: 'exact', head: true }).eq('user_id', supabaseUser.id);
      if (certificateError) throw certificateError;

      const fullUser: UpdatedAppUser = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: profileData.name || 'Usuário',
        role: profileData.role || 'user',
        totalPoints: profileData.total_points || 0,
        level: profileData.level || 1,
        cpf: profileData.cpf || null, // <<< ADICIONADO AQUI
        completedModules: profileData.completed_modules || [],
        totalTimeStudied: profileData.total_time_studied || 0,
        achievements: userAchievements,
        currentStreak: 0,
        lastStudyDate: new Date().toISOString().split('T')[0],
        enrolledCourseIds: enrolledCourseIds,
        hasCertificates: (certificateCount ?? 0) > 0,
      };
      
      setUser(fullUser);
    } catch (error) {
      console.error("AuthContext: Erro ao buscar perfil completo:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const supabaseUser = session?.user;
      if (supabaseUser) {
        fetchUserProfile(supabaseUser);
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const login = async (email: string, password: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return !error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };
  
  const refreshUser = useCallback(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if(session?.user) {
          await fetchUserProfile(session.user);
      }
  }, [fetchUserProfile]);

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser, loading, isAuthenticated: !!user }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};