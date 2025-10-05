// src/components/ProfilePage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, User, Save, Loader, Star, TrendingUp, Award, AlertCircle } from 'lucide-react';

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number }> = ({ icon, label, value }) => (
  <div className="bg-background/50 p-4 rounded-lg flex items-center space-x-4">
    <div className="flex-shrink-0 text-secondary">
      {icon}
    </div>
    <div>
      <p className="text-sm text-text-secondary">{label}</p>
      <p className="text-xl font-bold text-text-primary">{value}</p>
    </div>
  </div>
);

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setCpf(user.cpf || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    setIsLoading(true);
    setMessage('');

    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({ 
        name: name.trim(),
        cpf: cpf.trim()
      })
      .eq('id', user.id);

    if (profileUpdateError) {
      setMessage('Erro ao atualizar o perfil.');
      setIsLoading(false);
      console.error(profileUpdateError);
      return;
    }

    await refreshUser();
    
    setIsLoading(false);
    setMessage('Perfil atualizado com sucesso!');
  };

  if (!user) {
    return <div className="text-white text-center p-8">Carregando perfil...</div>;
  }

  const isProfileIncomplete = !user.name || !user.cpf;
  const pointsForNextLevel = user.level * 100;
  const pointsCurrentLevel = (user.level - 1) * 100;
  const progressPercentage = ((user.totalPoints - pointsCurrentLevel) / (pointsForNextLevel - pointsCurrentLevel)) * 100;

  return (
    <div className="space-y-8 max-w-4xl mx-auto text-white">
      <button onClick={() => navigate('/')} className="flex items-center space-x-2 text-text-secondary hover:text-white transition-colors">
        <ArrowLeft className="w-5 h-5" />
        <span>Voltar para o Dashboard</span>
      </button>

      <div className="bg-primary p-6 md:p-8 rounded-2xl border border-gray-700">
        <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6 mb-8">
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-center md:text-left">{user.name}</h1>
            <p className="text-gray-400 text-center md:text-left">{user.email}</p>
          </div>
        </div>
        
        <h2 className="text-xl font-bold mb-4 text-text-primary">Meu Progresso</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <StatCard icon={<Star size={24} />} label="Pontos Totais" value={user.totalPoints} />
          <StatCard icon={<TrendingUp size={24} />} label="Nível Atual" value={user.level} />
          <StatCard icon={<Award size={24} />} label="Certificados" value={user.hasCertificates ? '1+' : 0} />
        </div>

        <div>
          <div className="flex justify-between items-end mb-1">
            <span className="text-sm font-bold text-text-primary">Progresso para o Nível {user.level + 1}</span>
            <span className="text-xs text-text-secondary">{user.totalPoints} / {pointsForNextLevel} pts</span>
          </div>
          <div className="w-full bg-background rounded-full h-4 border border-gray-700">
            <div className="bg-secondary h-full rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
          </div>
        </div>
      </div>

      {isProfileIncomplete && (
        <div className="bg-yellow-500/10 border border-yellow-500 text-yellow-300 p-4 rounded-lg flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-bold">Perfil Incompleto</h3>
            <p className="text-sm">Para garantir que seus certificados sejam emitidos com os dados corretos, por favor, preencha seu nome completo e CPF abaixo.</p>
          </div>
        </div>
      )}

      <div className="bg-primary p-6 md:p-8 rounded-2xl border border-gray-700">
        <h2 className="text-xl font-bold mb-4 text-text-primary">Editar Perfil</h2>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">Nome Completo</label>
              <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-background border border-gray-600 rounded-lg p-3 text-white focus:ring-secondary focus:border-secondary" required />
            </div>
            
            <div>
              <label htmlFor="cpf" className="block text-sm font-medium text-gray-300 mb-2">CPF</label>
              <input type="text" id="cpf" value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" className="w-full bg-background border border-gray-600 rounded-lg p-3 text-white focus:ring-secondary focus:border-secondary" required={isProfileIncomplete} />
            </div>
          
            <div className="mt-6 flex items-center justify-between">
              <button type="submit" disabled={isLoading} className="flex items-center justify-center gap-2 bg-secondary text-primary px-5 py-2.5 rounded-lg font-bold hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {isLoading ? <Loader className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
                <span>{isLoading ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>
              {message && <p className={`text-sm ${message.includes('Erro') ? 'text-red-400' : 'text-green-400'}`}>{message}</p>}
            </div>
        </form>
      </div>
    </div>
  );
};