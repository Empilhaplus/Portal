import { supabase } from './supabase';
import { User as AppUser, ExerciseResult } from '../types';

/**
 * Verifica as metas ativas do usuário, marca como concluídas se atingidas,
 * e então chama o motor de conquistas.
 */
export const checkAndRewardGoals = async (user: AppUser): Promise<boolean> => {
  const { data: goals, error } = await supabase
    .from('study_goals')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_completed', false);

  // Tratamento de erro adicionado
  if (error) {
    console.error("Erro ao buscar metas:", error);
    return false;
  }
  
  if (!goals || goals.length === 0) {
    return false;
  }

  const completedGoalIds: string[] = [];
  let goalsCompleted = false;

  for (const goal of goals) {
    let conditionMet = false;
    switch (goal.goal_type) {
      case 'complete_modules':
        if (user.completedModules.length >= goal.target_value) {
          conditionMet = true;
        }
        break;
      case 'reach_level':
        if (user.level >= goal.target_value) {
          conditionMet = true;
        }
        break;
    }

    if (conditionMet) {
      completedGoalIds.push(goal.id);
    }
  }

  if (completedGoalIds.length > 0) {
    await supabase
      .from('study_goals')
      .update({ is_completed: true, completed_at: new Date().toISOString() })
      .in('id', completedGoalIds);
    
    await checkAndAwardAchievements(user, []);
    goalsCompleted = true;
  }

  return goalsCompleted;
};


/**
 * Função central que verifica e concede conquistas.
 */
export const checkAndAwardAchievements = async (
  user: AppUser, 
  exerciseResults: ExerciseResult[]
): Promise<{ newAchievements: any[], pointsGained: number }> => {
  
  const { data: allDbAchievements } = await supabase.from('achievements').select('*');
  const { data: unlockedData } = await supabase.from('user_achievements').select('achievement_id').eq('user_id', user.id);
  
  if (!allDbAchievements) return { newAchievements: [], pointsGained: 0 };

  const unlockedAchievementUUIDs = new Set((unlockedData || []).map(a => a.achievement_id));
  const achievementsToCheck = allDbAchievements.filter(dbAch => !unlockedAchievementUUIDs.has(dbAch.id));

  if (achievementsToCheck.length === 0) return { newAchievements: [], pointsGained: 0 };

  const newlyUnlocked: any[] = [];
  let newPoints = 0;

  for (const achievement of achievementsToCheck) {
    let conditionMet = false;
    const slug = achievement.slug;

    if (slug === 'first-module' && user.completedModules.length >= 1) conditionMet = true;
    else if (slug === 'streak-3' && user.completedModules.length >= 3) conditionMet = true;
    else if (slug === 'streak-5' && user.completedModules.length >= 5) conditionMet = true;
    else if (slug === 'scholar' && user.completedModules.length >= 6) conditionMet = true;
    else if (slug === 'master' && user.completedModules.length >= 12) conditionMet = true;
    else if (slug === 'perfectionist' && exerciseResults.filter(r => (r.score / r.totalQuestions) * 100 === 100).length >= 1) conditionMet = true;
    else if (slug === 'legendary' && user.level >= 10) conditionMet = true;
    else if (slug === 'marathon' && user.totalPoints >= 1500) conditionMet = true;
    else if (slug === 'goal-master') {
      const { data: completedGoals, error: goalError } = await supabase.from('study_goals').select('id').eq('user_id', user.id).eq('is_completed', true);
      // Tratamento de erro adicionado
      if (goalError) {
        console.error("Erro ao verificar metas completas:", goalError);
      } else if (completedGoals && completedGoals.length >= 1) {
        conditionMet = true;
      }
    }

    if (conditionMet) {
      newlyUnlocked.push({ user_id: user.id, achievement_id: achievement.id });
      newPoints += achievement.points_reward;
    }
  }

  if (newlyUnlocked.length > 0) {
    await supabase.from('user_achievements').insert(newlyUnlocked);
    await supabase.from('profiles').update({ total_points: user.totalPoints + newPoints }).eq('id', user.id);
    return { newAchievements: newlyUnlocked, pointsGained: newPoints };
  }

  return { newAchievements: [], pointsGained: 0 };
};