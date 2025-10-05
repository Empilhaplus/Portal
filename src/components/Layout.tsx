// src/components/Layout.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { LogOut, User, Trophy, Star, HardHat, Award, SlidersHorizontal } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <header className="bg-primary border-b border-gray-700 sticky top-0 z-50 backdrop-blur-sm bg-primary/95">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-3">
              <motion.div 
                className="flex items-center space-x-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                  <HardHat className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Empilha+Plus</h1>
                  <p className="text-xs text-text-secondary">Treinamentos</p>
                </div>
              </motion.div>
            </Link>
            
            {user && (
              <motion.div 
                className="flex items-center space-x-4 md:space-x-6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="hidden md:flex items-center space-x-6 text-sm">
                  <div className="flex items-center space-x-2 bg-background/50 px-3 py-2 rounded-lg">
                    <Trophy className="w-4 h-4 text-secondary" />
                    <span className="font-medium">{user.totalPoints}</span>
                    <span className="text-text-secondary">pts</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-background/50 px-3 py-2 rounded-lg">
                    <Star className="w-4 h-4 text-secondary" />
                    <span className="font-medium">Nível {user.level}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  {user.role === 'admin' && (
                    <Link 
                      to={location.pathname === '/admin' ? '/' : '/admin'}
                      title={location.pathname === '/admin' ? 'Sair do Painel do Admin' : 'Painel do Administrador'}
                      className={`p-2 rounded-full transition-colors ${location.pathname === '/admin' ? 'bg-secondary/20' : 'hover:bg-background/50'}`}
                    >
                      <SlidersHorizontal className={`w-5 h-5 transition-colors ${location.pathname === '/admin' ? 'text-secondary' : 'text-text-secondary'}`} />
                    </Link>
                  )}
                  
                  <NavLink 
                    to="/certificados" 
                    title="Meus Certificados" 
                    className={({ isActive }) => 
                      `p-2 rounded-full transition-colors ${isActive ? 'bg-secondary/20' : 'hover:bg-background/50'}`
                    }
                  >
                    {({ isActive }) => (
                      <Award className={`w-5 h-5 transition-colors ${isActive || user.hasCertificates ? 'text-secondary' : 'text-text-secondary'}`} />
                    )}
                  </NavLink>
                  
                  <div className="w-px h-6 bg-gray-700 hidden sm:block"></div>
                  
                  {/* <<< ALTERAÇÃO AQUI: ADICIONADO O LINK PARA O PERFIL >>> */}
                  <Link to="/perfil" className="flex items-center space-x-2 p-2 rounded-lg transition-colors hover:bg-background/50">
                    <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <span className="hidden sm:block font-medium">{user.name}</span>
                  </Link>
                  {/* <<< FIM DA ALTERAÇÃO >>> */}
                  
                  <button
                    onClick={logout}
                    title="Sair"
                    className="flex items-center justify-center w-10 h-10 bg-red-600 hover:bg-red-700 rounded-full transition-colors text-sm"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};