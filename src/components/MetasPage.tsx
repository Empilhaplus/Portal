import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Target, Plus, CheckCircle, Loader, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

// Definindo o tipo da Meta para uso neste arquivo
interface Goal {
  id: string;
  title: string;
  goal_type: 'complete_modules' | 'reach_level';
  target_value: number;
  is_completed: boolean;
  created_at: string;
}

export const MetasPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchGoals = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('study_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (err) {
      setError('Não foi possível carregar as metas.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleAddGoal = async (newGoal: { title: string; goal_type: 'complete_modules' | 'reach_level'; target_value: number }) => {
    if (!user) return;

    const { error } = await supabase
      .from('study_goals')
      .insert([{ ...newGoal, user_id: user.id }]);
    
    if (error) {
      alert('Ocorreu um erro ao salvar a meta.');
      console.error(error);
    } else {
      setIsModalOpen(false);
      fetchGoals(); // Recarrega a lista de metas
    }
  };

  const getProgress = (goal: Goal): { current: number; target: number } => {
    if (!user) return { current: 0, target: goal.target_value };
    switch (goal.goal_type) {
      case 'complete_modules':
        return { current: user.completedModules.length, target: goal.target_value };
      case 'reach_level':
        return { current: user.level, target: goal.target_value };
      default:
        return { current: 0, target: goal.target_value };
    }
  };

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <button onClick={() => navigate('/')} className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors mb-6">
          <ArrowLeft className="w-5 h-5" />
          <span>Voltar para o Dashboard</span>
        </button>
        <div className="text-center">
          <Target className="w-12 h-12 mx-auto text-[#0AFF0F] mb-4" />
          <h1 className="text-4xl font-bold">Minhas Metas de Estudo</h1>
          <p className="text-gray-400 mt-2">Defina seus objetivos e acompanhe seu progresso.</p>
        </div>
      </motion.div>

      <div className="flex justify-center">
        <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 bg-[#0AFF0F] text-black px-6 py-3 rounded-lg font-bold hover:bg-[#0AFF0F]/90 transition-colors">
          <Plus className="w-6 h-6" />
          <span>Adicionar Nova Meta</span>
        </button>
      </div>
      
      {loading && <div className="flex justify-center items-center p-8"><Loader className="animate-spin w-8 h-8 text-[#0AFF0F]" /></div>}
      {error && <div className="text-center text-red-500 font-medium bg-red-500/10 p-4 rounded-lg flex items-center justify-center gap-2"><AlertTriangle className="w-5 h-5"/>{error}</div>}
      
      {!loading && !error && goals.length === 0 && (
        <div className="text-center text-gray-400 p-8 border-2 border-dashed border-gray-700 rounded-xl">
          <h3 className="text-lg font-medium">Nenhuma meta definida.</h3>
          <p>Comece adicionando sua primeira meta de estudo acima!</p>
        </div>
      )}

      {!loading && !error && goals.length > 0 && (
        <div className="space-y-4">
          {goals.map(goal => {
            const progress = getProgress(goal);
            const percentage = Math.min((progress.current / progress.target) * 100, 100);
            return (
              <motion.div key={goal.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className={`p-6 rounded-lg border ${goal.is_completed ? 'bg-green-500/10 border-green-500' : 'bg-[#1E1E1E] border-gray-700'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-lg">{goal.title}</span>
                  {goal.is_completed ? (
                    <span className="flex items-center gap-2 text-sm text-green-400 font-medium"><CheckCircle className="w-5 h-5" />Concluída</span>
                  ) : (
                    <span className="text-sm font-medium text-gray-300">{progress.current} / {progress.target}</span>
                  )}
                </div>
                {!goal.is_completed && (
                  <div className="mt-4 bg-gray-700 rounded-full h-2.5">
                    <div className="bg-[#0AFF0F] h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && <AddGoalModal onClose={() => setIsModalOpen(false)} onAddGoal={handleAddGoal} />}
      </AnimatePresence>
    </div>
  );
};


// --- Componente do Modal para Adicionar Meta ---
interface AddGoalModalProps {
  onClose: () => void;
  onAddGoal: (goal: { title: string; goal_type: 'complete_modules' | 'reach_level'; target_value: number }) => Promise<void>;
}

const AddGoalModal: React.FC<AddGoalModalProps> = ({ onClose, onAddGoal }) => {
  const [title, setTitle] = useState('');
  const [goalType, setGoalType] = useState<'complete_modules' | 'reach_level'>('complete_modules');
  const [targetValue, setTargetValue] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || targetValue < 1) {
      alert('Por favor, preencha todos os campos.');
      return;
    }
    setIsSaving(true);
    await onAddGoal({ title, goal_type: goalType, target_value: targetValue });
    setIsSaving(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-[#1E1E1E] rounded-2xl p-8 border border-gray-700 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-center mb-6 text-white">Criar Nova Meta</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">Dê um título para sua Meta</label>
            <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Finalizar a primeira etapa" className="w-full bg-[#272525] border border-gray-600 rounded-lg p-2 text-white focus:ring-[#0AFF0F] focus:border-[#0AFF0F]" required />
          </div>
          <div>
            <label htmlFor="goalType" className="block text-sm font-medium text-gray-300 mb-1">Tipo de Meta</label>
            <select id="goalType" value={goalType} onChange={e => setGoalType(e.target.value as any)} className="w-full bg-[#272525] border border-gray-600 rounded-lg p-2 text-white focus:ring-[#0AFF0F] focus:border-[#0AFF0F]">
              <option value="complete_modules">Completar Módulos</option>
              <option value="reach_level">Alcançar Nível</option>
            </select>
          </div>
          <div>
            <label htmlFor="targetValue" className="block text-sm font-medium text-gray-300 mb-1">Objetivo (Quantidade)</label>
            <input type="number" id="targetValue" value={targetValue} onChange={e => setTargetValue(parseInt(e.target.value, 10))} min="1" className="w-full bg-[#272525] border border-gray-600 rounded-lg p-2 text-white focus:ring-[#0AFF0F] focus:border-[#0AFF0F]" required />
          </div>
          <div className="pt-4 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors">Cancelar</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-[#0AFF0F] text-black font-bold rounded-lg hover:bg-[#0AFF0F]/90 transition-colors disabled:bg-gray-500">
              {isSaving ? 'Salvando...' : 'Salvar Meta'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};