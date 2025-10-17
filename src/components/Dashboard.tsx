// src/components/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Award, User, AlertCircle, ArrowRight } from 'lucide-react';

// Novo tipo para os dados do curso, agora incluindo o progresso
interface CourseWithProgress {
  id: string;
  title: string;
  description: string;
  progress_percentage: number;
}

// Componente para a Barra de Progresso
const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => {
  const roundedProgress = Math.round(progress);
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-semibold text-text-secondary">PROGRESSO</span>
        <span className="text-sm font-bold text-secondary">{roundedProgress}%</span>
      </div>
      <div className="w-full bg-background rounded-full h-2.5 border border-gray-700">
        <div 
          className="bg-secondary h-full rounded-full transition-all duration-500" 
          style={{ width: `${roundedProgress}%` }}
        ></div>
      </div>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const [courses, setCourses] = useState<CourseWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      setLoading(true);
      // Chamamos a função que criamos no Passo 1
      const { data, error } = await supabase.rpc('get_user_dashboard_data');

      if (error) {
        console.error('Erro ao buscar os dados do dashboard:', error);
      } else if (data) {
        setCourses(data);
      }
      setLoading(false);
    };
    fetchDashboardData();
  }, [user]);

  const isProfileIncomplete = !user?.name || !user?.cpf;

  if (loading) {
    return <div className="text-center text-text-primary p-8">Carregando seus treinamentos...</div>;
  }

  return (
    <div className="space-y-8">
      {/* --- Seção de Boas-Vindas --- */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-text-primary">
          Bem-vindo de volta, <span className="text-secondary">{user?.name || 'Aluno'}</span>!
        </h1>
        <p className="text-text-secondary mt-2">Pronto para continuar de onde parou?</p>
      </div>

      {/* --- Alerta de Perfil Incompleto (se necessário) --- */}
      {isProfileIncomplete && (
        <div className="bg-yellow-500/10 border border-yellow-500 text-yellow-300 p-4 rounded-lg flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-bold">Ação Necessária: Complete seu Perfil</h3>
            <p className="text-sm mb-3">Seu nome e CPF são essenciais para a emissão correta dos seus certificados.</p>
            <Link to="/perfil" className="inline-flex items-center gap-2 bg-yellow-500 text-black font-bold py-2 px-4 rounded-lg hover:bg-yellow-400 transition-colors text-sm">
              Completar Perfil <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      )}
      
      {/* --- Layout Principal do Dashboard (Grid) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* --- Coluna Principal: Meus Cursos --- */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-bold text-text-primary">Meus Cursos Matriculados</h2>
          {courses.length > 0 ? (
            courses.map(course => (
              <div key={course.id} className="bg-primary border border-gray-700 rounded-lg p-6 transition-all hover:border-secondary/50">
                <h3 className="text-xl font-bold text-text-primary">{course.title}</h3>
                <p className="text-text-secondary mt-2 mb-6">{course.description}</p>
                <ProgressBar progress={course.progress_percentage} />
                <div className="mt-6">
                  <Link to={`/course/${course.id}`} className="inline-block bg-secondary hover:bg-accent text-primary font-bold py-2.5 px-6 rounded-lg transition-colors">
                    {course.progress_percentage > 0 ? 'Continuar Treinamento' : 'Iniciar Treinamento'}
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-primary border border-dashed border-gray-700 rounded-lg p-8 text-center">
                <p className="text-text-secondary">Você ainda não está matriculado em nenhum curso.</p>
                <p className="text-text-secondary text-sm mt-1">Contate o administrador para liberar seu acesso.</p>
            </div>
          )}
        </div>

        {/* --- Coluna Lateral: Widgets --- */}
        <div className="space-y-6 lg:sticky lg:top-24">
            <div className="bg-primary border border-gray-700 rounded-lg p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-3"><Award className="text-secondary" /> Meus Certificados</h3>
                <p className="text-text-secondary text-sm mb-4">
                  Acesse e baixe aqui os certificados de todos os treinamentos que você já concluiu.
                </p>
                <Link to="/certificados" className="w-full text-center block bg-background/50 hover:bg-background text-text-primary font-bold py-2.5 px-5 rounded-lg transition-colors">
                  Ver Certificados
                </Link>
            </div>
            <div className="bg-primary border border-gray-700 rounded-lg p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-3"><User className="text-secondary" /> Meu Perfil</h3>
                <p className="text-text-secondary text-sm mb-4">
                  Mantenha seus dados, como nome e CPF, sempre atualizados para a correta emissão dos certificados.
                </p>
                <Link to="/perfil" className="w-full text-center block bg-background/50 hover:bg-background text-text-primary font-bold py-2.5 px-5 rounded-lg transition-colors">
                  Editar Perfil
                </Link>
            </div>
        </div>
      </div>
    </div>
  );
};