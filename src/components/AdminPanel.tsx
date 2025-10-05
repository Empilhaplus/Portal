// src/components/AdminPanel.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { X } from 'lucide-react';

// Tipos para os dados que vamos usar
interface UserProfile {
  id: string;
  role: string;
  name: string;
}
interface Course {
  id: string;
  title: string;
}

export const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para gerenciar o modal
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [userEnrollments, setUserEnrollments] = useState<Set<string>>(new Set());
  const [pendingEnrollments, setPendingEnrollments] = useState<Set<string>>(new Set());
  const [isModalLoading, setIsModalLoading] = useState(false);

  // Efeito para buscar a lista inicial de usuários
  useEffect(() => {
    const fetchProfiles = async () => {
      const { data, error } = await supabase.from('profiles').select(`id, role, name`);
      if (error) {
        console.error("Erro ao buscar perfis:", error);
      } else {
        setProfiles(data || []);
      }
      setLoading(false);
    };

    if (user?.role === 'admin') {
      fetchProfiles();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Função para abrir o modal e buscar os dados necessários
  const handleManageClick = async (profile: UserProfile) => {
    setSelectedUser(profile);
    setIsModalLoading(true);

    const { data: coursesData, error: coursesError } = await supabase.from('courses').select('id, title');
    if (coursesError) console.error("Erro ao buscar cursos:", coursesError);
    else setAllCourses(coursesData || []);

    const { data: enrollmentsData, error: enrollmentsError } = await supabase
      .from('user_courses')
      .select('course_id')
      .eq('user_id', profile.id);
    
    if (enrollmentsError) console.error("Erro ao buscar matrículas:", enrollmentsError);
    else {
      const enrolledIds = new Set(enrollmentsData?.map(e => e.course_id) || []);
      setUserEnrollments(enrolledIds);
      setPendingEnrollments(new Set(enrolledIds));
    }
    
    setIsModalLoading(false);
  };

  // Função para lidar com a mudança dos checkboxes
  const handleCheckboxChange = (courseId: string, isChecked: boolean) => {
    setPendingEnrollments(prev => {
      const newSet = new Set(prev);
      if (isChecked) {
        newSet.add(courseId);
      } else {
        newSet.delete(courseId);
      }
      return newSet;
    });
  };

  // Função para salvar as alterações de matrícula
  const handleSaveChanges = async () => {
    if (!selectedUser) return;
    setIsModalLoading(true);

    const coursesToAdd = [...pendingEnrollments].filter(id => !userEnrollments.has(id));
    const coursesToRemove = [...userEnrollments].filter(id => !pendingEnrollments.has(id));
    
    try {
      const insertPromises = coursesToAdd.map(course_id => 
        supabase.from('user_courses').insert({ user_id: selectedUser.id, course_id })
      );
      const deletePromise = coursesToRemove.length > 0
        ? supabase.from('user_courses').delete().eq('user_id', selectedUser.id).in('course_id', coursesToRemove)
        : Promise.resolve();

      const results = await Promise.all([...insertPromises, deletePromise]);

      const hasError = results.some(result => result && result.error);

      if (hasError) {
        const errorResult = results.find(result => result && result.error);
        throw errorResult?.error;
      }

      alert('Matrículas atualizadas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar matrículas:', error);
      alert(`Ocorreu um erro ao salvar as alterações. Verifique o console.`);
    } finally {
      setSelectedUser(null);
      setIsModalLoading(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="text-center text-red-500">
        <h1>Acesso Negado</h1>
        <p>Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-white">Carregando usuários...</div>;
  }

  return (
    <>
      <div className="text-white">
        <h1 className="text-3xl font-bold mb-6">Painel do Administrador</h1>
        <div className="bg-primary p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Usuários Cadastrados</h2>
          <div className="space-y-3">
            {profiles.map(profile => (
              <div key={profile.id} className="p-4 bg-background rounded-md flex justify-between items-center">
                <div>
                  <p className="font-bold">{profile.name || 'Usuário sem nome'}</p>
                  <p className={`text-xs font-mono mt-1 ${profile.role === 'admin' ? 'text-secondary' : 'text-text-secondary'}`}>{profile.role}</p>
                </div>
                <button 
                  onClick={() => handleManageClick(profile)}
                  className="bg-secondary text-primary font-bold py-2 px-4 rounded-lg hover:bg-accent transition-colors text-sm"
                >
                  Gerenciar
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-primary rounded-lg p-6 w-full max-w-md border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Gerenciar Cursos de <span className="text-secondary">{selectedUser.name}</span></h3>
              <button onClick={() => setSelectedUser(null)} className="p-1 rounded-full hover:bg-background/50">
                <X size={20} />
              </button>
            </div>
            {isModalLoading ? (
              <p>Carregando...</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {allCourses.map(course => (
                  <label key={course.id} className="flex items-center space-x-3 p-3 rounded-md hover:bg-background cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pendingEnrollments.has(course.id)}
                      onChange={(e) => handleCheckboxChange(course.id, e.target.checked)}
                      className="form-checkbox h-5 w-5 rounded text-secondary bg-gray-800 border-gray-600 focus:ring-secondary"
                    />
                    <span>{course.title}</span>
                  </label>
                ))}
              </div>
            )}
             <div className="mt-6 flex justify-end">
                <button onClick={() => setSelectedUser(null)} className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 mr-2 text-sm">
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveChanges}
                  disabled={isModalLoading}
                  className="bg-secondary text-primary font-bold py-2 px-4 rounded-lg hover:bg-accent text-sm disabled:opacity-50"
                >
                  {isModalLoading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
          </div>
        </div>
      )}
    </>
  );
};