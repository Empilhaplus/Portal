// src/components/AchievementCard.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Award, CheckCircle, Lock } from 'lucide-react';
import { Achievement } from '../types';

interface AchievementCardProps {
  achievement: Achievement;
  index: number;
}

export const AchievementCard: React.FC<AchievementCardProps> = ({ achievement, index }) => {
  const { title, description, points, unlocked } = achievement;

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: index * 0.1 } },
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className={`
        bg-[#1E1E1E] rounded-xl p-6 text-center transition-all duration-300
        flex flex-col items-center justify-between
        ${unlocked ? 'border-2 border-[#0AFF0F]' : 'border border-gray-700 opacity-60'}
      `}
    >
      <div className="flex-grow flex flex-col items-center">
        <div className={`
          w-20 h-20 rounded-full mb-4 flex items-center justify-center
          ${unlocked ? 'bg-[#0AFF0F]' : 'bg-gray-600'}
        `}>
          <Award className={`w-10 h-10 ${unlocked ? 'text-black' : 'text-gray-400'}`} />
        </div>
        <h3 className={`font-bold text-lg ${unlocked ? 'text-white' : 'text-gray-300'}`}>{title}</h3>
        <p className="text-gray-400 text-sm mt-2">{description}</p>
      </div>
      
      <div className="mt-6 w-full">
        <p className={`font-bold text-xl ${unlocked ? 'text-[#0AFF0F]' : 'text-gray-500'}`}>
          + {points} pts
        </p>
        {unlocked && (
          <div className="flex items-center justify-center space-x-2 text-xs text-green-400 mt-2">
            <CheckCircle className="w-4 h-4" />
            <span>Desbloqueado</span>
          </div>
        )}
        {!unlocked && (
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-400 mt-2">
            <Lock className="w-4 h-4" />
            <span>Bloqueado</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};