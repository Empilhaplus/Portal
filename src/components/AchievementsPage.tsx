// src/components/AchievementsPage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AchievementCard } from './AchievementCard'; // Importamos o novo componente

export const AchievementsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Pegamos a lista de conquistas do usuário, que já contém o status 'unlocked'
  const achievements = user?.achievements || [];

  return (
    <div className="space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Voltar para o Dashboard</span>
        </button>
        <div className="text-center">
          <Trophy className="w-12 h-12 mx-auto text-[#0AFF0F] mb-4" />
          <h1 className="text-4xl font-bold">Mural de Conquistas</h1>
          <p className="text-gray-400 mt-2">Aqui estão todas as suas medalhas e desafios.</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {achievements.map((achievement, index) => (
          <AchievementCard 
            key={achievement.id} 
            achievement={achievement}
            index={index} 
          />
        ))}
      </div>
    </div>
  );
};