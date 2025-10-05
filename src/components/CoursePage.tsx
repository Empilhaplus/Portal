// src/components/CoursePage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Maximize2, Minimize2, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { LessonExercise } from './LessonExercise';

interface Lesson { id: string; title: string; description: string | null; exercise_data: any; }
interface Module { id: string; title: string; iframe_url: string | null; lessons: Lesson[]; }
interface Course { id: string; title: string; description: string; modules: Module[]; }

export const CoursePage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [showExercises, setShowExercises] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  // <<< NOVO ESTADO PARA CONTROLE DO LAYOUT MOBILE >>>
  const [showContentMobile, setShowContentMobile] = useState(false);

  useEffect(() => {
    if (!courseId || !user) return;
    const fetchCourseData = async () => {
      setLoading(true);
      
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select(`id, title, description, modules ( id, title, iframe_url, lessons ( id, title, description, order, exercise_data ) )`)
        .eq('id', courseId)
        .order('order', { foreignTable: 'modules' })
        .order('order', { foreignTable: 'modules.lessons' })
        .single();

      if (courseError) {
        console.error('Erro ao buscar dados do curso:', courseError);
        setLoading(false); return;
      }
      
      if (courseData) {
        setCourse(courseData as Course);
        if (courseData.modules?.[0]?.lessons?.[0]) {
          setSelectedLesson(courseData.modules[0].lessons[0]);
        }
        
        const lessonIdsInCourse = courseData.modules.flatMap(m => m.lessons.map(l => l.id));
        
        if (lessonIdsInCourse.length > 0) {
            const { data: progressData, error: progressError } = await supabase
                .from('user_lesson_progress')
                .select('lesson_id')
                .eq('user_id', user.id)
                .in('lesson_id', lessonIdsInCourse);

            if (progressError) {
                console.error("Erro ao buscar progresso:", progressError);
            } else {
                const completedIds = new Set(progressData?.map(p => p.lesson_id) || []);
                setCompletedLessons(completedIds);
            }
        }
      }
      setLoading(false);
    };
    fetchCourseData();
  }, [courseId, user]);

  const handleMarkAsCompleted = async () => {
    if (!user || !selectedLesson || completedLessons.has(selectedLesson.id)) return;
    const { error } = await supabase.from('user_lesson_progress').insert({ user_id: user.id, lesson_id: selectedLesson.id });
    if (error) alert("Erro ao salvar progresso.");
    else setCompletedLessons(prev => new Set(prev).add(selectedLesson.id));
  };

  const currentModule = course?.modules.find(module => module.lessons.some(lesson => lesson.id === selectedLesson?.id));
  const totalLessons = course?.modules.reduce((acc, module) => acc + module.lessons.length, 0) || 0;
  const allLessonsCompleted = totalLessons > 0 && completedLessons.size >= totalLessons;

  if (loading) return <div className="text-center p-8 text-white">Carregando curso...</div>;
  if (!course) return <div className="text-center p-8 text-white">Curso não encontrado.</div>;

  const renderContent = () => (
    <div className={`bg-primary rounded-lg border border-gray-700 ${isFullscreen ? 'h-full flex flex-col' : ''}`}>
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {/* <<< BOTÃO DE VOLTAR PARA A LISTA NO MOBILE >>> */}
          <button onClick={() => setShowContentMobile(false)} className="lg:hidden flex items-center text-text-secondary hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" /> Aulas
          </button>
          <div className="hidden lg:flex items-center space-x-4">
            <button onClick={() => setShowExercises(false)} className={!showExercises ? 'text-secondary font-bold' : 'text-text-secondary'}>Aula</button>
            {selectedLesson?.exercise_data && <button onClick={() => setShowExercises(true)} className={showExercises ? 'text-secondary font-bold' : 'text-text-secondary'}>Exercícios da Aula</button>}
          </div>
        </div>
        <button onClick={() => setIsFullscreen(!isFullscreen)} title="Tela Cheia" className="p-1 text-text-secondary hover:text-white">
          {isFullscreen ? <Minimize2 size={18}/> : <Maximize2 size={18}/>}
        </button>
      </div>
      <div className={`flex-1 ${isFullscreen ? 'overflow-hidden flex flex-col' : ''}`}>
        <div className={`bg-black ${isFullscreen ? 'flex-1' : 'aspect-video'} ${showExercises ? 'hidden' : ''}`}>
          <iframe src={currentModule?.iframe_url || ''} className="w-full h-full" frameBorder="0" allowFullScreen title={`Módulo - ${currentModule?.title}`} />
        </div>
        <div className={`p-6 ${isFullscreen ? 'flex-1 overflow-y-auto' : ''} ${!showExercises ? 'hidden' : ''}`}>
          {selectedLesson?.exercise_data ? ( <LessonExercise lessonId={selectedLesson.id} exerciseData={selectedLesson.exercise_data} isFullscreen={isFullscreen} /> ) : <p className="text-text-secondary">Não há exercícios para esta aula.</p>}
        </div>
      </div>
      {/* <<< NAVEGAÇÃO MOBILE INFERIOR >>> */}
      {selectedLesson?.exercise_data && (
          <div className="lg:hidden p-3 border-t border-gray-700 flex justify-around items-center">
              <button onClick={() => setShowExercises(false)} className={`py-2 px-4 rounded-md ${!showExercises ? 'bg-secondary/20 text-secondary font-bold' : 'text-text-secondary'}`}>Aula</button>
              <button onClick={() => setShowExercises(true)} className={`py-2 px-4 rounded-md ${showExercises ? 'bg-secondary/20 text-secondary font-bold' : 'text-text-secondary'}`}>Exercícios</button>
          </div>
      )}
    </div>
  );

  return (
    <>
      <div className={`flex-col lg:flex-row gap-8 text-white ${isFullscreen ? 'hidden' : 'flex'}`}>
        {/* <<< LÓGICA DE EXIBIÇÃO PARA O PAINEL DE AULAS >>> */}
        <div className={`${showContentMobile ? 'hidden' : 'block'} lg:block lg:w-1/3 bg-primary p-6 rounded-lg self-start lg:sticky top-24`}>
            <button onClick={() => navigate('/')} className="flex items-center text-text-secondary hover:text-white mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para os treinamentos
            </button>
            <h2 className="text-2xl font-bold">{course.title}</h2>
            <div className="my-4">
              <div className="flex justify-between text-sm text-text-secondary mb-1">
                <span>Progresso</span>
                <span>{completedLessons.size} / {totalLessons} aulas</span>
              </div>
              <div className="w-full bg-background rounded-full h-2.5">
                <div className="bg-secondary h-2.5 rounded-full" style={{ width: `${totalLessons > 0 ? (completedLessons.size / totalLessons) * 100 : 0}%` }}></div>
              </div>
            </div>
            <div className="space-y-6 max-h-[45vh] lg:max-h-none overflow-y-auto pr-2">
                {course.modules.map((module) => (
                    <div key={module.id}>
                        <h3 className="font-bold text-text-primary mb-3 text-lg">{module.title}</h3>
                        <ul className="space-y-2 pl-4 border-l-2 border-gray-700">
                            {module.lessons.map((lesson) => (
                              <li key={lesson.id}>
                                  <button onClick={() => { setSelectedLesson(lesson); setShowExercises(false); setShowContentMobile(true); }} className={`w-full text-left flex items-start space-x-3 p-3 rounded-md transition-colors ${selectedLesson?.id === lesson.id ? 'bg-secondary/20 text-secondary' : 'hover:bg-background/50'}`}>
                                      <CheckCircle size={16} className={`mt-1 flex-shrink-0 transition-colors ${completedLessons.has(lesson.id) ? 'text-green-500' : 'text-gray-600'}`} />
                                      <div>
                                          <p className="font-semibold">{lesson.title}</p>
                                          <p className="text-xs text-text-secondary mt-1">{lesson.description}</p>
                                      </div>
                                  </button>
                              </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
            <div className="text-center mt-6 border-t border-gray-700 pt-6">
                {allLessonsCompleted ? (
                    <Link to={`/course/${courseId}/test`} className="w-full text-center inline-block bg-secondary text-primary font-bold py-3 px-6 rounded-lg hover:bg-accent transition-colors">
                        Fazer Teste Final
                    </Link>
                ) : (
                    <button disabled className="w-full text-center flex items-center justify-center gap-2 bg-gray-700 text-text-secondary font-bold py-3 px-6 rounded-lg cursor-not-allowed">
                        <Lock size={16} /> Conclua todas as aulas para liberar o teste
                    </button>
                )}
            </div>
        </div>
        {/* <<< LÓGICA DE EXIBIÇÃO PARA O CONTEÚDO DA AULA >>> */}
        <div className={`${showContentMobile ? 'block' : 'hidden'} lg:block lg:w-2/3`}>
            {selectedLesson && currentModule ? (
                <div>
                    {renderContent()}
                    {!completedLessons.has(selectedLesson.id) && (
                        <div className="mt-4 text-center">
                            <button onClick={handleMarkAsCompleted} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-5 rounded-lg transition-colors">
                                Marcar como concluída
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center p-10 bg-primary rounded-lg"><p>Selecione uma aula para começar.</p></div>
            )}
        </div>
      </div>
      {isFullscreen && ( <div className="fixed inset-0 bg-background z-50 p-4"> {renderContent()} </div> )}
    </>
  );
};