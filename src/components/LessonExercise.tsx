// src/components/LessonExercise.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Check, X } from 'lucide-react';

interface MCQ { type: 'mcq'; question: string; options: Record<string, string>; correctAnswer: string; }
interface TrueFalse { type: 'true_false'; statement: string; correctAnswer: boolean; explanation: string; }
type Exercise = MCQ | TrueFalse;

interface LessonExerciseProps {
  lessonId: string;
  exerciseData: Exercise[] | null;
  isFullscreen?: boolean;
}

const McqQuestion: React.FC<{ 
  questionData: MCQ; index: number; selectedAnswer: string | undefined;
  isSubmitted: boolean; onAnswerChange: (answer: string) => void;
}> = ({ questionData, index, selectedAnswer, isSubmitted, onAnswerChange }) => {
  const isCorrect = selectedAnswer === questionData.correctAnswer;
  // <<< CORREÇÃO: Adicionado o 'return' >>>
  return (
    <div className="mb-6 bg-background/50 p-4 rounded-lg">
      <p className="font-bold mb-2">{index + 1}. {questionData.question}</p>
      <div className="space-y-2">
        {Object.entries(questionData.options).map(([key, value]) => {
          const isSelected = selectedAnswer === key;
          let feedbackClasses = '';
          if(isSubmitted) {
            if(isSelected && isCorrect) feedbackClasses = 'text-green-400';
            if(isSelected && !isCorrect) feedbackClasses = 'text-red-400';
            if(!isSelected && key === questionData.correctAnswer) feedbackClasses = 'text-green-400 font-bold';
          }
          return (
            <label key={key} className={`flex items-center justify-between space-x-3 p-2 rounded-md ${!isSubmitted ? 'cursor-pointer hover:bg-primary/50' : ''}`}>
              <div className="flex items-center space-x-3">
                <input type="radio" name={`q-${index}`} value={key} checked={isSelected} disabled={isSubmitted} onChange={() => onAnswerChange(key)} className="form-radio h-4 w-4 text-secondary bg-gray-700 border-gray-600 focus:ring-secondary disabled:opacity-70" />
                <span className={`text-text-secondary ${feedbackClasses}`}>{value}</span>
              </div>
              {isSubmitted && isSelected && (isCorrect ? <Check className="text-green-500" size={20} /> : <X className="text-red-500" size={20} />)}
            </label>
          );
        })}
      </div>
    </div>
  );
};

const TrueFalseQuestion: React.FC<{ 
    questionData: TrueFalse; index: number; selectedAnswer: string | undefined;
    isSubmitted: boolean; onAnswerChange: (answer: string) => void;
}> = ({ questionData, index, selectedAnswer, isSubmitted, onAnswerChange }) => {
    const isCorrect = String(questionData.correctAnswer) === selectedAnswer;
    // <<< CORREÇÃO: Adicionado o 'return' >>>
    return (
      <div className="mb-6 bg-background/50 p-4 rounded-lg">
          <p className="font-bold mb-2">{index + 1}. (V/F) {questionData.statement}</p>
          <div className="space-y-2">
              <label className={`flex items-center justify-between space-x-3 p-2 rounded-md ${!isSubmitted ? 'cursor-pointer' : ''}`}>
                  <div className="flex items-center space-x-3">
                    <input type="radio" name={`q-${index}`} value="true" checked={selectedAnswer === 'true'} disabled={isSubmitted} onChange={() => onAnswerChange('true')} className="form-radio h-4 w-4 text-secondary bg-gray-700 border-gray-600"/>
                    <span className={`text-text-secondary ${isSubmitted && String(questionData.correctAnswer) === 'true' ? 'text-green-400 font-bold' : ''}`}>Verdadeiro</span>
                  </div>
                  {isSubmitted && selectedAnswer === 'true' && (isCorrect ? <Check className="text-green-500" size={20} /> : <X className="text-red-500" size={20} />)}
              </label>
              <label className={`flex items-center justify-between space-x-3 p-2 rounded-md ${!isSubmitted ? 'cursor-pointer' : ''}`}>
                  <div className="flex items-center space-x-3">
                    <input type="radio" name={`q-${index}`} value="false" checked={selectedAnswer === 'false'} disabled={isSubmitted} onChange={() => onAnswerChange('false')} className="form-radio h-4 w-4 text-secondary bg-gray-700 border-gray-600"/>
                    <span className={`text-text-secondary ${isSubmitted && String(questionData.correctAnswer) === 'false' ? 'text-green-400 font-bold' : ''}`}>Falso</span>
                  </div>
                  {isSubmitted && selectedAnswer === 'false' && (isCorrect ? <Check className="text-green-500" size={20} /> : <X className="text-red-500" size={20} />)}
              </label>
          </div>
          {isSubmitted && <p className="text-sm mt-3 text-text-secondary border-t border-gray-700 pt-2">Explicação: {questionData.explanation}</p>}
      </div>
    );
};

export const LessonExercise: React.FC<LessonExerciseProps> = ({ lessonId, exerciseData, isFullscreen }) => {
  if (!exerciseData || exerciseData.length === 0) {
    return <div className="text-white p-6">Não há exercícios para esta aula.</div>;
  }
  
  const { user } = useAuth();
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const fetchAnswers = async () => {
      if (!user || !lessonId) return;
      setIsSubmitted(false);
      setSelectedAnswers({});
      
      const { data, error } = await supabase
        .from('user_lesson_answers')
        .select('selected_answer')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId);

      if(error) {
        console.error("Erro ao buscar respostas:", error);
        return;
      }
      
      if (data && data.length > 0 && data[0].selected_answer) {
        setSelectedAnswers(data[0].selected_answer as Record<number, string>);
        setIsSubmitted(true);
      }
    };
    fetchAnswers();
  }, [lessonId, user]);
  
  const handleAnswerChange = (questionIndex: number, answer: string) => {
    setSelectedAnswers(prev => ({ ...prev, [questionIndex]: answer }));
  };
  
  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitted(true);
    await supabase.from('user_lesson_answers').upsert({
      user_id: user.id,
      lesson_id: lessonId,
      selected_answer: selectedAnswers
    }, { onConflict: 'user_id,lesson_id' });
  };

  const handleReset = async () => {
    if (!user) return;
    setIsSubmitted(false);
    setSelectedAnswers({});
    await supabase.from('user_lesson_answers').delete().eq('user_id', user.id).eq('lesson_id', lessonId);
  };

  return (
    <div className={`text-white ${isFullscreen ? 'h-full flex flex-col' : ''}`}>
      <h3 className="font-bold text-xl mb-6">Exercícios da Aula</h3>
      
      <div className={`pr-2 ${isFullscreen ? 'flex-1 overflow-y-auto' : ''}`}>
        {exerciseData.map((exercise, index) => {
          if (exercise.type === 'mcq') {
            return <McqQuestion key={index} questionData={exercise as MCQ} index={index} selectedAnswer={selectedAnswers[index]} isSubmitted={isSubmitted} onAnswerChange={(answer) => handleAnswerChange(index, answer)} />;
          }
          if (exercise.type === 'true_false') {
            return <TrueFalseQuestion key={index} questionData={exercise as TrueFalse} index={index} selectedAnswer={selectedAnswers[index]} isSubmitted={isSubmitted} onAnswerChange={(answer) => handleAnswerChange(index, answer)} />;
          }
          return null;
        })}
      </div>
      
      <div className="mt-8 border-t border-gray-700 pt-6">
         {!isSubmitted ? (
            <button onClick={handleSubmit} className="bg-secondary text-primary font-bold py-2 px-5 rounded-lg hover:bg-accent transition-colors">
                Verificar Respostas
            </button>
         ) : (
            <button onClick={handleReset} className="bg-gray-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-gray-700 transition-colors">
                Tentar Novamente
            </button>
         )}
      </div>
    </div>
  );
};