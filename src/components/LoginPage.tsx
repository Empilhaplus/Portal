import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const success = await login(email, password);
      if (!success) {
        setError('Email ou senha inválidos');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError('Erro ao tentar login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1E1E1E] px-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-[#272525] p-8 rounded-2xl shadow-lg border border-gray-700 w-full max-w-md"
      >
        <h2 className="text-3xl font-bold text-center text-white mb-6">
          Acesso ao Portal Método VAP
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white mb-1">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              // A MUDANÇA ESTÁ AQUI: adicionei "text-white"
              className="w-full px-4 py-2 rounded bg-[#1E1E1E] border border-gray-600 focus:outline-none focus:border-[#0AFF0F] text-white"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-white mb-1">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              // E A MUDANÇA ESTÁ AQUI TAMBÉM: adicionei "text-white"
              className="w-full px-4 py-2 rounded bg-[#1E1E1E] border border-gray-600 focus:outline-none focus:border-[#0AFF0F] text-white"
              placeholder="Digite sua senha"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#0AFF0F] text-black font-semibold py-2 rounded hover:bg-[#0aff0fc5] transition-colors"
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
        </form>
      </motion.div>
    </div>
  );
};

export default LoginPage;
