// src/context/StudyContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ExerciseResult, User as AppUser } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface StudyContextType {
  exerciseResults: ExerciseResult[];
  addExerciseResult: (result: ExerciseResult) => Promise<void>;
  getModuleExerciseScore: (courseId: string) => number | null; // Alterado para courseId
}

const StudyContext = createContext<StudyContextType | undefined>(undefined);

export const useStudy = () => {
  const context = useContext(StudyContext);
  if (!context) throw new Error('useStudy must be used within a StudyProvider');
  return context;
};

export const StudyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [exerciseResults, setExerciseResults] = useState<ExerciseResult[]>([]);
  const { user, refreshUser } = useAuth();

  useEffect(() => {
    const fetchInitialData = async (currentUser: AppUser) => {
      // Busca os resultados existentes do usuário
      const { data } = await supabase
        .from('exercise_results')
        .select('*')
        .eq('user_id', currentUser.id);
      
      if (data) {
        const results: ExerciseResult[] = data.map(r => ({
          courseId: r.course_id, // ALTERADO de module_id
          score: r.score,
          totalQuestions: r.total_questions,
          completedAt: new Date(r.completed_at),
        }));
        setExerciseResults(results);
      }
    };

    if (user) {
      fetchInitialData(user);
    }
  }, [user]);

  const addExerciseResult = async (result: ExerciseResult) => {
    if (!user) return;

    // Atualiza o estado local com o novo resultado
    const updatedResults = [...exerciseResults.filter(r => r.courseId !== result.courseId), result];
    setExerciseResults(updatedResults);

    // Usa "upsert" para inserir um novo resultado ou atualizar um existente
    await supabase.from('exercise_results').upsert({
      user_id: user.id,
      course_id: result.courseId, // ALTERADO de module_id
      score: result.score,
      total_questions: result.totalQuestions,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,course_id' }); // ALTERADO o campo de conflito

    // A lógica de gamificação (checkAndAwardAchievements) pode precisar de ajustes futuros,
    // mas a base para salvar o resultado agora está correta.
    // Por enquanto, vamos apenas garantir que o refreshUser seja chamado.
    await refreshUser();
  };

  const getModuleExerciseScore = (courseId: string): number | null => { // ALTERADO para courseId
    const result = exerciseResults.find(r => r.courseId === courseId); // ALTERADO para courseId
    if (!result) return null;
    return Math.round((result.score / result.totalQuestions) * 100);
  };

  return (
    <StudyContext.Provider value={{ exerciseResults, addExerciseResult, getModuleExerciseScore }}>
      {children}
    </StudyContext.Provider>
  );
};