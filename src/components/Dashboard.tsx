// src/components/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// Define um tipo para os dados do curso
interface Course {
  id: string;
  title: string;
  description: string;
}

export const Dashboard: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('order', { ascending: true });

      if (error) {
        console.error('Erro ao buscar os cursos:', error);
      } else if (data) {
        setCourses(data);
      }
      setLoading(false);
    };
    fetchCourses();
  }, []);

  if (loading) {
    return <div>Carregando seus treinamentos...</div>;
  }

  return (
    <div className="space-y-4">
      {/* <<< TÍTULO ALTERADO AQUI >>> */}
      <h1 className="text-3xl font-bold text-text-primary">Meus Treinamentos</h1>
      
      {courses.length > 0 ? (
        courses.map(course => {
          const isEnrolled = user?.enrolledCourseIds.includes(course.id);

          return (
            <div 
              key={course.id} 
              className={`bg-primary border rounded-lg p-6 transition-all ${isEnrolled ? 'border-gray-700' : 'border-gray-800 opacity-60'}`}
            >
              <h2 className="text-xl font-bold text-text-primary">{course.title}</h2>
              <p className="text-text-secondary mt-2 mb-4">{course.description}</p>
              
              {isEnrolled ? (
                <Link to={`/course/${course.id}`} className="inline-block bg-secondary hover:bg-accent text-primary font-bold py-2 px-5 rounded-lg transition-colors">
                  Acessar Treinamento
                </Link>
              ) : (
                <button disabled className="bg-gray-700 text-text-secondary font-bold py-2 px-5 rounded-lg cursor-not-allowed">
                  Bloqueado
                </button>
              )}
            </div>
          );
        })
      ) : (
        <p className="text-text-secondary">Nenhum curso encontrado.</p>
      )}
    </div>
  );
};