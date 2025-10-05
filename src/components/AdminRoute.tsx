import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface AdminRouteProps {
  children: React.ReactElement;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    // Pode adicionar um componente de loading aqui se quiser
    return <div>Carregando...</div>;
  }

  // Se o usuário não for admin, redireciona para a página inicial
  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // Se for admin, renderiza a página solicitada
  return children;
};

export default AdminRoute;