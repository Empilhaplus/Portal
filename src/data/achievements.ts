import { Achievement } from '../types';

export const achievements: Achievement[] = [
  {
    id: 'first-module',
    title: 'Primeiro Passo',
    description: 'Complete seu primeiro módulo do curso',
    icon: 'Trophy',
    unlocked: false,
    points: 50,
    condition: { type: 'modules_completed', value: 1 }
  },
  {
    id: 'streak-3',
    title: 'Dedicação Constante',
    description: 'Complete 3 módulos seguidos',
    icon: 'Flame',
    unlocked: false,
    points: 100,
    condition: { type: 'modules_completed', value: 3 }
  },
  {
    id: 'streak-5',
    title: 'Persistência Exemplar',
    description: 'Complete 5 módulos seguidos',
    icon: 'Target',
    unlocked: false,
    points: 150,
    condition: { type: 'modules_completed', value: 5 }
  },
  {
    id: 'perfectionist',
    title: 'Mente Brilhante', // Title was changed to match the one in the database
    description: 'Obtenha 100% em um quiz', // Description updated for clarity
    icon: 'Star',
    unlocked: false,
    points: 200, // Points updated to match the one in the database
    condition: { type: 'perfect_score', value: 1 } // Value changed to 1 for a single perfect score
  },
  {
    id: 'scholar',
    title: 'Estudioso Dedicado',
    description: 'Complete metade do curso (6 módulos)',
    icon: 'BookOpen',
    unlocked: false,
    points: 400,
    condition: { type: 'modules_completed', value: 6 }
  },
  {
    id: 'master',
    title: 'Mestre do Método VAP',
    description: 'Complete todos os módulos do curso',
    icon: 'Crown',
    unlocked: false,
    points: 500,
    condition: { type: 'modules_completed', value: 12 }
  },
  {
    id: 'legendary',
    title: 'Legenda VAP',
    description: 'Alcance o nível 10 ou superior',
    icon: 'Award',
    unlocked: false,
    points: 600,
    condition: { type: 'level_reached', value: 10 }
  },
  // **CORRECTION WAS HERE**: A comma was missing and the object was outside the array.
  {
    id: 'goal-master',
    title: 'Mestre das Metas',
    description: 'Cumpra sua primeira meta de estudos',
    icon: 'Flag',
    unlocked: false,
    points: 150,
    condition: { type: 'goals_completed', value: 1 }
  }
];