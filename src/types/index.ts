// src/types/index.ts (ou o nome do seu arquivo de tipos)

// Define a estrutura de um Módulo do curso
export interface Module {
  id: number;
  title: string;
  description: string;
  videoUrl: string;
  completed: boolean;
  locked: boolean;
  points: number;
  estimatedTime: number;
  exerciseFile: string;
}

// Define os tipos de condição para uma conquista
export type AchievementConditionType = 
  | 'modules_completed'
  | 'study_time'
  | 'streak'
  | 'perfect_score'
  | 'speed'
  | 'total_points'
  | 'level_reached'
  | 'goals_completed';

// Define a estrutura de uma Conquista
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  points: number;
  condition: {
    type: AchievementConditionType;
    value: number;
  };
}

// <<< INTERFACE USER CORRIGIDA E UNIFICADA >>>
// Juntamos as duas declarações em uma só e adicionamos o campo 'cpf'.
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  cpf: string | null; // <<< Adicionado para o certificado
  totalPoints: number;
  level: number;
  completedModules: number[];
  achievements: Achievement[];
  totalTimeStudied: number;
  currentStreak: number;
  lastStudyDate: string;
  enrolledCourseIds: string[];
  hasCertificates: boolean;
}

// Define o resultado de um exercício
export interface ExerciseResult {
  courseId: string;
  score: number;
  totalQuestions: number;
  completedAt: Date;
}