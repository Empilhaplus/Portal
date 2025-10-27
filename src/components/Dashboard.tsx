// src/components/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Award, User, AlertCircle, ArrowRight } from 'lucide-react';

// Novo tipo, incluindo image_url
interface CourseWithProgress {
  id: string;
  title: string;
  description: string;
  progress_percentage: number;
  image_url: string | null; // Pode ser nulo se não houver imagem
}

// Componente ProgressBar (sem alterações)
const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => {
  // ... (código da ProgressBar como antes) ...
  const roundedProgress = Math.round(progress); return ( <div> <div className="flex justify-between items-center mb-1"> <span className="text-xs font-semibold text-text-secondary">PROGRESSO</span> <span className="text-sm font-bold text-secondary">{roundedProgress}%</span> </div> <div className="w-full bg-background rounded-full h-2.5 border border-gray-700"> <div className="bg-secondary h-full rounded-full transition-all duration-500" style={{ width: `${roundedProgress}%` }}></div> </div> </div> );
};

export const Dashboard: React.FC = () => {
  const [courses, setCourses] = useState<CourseWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      setLoading(true);
      // A função RPC já retorna image_url agora
      const { data, error } = await supabase.rpc('get_user_dashboard_data');

      if (error) {
        console.error('Erro ao buscar os dados do dashboard:', error);
      } else if (data) {
        // O tipo do 'data' já deve corresponder a CourseWithProgress[]
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
      {/* --- Seção de Boas-Vindas (sem alterações) --- */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-text-primary">
          Bem-vindo de volta, <span className="text-secondary">{user?.name || 'Aluno'}</span>!
        </h1>
        <p className="text-text-secondary mt-2">Pronto para continuar de onde parou?</p>
      </div>

      {/* --- Alerta de Perfil Incompleto (sem alterações) --- */}
      {isProfileIncomplete && (
         <div className="bg-yellow-500/10 border border-yellow-500 text-yellow-300 p-4 rounded-lg flex items-start space-x-3"> <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" /> <div> <h3 className="font-bold">Ação Necessária: Complete seu Perfil</h3> <p className="text-sm mb-3">Seu nome e CPF são essenciais para a emissão correta dos seus certificados.</p> <Link to="/perfil" className="inline-flex items-center gap-2 bg-yellow-500 text-black font-bold py-2 px-4 rounded-lg hover:bg-yellow-400 transition-colors text-sm"> Completar Perfil <ArrowRight size={16} /> </Link> </div> </div>
      )}

      {/* --- Layout Principal (sem alterações na estrutura geral) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

        {/* --- Coluna Principal: Meus Cursos --- */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-bold text-text-primary">Meus Cursos Matriculados</h2>
          {courses.length > 0 ? (
            courses.map(course => (
              // ✅ Card do Curso MODIFICADO para incluir a imagem
              <div key={course.id} className="bg-primary border border-gray-700 rounded-lg overflow-hidden transition-all hover:border-secondary/50 flex flex-col"> {/* Adicionado overflow-hidden e flex-col */}

                {/* --- Imagem do Curso (NOVO) --- */}
                {course.image_url && ( // Só mostra se a URL existir
                  <div className="w-full h-40 bg-background/50"> {/* Altura fixa para o banner */}
                      <img
                        src={course.image_url}
                        alt={`Imagem do curso ${course.title}`}
                        className="w-full h-full object-cover" // object-cover garante que a imagem preencha o espaço sem distorcer
                      />
                  </div>
                )}

                {/* --- Conteúdo do Card (agora com padding aqui) --- */}
                <div className="p-6 flex flex-col flex-grow"> {/* Adicionado flex-grow */}
                  <h3 className="text-xl font-bold text-text-primary">{course.title}</h3>
                  <p className="text-text-secondary mt-2 mb-6 flex-grow">{course.description}</p> {/* Adicionado flex-grow */}
                  <div className="mt-auto"> {/* Empurra progresso e botão para baixo */}
                      <ProgressBar progress={course.progress_percentage} />
                      <div className="mt-6">
                        <Link to={`/course/${course.id}`} className="inline-block bg-secondary hover:bg-accent text-primary font-bold py-2.5 px-6 rounded-lg transition-colors">
                          {course.progress_percentage > 0 ? 'Continuar Treinamento' : 'Iniciar Treinamento'}
                        </Link>
                      </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-primary border border-dashed border-gray-700 rounded-lg p-8 text-center">
                <p className="text-text-secondary">Você ainda não está matriculado em nenhum curso.</p>
                {/* ... */}
            </div>
          )}
        </div>

        {/* --- Coluna Lateral: Widgets (sem alterações) --- */}
        <div className="space-y-6 lg:sticky lg:top-24">
             <div className="bg-primary border border-gray-700 rounded-lg p-6"> <h3 className="font-bold text-lg mb-4 flex items-center gap-3"><Award className="text-secondary" /> Meus Certificados</h3> <p className="text-text-secondary text-sm mb-4"> Acesse e baixe aqui os certificados de todos os treinamentos que você já concluiu. </p> <Link to="/certificados" className="w-full text-center block bg-background/50 hover:bg-background text-text-primary font-bold py-2.5 px-5 rounded-lg transition-colors"> Ver Certificados </Link> </div> <div className="bg-primary border border-gray-700 rounded-lg p-6"> <h3 className="font-bold text-lg mb-4 flex items-center gap-3"><User className="text-secondary" /> Meu Perfil</h3> <p className="text-text-secondary text-sm mb-4"> Mantenha seus dados, como nome e CPF, sempre atualizados para a correta emissão dos certificados. </p> <Link to="/perfil" className="w-full text-center block bg-background/50 hover:bg-background text-text-primary font-bold py-2.5 px-5 rounded-lg transition-colors"> Editar Perfil </Link> </div>
        </div>
      </div>
    </div>
  );
};