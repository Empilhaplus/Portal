// src/components/LessonExercise.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Check, X } from 'lucide-react';
import { motion } from 'framer-motion';

// --- Interfaces ---
interface MCQ { type: 'mcq'; question: string; options: Record<string, string>; correctAnswer: string; }
interface TrueFalse { type: 'true_false'; statement: string; correctAnswer: boolean; explanation?: string; } // explanation is optional
type Exercise = MCQ | TrueFalse;

interface LessonExerciseProps {
  lessonId: string;
  exerciseData: Exercise[] | null;
  isFullscreen?: boolean;
}
// --- Fim Interfaces ---

// --- Componente McqQuestion (Completo e Corrigido) ---
const McqQuestion: React.FC<{
  questionData: MCQ;
  index: number;
  selectedAnswer: string | undefined;
  isSubmitted: boolean;
  onAnswerChange: (answer: string) => void; // Tipo explícito para 'answer'
}> = ({ questionData, index, selectedAnswer, isSubmitted, onAnswerChange }) => { // Usa props desestruturadas
  const isCorrect = selectedAnswer === questionData.correctAnswer;

  return (
    <div className="mb-6 bg-background/50 p-4 rounded-lg">
      <p className="font-bold mb-2">{index + 1}. {questionData.question}</p>
      <div className="space-y-2">
        {Object.entries(questionData.options).map(([key, value]) => {
          const isSelected = selectedAnswer === key;
          let feedbackClasses = '';
          let checkMark = null;

          if(isSubmitted) {
            if(isSelected && isCorrect) {
                 feedbackClasses = 'text-green-400 font-semibold';
                 checkMark = <Check className="text-green-500 flex-shrink-0" size={20} />;
            } else if (isSelected && !isCorrect) {
                 feedbackClasses = 'text-red-400 line-through';
                 checkMark = <X className="text-red-500 flex-shrink-0" size={20} />;
            } else if (!isSelected && key === questionData.correctAnswer) {
                 // Mostra a resposta correta se o usuário errou
                 feedbackClasses = 'text-green-400 font-bold';
                 checkMark = <Check className="text-green-500 flex-shrink-0 opacity-70" size={20} />; // Marca correta sutil
            }
          }

          return (
            <label key={key} className={`flex items-center justify-between space-x-3 p-2 rounded-md ${!isSubmitted ? 'cursor-pointer hover:bg-primary/50' : ''}`}>
              <div className="flex items-center space-x-3">
                <input
                    type="radio"
                    name={`q-${index}`}
                    value={key}
                    checked={isSelected}
                    disabled={isSubmitted}
                    onChange={() => onAnswerChange(key)} // Usa onAnswerChange
                    className="form-radio h-4 w-4 text-secondary bg-gray-700 border-gray-600 focus:ring-secondary disabled:opacity-70 flex-shrink-0"
                />
                {/* Garante que 'value' é tratado como string */}
                <span className={`text-text-secondary ${feedbackClasses}`}>{String(value)}</span>
              </div>
              {checkMark} {/* Exibe o checkmark */}
            </label>
          );
        })}
      </div>
    </div>
  );
};

// --- Componente TrueFalseQuestion (Completo e Corrigido) ---
const TrueFalseQuestion: React.FC<{
    questionData: TrueFalse;
    index: number;
    selectedAnswer: string | undefined; // Será 'true' ou 'false' como string
    isSubmitted: boolean;
    onAnswerChange: (answer: string) => void; // Tipo explícito
}> = ({ questionData, index, selectedAnswer, isSubmitted, onAnswerChange }) => { // Usa props desestruturadas
    // Compara a string 'true'/'false'
    const isCorrect = String(questionData.correctAnswer) === selectedAnswer;

    return (
      <div className="mb-6 bg-background/50 p-4 rounded-lg">
          <p className="font-bold mb-2">{index + 1}. (V/F) {questionData.statement}</p>
          <div className="space-y-2">
              {/* Opção Verdadeiro */}
              <label className={`flex items-center justify-between space-x-3 p-2 rounded-md ${!isSubmitted ? 'cursor-pointer hover:bg-primary/50' : ''}`}>
                  <div className="flex items-center space-x-3">
                    <input
                        type="radio"
                        name={`q-${index}`}
                        value="true"
                        checked={selectedAnswer === 'true'}
                        disabled={isSubmitted}
                        onChange={() => onAnswerChange('true')} // Usa onAnswerChange
                        className="form-radio h-4 w-4 text-secondary bg-gray-700 border-gray-600 focus:ring-secondary disabled:opacity-70 flex-shrink-0"
                    />
                    <span className={`text-text-secondary ${isSubmitted && String(questionData.correctAnswer) === 'true' ? 'text-green-400 font-bold' : ''} ${isSubmitted && selectedAnswer === 'true' && !isCorrect ? 'text-red-400 line-through': ''}`}>
                        Verdadeiro
                    </span>
                  </div>
                  {/* Feedback V */}
                  {isSubmitted && selectedAnswer === 'true' && (isCorrect ? <Check className="text-green-500 flex-shrink-0" size={20} /> : <X className="text-red-500 flex-shrink-0" size={20} />)}
                  {isSubmitted && selectedAnswer !== 'true' && String(questionData.correctAnswer) === 'true' && <Check className="text-green-500 flex-shrink-0 opacity-70" size={20} />}
              </label>
              {/* Opção Falso */}
              <label className={`flex items-center justify-between space-x-3 p-2 rounded-md ${!isSubmitted ? 'cursor-pointer hover:bg-primary/50' : ''}`}>
                  <div className="flex items-center space-x-3">
                    <input
                        type="radio"
                        name={`q-${index}`}
                        value="false"
                        checked={selectedAnswer === 'false'}
                        disabled={isSubmitted}
                        onChange={() => onAnswerChange('false')} // Usa onAnswerChange
                        className="form-radio h-4 w-4 text-secondary bg-gray-700 border-gray-600 focus:ring-secondary disabled:opacity-70 flex-shrink-0"
                    />
                     <span className={`text-text-secondary ${isSubmitted && String(questionData.correctAnswer) === 'false' ? 'text-green-400 font-bold' : ''} ${isSubmitted && selectedAnswer === 'false' && !isCorrect ? 'text-red-400 line-through': ''}`}>
                        Falso
                    </span>
                  </div>
                  {/* Feedback F */}
                  {isSubmitted && selectedAnswer === 'false' && (isCorrect ? <Check className="text-green-500 flex-shrink-0" size={20} /> : <X className="text-red-500 flex-shrink-0" size={20} />)}
                  {isSubmitted && selectedAnswer !== 'false' && String(questionData.correctAnswer) === 'false' && <Check className="text-green-500 flex-shrink-0 opacity-70" size={20} />}
              </label>
          </div>
          {/* Mostra explicação se existir e se foi submetido */}
          {isSubmitted && questionData.explanation && (
            <p className="text-sm mt-3 text-text-secondary border-t border-gray-700 pt-2">
                Explicação: {questionData.explanation}
            </p>
          )}
      </div>
    );
};
// --- Fim Componentes ---

export const LessonExercise: React.FC<LessonExerciseProps> = ({ lessonId, exerciseData, isFullscreen }) => {
  if (!exerciseData || exerciseData.length === 0) {
    return <div className="text-white p-6">Não há exercícios para esta aula.</div>;
  }

  const { user } = useAuth();
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    // ... (useEffect permanece o mesmo) ...
     const fetchAnswers = async () => { if (!user || !lessonId) return; setIsSubmitted(false); setSelectedAnswers({}); setFeedbackMessage(null); try { const { data, error } = await supabase .from('user_lesson_answers') .select('selected_answer') .eq('user_id', user.id) .eq('lesson_id', lessonId) .maybeSingle(); if(error) throw error; if (data && data.selected_answer) { const savedAnswers = data.selected_answer as Record<number, string>; setSelectedAnswers(savedAnswers); setIsSubmitted(true); calculateAndSetFeedback(savedAnswers); } } catch (error) { console.error("Erro fetch respostas:", error); } }; fetchAnswers();
  }, [lessonId, user]);

  const calculateAndSetFeedback = (currentAnswers: Record<number, string>) => {
      // ... (calculateAndSetFeedback permanece o mesmo) ...
       let correctCount = 0; exerciseData.forEach((exercise, index) => { if (exercise.type === 'mcq' && currentAnswers[index] === exercise.correctAnswer) { correctCount++; } else if (exercise.type === 'true_false' && String(exercise.correctAnswer) === currentAnswers[index]) { correctCount++; } }); const scorePercentage = exerciseData.length > 0 ? (correctCount / exerciseData.length) * 100 : 0; let message = ''; if (scorePercentage === 100) { message = 'Parabéns! Você acertou todas as questões! 🥳'; } else if (scorePercentage >= 70) { message = 'Muito bom! Você demonstrou um ótimo entendimento. 👍'; } else { message = 'Continue praticando! Revise a aula e tente novamente. 💪'; } setFeedbackMessage(message);
  };

  const handleAnswerChange = (questionIndex: number, answer: string) => { // 'answer' agora tem tipo string
    if (!isSubmitted) {
        setSelectedAnswers(prev => ({ ...prev, [questionIndex]: answer }));
    }
  };

  const handleSubmit = async () => {
    // ... (handleSubmit permanece o mesmo) ...
     if (!user || isSubmitted) return; calculateAndSetFeedback(selectedAnswers); setIsSubmitted(true); try { const { error } = await supabase.from('user_lesson_answers').upsert({ user_id: user.id, lesson_id: lessonId, selected_answer: selectedAnswers }, { onConflict: 'user_id,lesson_id' }); if (error) throw error; } catch (error) { console.error("Erro save respostas:", error); }
  };

  const handleReset = async () => {
    // ... (handleReset permanece o mesmo) ...
     if (!user) return; setIsSubmitted(false); setSelectedAnswers({}); setFeedbackMessage(null); try { const { error } = await supabase .from('user_lesson_answers') .delete() .match({ user_id: user.id, lesson_id: lessonId }); if (error) throw error; } catch (error) { console.error("Erro reset:", error); }
  };

  // --- Renderização JSX (Completa e Corrigida) ---
  return (
    <div className={`text-white ${isFullscreen ? 'h-full flex flex-col' : ''}`}>
      <h3 className="font-bold text-xl mb-6">Exercícios da Aula</h3>

      <div className={`pr-2 ${isFullscreen ? 'flex-1 overflow-y-auto' : ''}`}>
        {/* Chama os componentes corretos com as props corretas */}
        {exerciseData.map((exercise, index) => {
          if (exercise.type === 'mcq') {
            return <McqQuestion
                        key={index}
                        questionData={exercise} // Passa o objeto MCQ completo
                        index={index}
                        selectedAnswer={selectedAnswers[index]}
                        isSubmitted={isSubmitted}
                        onAnswerChange={(answer: string) => handleAnswerChange(index, answer)} // Passa a função com tipo
                    />;
          }
          if (exercise.type === 'true_false') {
            return <TrueFalseQuestion
                        key={index}
                        questionData={exercise} // Passa o objeto TrueFalse completo
                        index={index}
                        selectedAnswer={selectedAnswers[index]}
                        isSubmitted={isSubmitted}
                        onAnswerChange={(answer: string) => handleAnswerChange(index, answer)} // Passa a função com tipo
                    />;
          }
          return null;
        })}
      </div>

      {isSubmitted && feedbackMessage && (
        <motion.div /* ... Feedback message ... */>
          <p>{feedbackMessage}</p>
        </motion.div>
      )}

      <div className="mt-8 border-t border-gray-700 pt-6">
         {!isSubmitted ? (
            <button
                onClick={handleSubmit}
                disabled={Object.keys(selectedAnswers).length < exerciseData.length}
                className="bg-secondary ..."
            >
                Verificar Respostas
            </button>
         ) : (
            <button onClick={handleReset} className="bg-gray-600 ...">
                Tentar Novamente
            </button>
         )}
      </div>
    </div>
  );
};