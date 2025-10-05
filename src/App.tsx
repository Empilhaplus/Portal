// src/App.tsx - VERSÃO CORRIGIDA E COMPLETA
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { StudyProvider } from './context/StudyContext';
import { Layout } from './components/Layout';
import LoginPage from './components/LoginPage';
import { Dashboard } from './components/Dashboard';
import { CoursePage } from './components/CoursePage';
import { AdminPanel } from './components/AdminPanel';
import { ChangePasswordPage } from './components/ChangePasswordPage';
import ProtectedRoute from './components/ProtectedRoute';
import { MetasPage } from './components/MetasPage';
import { AchievementsPage } from './components/AchievementsPage';
import { ProfilePage } from './components/ProfilePage';
import { FinalTestPage } from './components/FinalTestPage';
import { CertificatesPage } from './components/CertificatesPage'; // Importa a página de certificados

function App() {
  return (
    <AuthProvider>
      <StudyProvider>
        <Router>
          <Layout>
            <Routes> {/* Tag de abertura */}
              <Route path="/login" element={<LoginPage />} />

              {/* Rota Principal (Dashboard) */}
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

              {/* Rota para a página de um curso específico */}
              <Route path="/course/:courseId" element={<ProtectedRoute><CoursePage /></ProtectedRoute>} />
              
              {/* Rota para o teste final */}
              <Route path="/course/:courseId/test" element={<ProtectedRoute><FinalTestPage /></ProtectedRoute>} />

              {/* Rota para a página de certificados */}
              <Route path="/certificados" element={<ProtectedRoute><CertificatesPage /></ProtectedRoute>} />

              {/* Outras rotas do seu portal */}
              <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
              <Route path="/alterar-senha" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
              <Route path="/conquistas" element={<ProtectedRoute><AchievementsPage /></ProtectedRoute>} />
              <Route path="/perfil" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/metas" element={<ProtectedRoute><MetasPage /></ProtectedRoute>} />

              {/* Rota Coringa - Redireciona para a página inicial */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes> {/* <<< Tag de fechamento que estava faltando >>> */}
          </Layout>
        </Router>
      </StudyProvider>
    </AuthProvider>
  );
}

export default App;