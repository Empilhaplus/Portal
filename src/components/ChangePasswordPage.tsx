import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const ChangePasswordPage: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmNewPassword) {
      setError('A nova senha e a confirmação não coincidem.');
      return;
    }

    if (newPassword.length < 6) {
        setError('A nova senha deve ter no mínimo 6 caracteres.');
        return;
    }
    
    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError) {
      setError(`Erro ao atualizar senha: ${updateError.message}`);
      setLoading(false);
      return;
    }

    setSuccess('Senha alterada com sucesso! Você será desconectado.');
    setLoading(false);
    
    setTimeout(() => {
      logout();
      navigate('/login');
    }, 2500);
  };

  return (
    <div className="space-y-6 text-white max-w-2xl mx-auto p-4 md:p-0">
      <button onClick={() => navigate('/dashboard')} className="text-[#0AFF0F] hover:underline mb-4 inline-block">
        &larr; Voltar para o Dashboard
      </button>
      <h1 className="text-3xl font-bold">Alterar Senha</h1>

      <form onSubmit={handleChangePassword} className="bg-[#1E1E1E] rounded-xl p-6 border border-gray-700 space-y-4">
        <div>
          <label htmlFor="new-password" className="block text-sm font-medium text-gray-400 mb-2">
            Nova Senha
          </label>
          <input
            id="new-password"
            type="password"
            placeholder="Pelo menos 6 caracteres"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full p-2 rounded border border-gray-600 bg-[#272525] text-white focus:ring-[#0AFF0F] focus:border-[#0AFF0F]"
          />
        </div>
        
        <div>
          <label htmlFor="confirm-new-password" className="block text-sm font-medium text-gray-400 mb-2">
            Confirme a Nova Senha
          </label>
          <input
            id="confirm-new-password"
            type="password"
            placeholder="Repita a nova senha"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            className="w-full p-2 rounded border border-gray-600 bg-[#272525] text-white focus:ring-[#0AFF0F] focus:border-[#0AFF0F]"
          />
        </div>

        <div>
          <button type="submit" disabled={loading} className="w-full bg-[#0AFF0F] text-black p-3 rounded-lg font-bold hover:bg-[#0AFF0F]/90 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed">
            {loading ? 'Alterando...' : 'Alterar Senha'}
          </button>
        </div>
      </form>
      
      {success && <p className="text-center text-green-400 mt-4">{success}</p>}
      {error && <p className="text-center text-red-400 mt-4">{error}</p>}
    </div>
  );
};