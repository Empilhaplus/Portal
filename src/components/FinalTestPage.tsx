// src/components/FinalTestPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStudy } from '../context/StudyContext';
import { useAuth } from '../context/AuthContext';
import { ExerciseResult } from '../types';
import { Award, Download, Info, FileText } from 'lucide-react';
import html2pdf from 'html2pdf.js';

interface Question {
  question: string;
  options: Record<string, string>;
  correctAnswer: string;
}
interface ModuleTest {
  id: string;
  title: string;
  questions: Question[];
  min_score: number;
}
interface CourseInfo {
  title: string;
  syllabus: string[] | null;
}

export const FinalTestPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { addExerciseResult } = useStudy();
  const { user } = useAuth(); 

  const [test, setTest] = useState<ModuleTest | null>(null);
  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCertificate, setHasCertificate] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
  const [certificateCode, setCertificateCode] = useState<string | null>(null);

  useEffect(() => {
    const fetchTestData = async () => {
      if (!courseId || !user) return;
      setLoading(true);
      
      const { data: certificateData } = await supabase.from('certificates').select('id, certificate_code').eq('user_id', user.id).eq('course_id', courseId).single();
      
      if (certificateData) {
        setHasCertificate(true);
        setCertificateCode(certificateData.certificate_code);
        const { data: resultData } = await supabase.from('exercise_results').select('score, total_questions').eq('user_id', user.id).eq('course_id', courseId).single();
        if (resultData) setScore(Math.round((resultData.score / resultData.total_questions) * 100));
      } 
      
      const { data: testData, error: testError } = await supabase.from('module_tests').select('*').eq('course_id', courseId).single();
      if (testError) console.error("Erro ao buscar o teste:", testError);
      else setTest(testData);

      const { data: courseData } = await supabase.from('courses').select('title, syllabus').eq('id', courseId).single();
      if(courseData) setCourse(courseData);
      
      setLoading(false);
    };
    fetchTestData();
  }, [courseId, user]);
  
  const handleAnswerChange = (questionIndex: number, answerKey: string) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: answerKey }));
  };

  const handleSubmit = async () => {
    if (!test || !courseId || !user || isSubmitting) return;
    setIsSubmitting(true);
    try {
        let correctAnswers = 0;
        test.questions.forEach((q, index) => {
          if (answers[index] === q.correctAnswer) {
            correctAnswers++;
          }
        });
        const finalScore = Math.round((correctAnswers / test.questions.length) * 100);
        
        const result: ExerciseResult = { 
            courseId: courseId, 
            score: correctAnswers, 
            totalQuestions: test.questions.length, 
            completedAt: new Date() 
        };
        await addExerciseResult(result);

        if (finalScore >= test.min_score) {
          const newCertificateCode = `EPP-${courseId.substring(0, 4).toUpperCase()}-${user.id.substring(0, 4).toUpperCase()}-${Date.now()}`;
          const { error: certificateError } = await supabase.from('certificates').insert({ user_id: user.id, course_id: courseId, certificate_code: newCertificateCode });
          if (certificateError) {
            console.error('Erro ao gerar certificado:', certificateError);
            alert(`Parabéns, você passou com ${finalScore}%! Tivemos um problema ao registrar seu certificado, por favor, contate o suporte.`);
          } else {
            setCertificateCode(newCertificateCode);
            alert(`Parabéns! Você foi aprovado com ${finalScore}% de acerto e seu certificado foi gerado!`);
          }
        } else {
          alert(`Você não atingiu a nota mínima. Sua nota foi ${finalScore}%. Tente novamente.`);
        }
        setScore(finalScore);
    } catch (error) {
        console.error("Erro ao submeter o teste:", error);
        alert("Ocorreu um erro ao enviar seu teste. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDownloadCertificatePDF = () => {
    if (!user || score === null) return;
    const courseTitle = course?.title || 'Curso';
    const syllabusItems = course?.syllabus?.map((item: string) => `<li>${item}</li>`).join('') || '<li>Conteúdo não disponível.</li>';
    const userCPF = user.cpf || 'CPF não preenchido';

    const logoUrl = 'https://ckpbdoxtlopaiaupenqd.supabase.co/storage/v1/object/public/logo%20empilha%20plus/EMPILHA+PLUS.png';
    const instructorSignatureUrl = 'https://ckpbdoxtlopaiaupenqd.supabase.co/storage/v1/object/public/logo%20empilha%20plus/Assinatura%20Rodrigo.png';

    const content = `
      <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@700&family=Roboto:wght@400;500&display=swap');
            body { margin: 0; font-family: 'Roboto', sans-serif; }
            .page { width: 11in; min-height: 8.5in; display: flex; flex-direction: column; position: relative; background-color: white; box-sizing: border-box; padding: 0.8in; }
            .page-break { page-break-before: always; }
            .certificate-page { border: 15px solid #0D2847; text-align: center; justify-content: space-between; align-items: center; }
            .cert-header { width: 100%; }
            .cert-header img { max-width: 200px; margin-bottom: 20px; }
            .cert-header h1 { font-family: 'Montserrat', sans-serif; font-size: 28px; color: #0D2847; margin: 0; }
            .cert-body { flex-grow: 1; display: flex; flex-direction: column; justify-content: center; }
            .cert-body p { font-size: 1.1rem; color: #333; line-height: 1.6; margin: 15px 0; }
            .student-name { font-family: 'Montserrat', sans-serif; font-size: 2.5rem; color: #FBBF24; margin: 10px 0; }
            .cert-footer-wrapper { width: 100%; display: flex; justify-content: space-around; padding-top: 40px; }
            .signature-block { width: 320px; text-align: center; }
            .signature-line { border-top: 1px solid #333; position: relative; padding-top: 5px; }
            .signature-img { position: absolute; left: 50%; transform: translateX(-50%); top: -40px; width: 150px; height: auto; }
            .signature-block p { font-weight: bold; margin-top: 4px; }
            .signature-block p, .signature-block span { margin-bottom: 2px; margin-top: 2px; font-size: 12px; }
            .code-bottom { font-size: 11px; color: #777; font-family: monospace; margin-top: 20px; }
            .syllabus-page { border: 15px solid #0D2847; }
            .syllabus-page h2 { font-family: 'Montserrat', sans-serif; font-size: 28px; font-weight: 700; color: #0D2847; border-bottom: 2px solid #FBBF24; padding-bottom: 10px; margin-bottom: 30px; }
            .syllabus-page ul { list-style: none; padding: 0; text-align: left; }
            .syllabus-page li { font-size: 14px; line-height: 1.8; margin-bottom: 10px; padding-left: 20px; position: relative; }
            .syllabus-page li::before { content: '•'; color: #FBBF24; font-size: 20px; position: absolute; left: 0; top: -2px; }
          </style>
        </head>
        <body>
          <div>
            <div class="page certificate-page">
              <div class="cert-header">
                <img src="${logoUrl}" alt="Logo Empilha+Plus" />
                <h1>CERTIFICADO DE CONCLUSÃO</h1>
              </div>
              <div class="cert-body">
                <p>Certificamos que</p>
                <p class="student-name">${user.name}</p>
                <p>concluiu com sucesso o treinamento de</p>
                <p><strong>${courseTitle}</strong></p>
                <p>Concluído em ${new Date().toLocaleDateString('pt-BR')} com uma pontuação final de <strong>${score}%</strong>.</p>
              </div>
              <div class="cert-footer-wrapper">
                <div class="signature-block">
                  <div class="signature-line">
                    <img src="${instructorSignatureUrl}" alt="Assinatura do Instrutor" class="signature-img"/>
                  </div>
                  <p>Rodrigo Vieira dos Santos</p>
                  <span>23880 - MTE- RJ</span>
                </div>
                <div class="signature-block">
                  <div class="signature-line"></div>
                  <p>${user.name}</p>
                  <span>CPF: ${userCPF}</span>
                </div>
              </div>
              <p class="code-bottom">Código de Validação: ${certificateCode || 'N/A'}</p>
            </div>
            <div class="page syllabus-page page-break">
              <h2>Conteúdo Programático - ${courseTitle}</h2>
              <ul>${syllabusItems}</ul>
            </div>
          </div>
        </body>
      </html>
    `;
    const options = { filename: `certificado_${user.name.replace(/\s/g, '_')}.pdf`, image: { type: 'jpeg' as const, quality: 1.0 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' as const } };
    html2pdf().from(content).set(options).save();
  };

  const handleDownloadResultsPDF = (showUserAnswers = false) => {
    if (!user || !test || score === null) return;
    const courseTitle = course?.title || test.title.replace('Teste Final - ', '');
    const content = `
      <div style="font-family: Arial, sans-serif; padding: 40px; color: #333; border: 10px solid #0D2847;">
        <div style="text-align: center; border-bottom: 2px solid #FBBF24; padding-bottom: 20px; margin-bottom: 20px;">
          <h1 style="font-size: 28px; color: #0D2847; margin: 0;">Empilha+Plus Treinamentos</h1>
          <h2 style="font-size: 22px; color: #111827; margin: 10px 0 0 0;">${showUserAnswers ? 'Gabarito Detalhado do Teste' : 'Gabarito Oficial do Teste'}</h2>
        </div>
        <div style="margin-top: 30px; font-size: 16px;">
          <p><strong>Aluno:</strong> ${user.name}</p>
          <p><strong>Curso:</strong> ${courseTitle}</p>
          <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
          ${showUserAnswers ? `<p><strong>Pontuação Final:</strong> <span style="font-weight: bold; font-size: 18px;">${score}%</span></p>` : ''}
        </div>
        <hr style="margin: 30px 0; border: 1px solid #eee;">
        <h3 style="font-size: 18px; color: #0D2847; margin-top: 40px;">Respostas:</h3>
        ${test.questions.map((q: Question, index: number) => `
          <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9; page-break-inside: avoid;">
            <p style="font-weight: bold; margin: 0 0 10px 0;">${index + 1}. ${q.question}</p>
            ${showUserAnswers ? `<p style="margin: 5px 0;">Sua Resposta: ${q.options[answers[index]] || 'Não respondida'}</p>` : ''}
            <p style="margin: 5px 0; font-weight: bold; color: #28a745;">Gabarito: ${q.options[q.correctAnswer] || 'Resposta não encontrada'}</p>
          </div>
        `).join('')}
      </div>
    `;
    const options = { filename: `resultado_teste_${user.name.replace(/\s/g, '_')}.pdf`, image: { type: 'jpeg' as const, quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' as const } };
    html2pdf().from(content).set(options).save();
  };

  if (loading) return <div className="text-white">Carregando...</div>;

  if (hasCertificate) {
    return (
      <div className="text-white bg-primary p-8 rounded-lg text-center">
        <Award className="w-16 h-16 text-secondary mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-4">Teste Concluído!</h1>
        <p className="text-text-secondary mb-8">Você já foi aprovado neste teste e seu certificado foi gerado.</p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button onClick={() => navigate('/')} className="bg-gray-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors">Voltar ao Dashboard</button>
            <button onClick={handleDownloadCertificatePDF} className="flex items-center justify-center gap-2 bg-secondary text-primary font-bold py-3 px-6 rounded-lg hover:bg-accent transition-colors"><Download size={18} />Baixar Certificado</button>
            <button onClick={() => handleDownloadResultsPDF(false)} className="flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"><FileText size={18} />Baixar Gabarito</button>
        </div>
      </div>
    );
  }
  
  if (!test) return <div className="text-white">Teste não encontrado para este curso.</div>;

  if (!testStarted) {
    return (
      <div className="text-white bg-primary p-8 rounded-lg">
        <Info className="w-16 h-16 text-secondary mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-center mb-4">Instruções do Teste Final</h1>
        <ul className="list-disc list-inside space-y-2 text-text-secondary mb-8">
          <li>Total de questões: <strong>{test.questions.length}</strong></li>
          <li>Aprovação: <strong>{test.min_score}%</strong></li>
          <li>Marque apenas UMA alternativa por questão.</li>
        </ul>
        <button onClick={() => setTestStarted(true)} className="w-full bg-secondary text-primary font-bold py-3 rounded-lg text-lg hover:bg-accent transition-colors">Começar Teste</button>
      </div>
    );
  }

  if (score !== null) {
      return (
        <div className="text-white bg-primary p-8 rounded-lg text-center">
          <h1 className="text-2xl font-bold mb-4">Resultado Final</h1>
          <p className="text-lg mb-2">Sua nota foi:</p>
          <p className={`text-5xl font-bold mb-8 ${score >= test.min_score ? 'text-secondary' : 'text-red-500'}`}>{score}%</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button onClick={() => navigate('/')} className="bg-gray-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors">Voltar ao Dashboard</button>
              {score >= test.min_score && (
                <>
                  <button onClick={handleDownloadCertificatePDF} className="flex items-center justify-center gap-2 bg-secondary text-primary font-bold py-3 px-6 rounded-lg hover:bg-accent transition-colors"><Download size={18} />Baixar Certificado</button>
                  <button onClick={() => handleDownloadResultsPDF(true)} className="flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"><FileText size={18} />Baixar Gabarito</button>
                </>
              )}
          </div>
        </div>
      );
  }
  
  return (
    <div className="text-white space-y-6">
      <h1 className="text-3xl font-bold">{test.title}</h1>
      <div className="space-y-8">
        {test.questions.map((q: Question, index: number) => (
          <div key={index} className="bg-primary p-6 rounded-lg">
            <p className="font-bold text-lg mb-4">{index + 1}. ${q.question}</p>
            <div className="space-y-3">
              {Object.entries(q.options).map(([key, value]: [string, unknown]) => (
                <label key={key} className="flex items-center space-x-3 p-3 rounded-md hover:bg-background cursor-pointer">
                  <input type="radio" name={`question-${index}`} value={key} onChange={(e) => handleAnswerChange(index, e.target.value)} className="form-radio h-5 w-5 text-secondary bg-gray-800 border-gray-600 focus:ring-secondary" />
                  <span>{value as React.ReactNode}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button onClick={handleSubmit} disabled={isSubmitting} className="w-full bg-secondary hover:bg-accent text-primary font-bold py-3 rounded-lg text-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed">
        {isSubmitting ? 'Enviando...' : 'Finalizar e Ver Nota'}
      </button>
    </div>
  );
};