// src/components/FinalTestPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStudy } from '../context/StudyContext';
import { useAuth } from '../context/AuthContext';
import { ExerciseResult } from '../types';
import { Award, Download, Info, FileText, Loader } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { addMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// --- Interfaces ---
interface Question {
  question: string;
  options: Record<string, string>;
  correctAnswer: string;
}
interface ModuleTest {
  id: string;
  course_id: string;
  title: string;
  questions: Question[];
  min_score: number;
}
interface CourseInfo {
  id: string;
  title: string;
  syllabus: string[] | null;
  duration_hours: number | null;
  validity_months: number | null;
}
// --- Fim Interfaces ---

export const FinalTestPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { addExerciseResult } = useStudy();
  const { user } = useAuth();

  // --- Estados ---
  const [test, setTest] = useState<ModuleTest | null>(null);
  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCertificate, setHasCertificate] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
  const [certificateCode, setCertificateCode] = useState<string | null>(null);
  const [completionDate, setCompletionDate] = useState<Date | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  // --- Fim Estados ---

  useEffect(() => {
    // ... (useEffect completo como na versão anterior) ...
     const fetchTestData = async () => { if (!courseId || !user) return; setLoading(true); setHasCertificate(false); setScore(null); try { const { data: certificateData } = await supabase .from('certificates') .select('id, certificate_code, issued_at') .eq('user_id', user.id) .eq('course_id', courseId) .maybeSingle(); if (certificateData) { setHasCertificate(true); setCertificateCode(certificateData.certificate_code); setCompletionDate(new Date(certificateData.issued_at)); const { data: resultData } = await supabase.from('exercise_results').select('score, total_questions').eq('user_id', user.id).eq('course_id', courseId).order('completed_at', { ascending: false }).limit(1).single(); if (resultData) setScore(Math.round((resultData.score / resultData.total_questions) * 100)); } const { data: testData, error: testError } = await supabase .from('module_tests') .select('*') .eq('course_id', courseId) .single(); if (testError) console.error("Erro teste:", testError); else if (testData) setTest({ ...testData, questions: Array.isArray(testData.questions) ? testData.questions : [] }); const { data: courseData, error: courseError } = await supabase .from('courses') .select('id, title, syllabus, duration_hours, validity_months') .eq('id', courseId) .single(); if (courseError) console.error("Erro curso:", courseError); else if (courseData) setCourse(courseData); } catch (error) { console.error("Erro fetch:", error); } finally { setLoading(false); } }; fetchTestData();
  }, [courseId, user]);

  const handleAnswerChange = (questionIndex: number, answerKey: string) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: answerKey }));
  };

  const handleSubmit = async () => {
    // ... (handleSubmit completo como na versão anterior) ...
     if (!test || !test.questions || !courseId || !user || isSubmitting) return; setIsSubmitting(true); const submissionTime = new Date(); setCompletionDate(submissionTime); try { let correctAnswers = 0; test.questions.forEach((q: Question, index: number) => { if (answers[index] === q.correctAnswer) correctAnswers++; }); const finalScore = test.questions.length > 0 ? Math.round((correctAnswers / test.questions.length) * 100) : 0; const result: ExerciseResult = { courseId, score: correctAnswers, totalQuestions: test.questions.length, completedAt: submissionTime }; await addExerciseResult(result); if (finalScore >= (test.min_score ?? 70)) { const newCertificateCode = `EPP-${courseId.substring(0, 4).toUpperCase()}-${user.id.substring(0, 4).toUpperCase()}-${Date.now()}`; const { error: certificateError } = await supabase.from('certificates').insert({ user_id: user.id, course_id: courseId, certificate_code: newCertificateCode, issued_at: submissionTime }); if (certificateError) { alert(`Parabéns ${finalScore}%! Erro ao registrar certificado.`); } else { setCertificateCode(newCertificateCode); setHasCertificate(true); alert(`Parabéns ${finalScore}%! Certificado gerado!`); } } else { alert(`Nota mínima não atingida (${finalScore}%).`); } setScore(finalScore); } catch (error) { alert("Erro ao enviar teste."); } finally { setIsSubmitting(false); }
  };

  const getValidityInfo = (issuedDate: Date, validityMonths: number | null): string | null => {
    // ... (getValidityInfo completo como na versão anterior) ...
     if (!validityMonths) return null; const expiryDate = addMonths(issuedDate, validityMonths); const formattedExpiryDate = format(expiryDate, 'dd/MM/yyyy', { locale: ptBR }); return `Válido por ${validityMonths} ${validityMonths === 1 ? 'mês' : 'meses'} (até ${formattedExpiryDate})`;
  };

  // ✅ Função handleDownloadCertificatePDF com HTML COMPLETO
  const handleDownloadCertificatePDF = async () => {
    if (!user || score === null || !completionDate || !course) return;
    setIsDownloading(true);

    const courseTitle = course.title;
    const syllabusItems = course.syllabus?.map((item: string) => `<li>${item}</li>`).join('') || '<li>Conteúdo não disponível.</li>';
    const userCPF = user.cpf || 'CPF não preenchido';
    const duration = course.duration_hours || 10;
    const logoUrl = 'https://ckpbdoxtlopaiaupenqd.supabase.co/storage/v1/object/public/logo%20empilha%20plus/EMPILHA+PLUS.png';
    const instructorSignatureUrl = 'https://ckpbdoxtlopaiaupenqd.supabase.co/storage/v1/object/public/logo%20empilha%20plus/Assinatura%20Rodrigo.png';
    const validityInfo = getValidityInfo(completionDate, course.validity_months);

    // ✅✅✅ HTML COMPLETO E CORRIGIDO ✅✅✅
    const content = `
      <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&family=Roboto:wght@400;500&display=swap');
            body { margin: 0; font-family: 'Roboto', sans-serif; color: #333; background-color: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page { width: 11in; height: 8.5in; display: flex; flex-direction: column; justify-content: space-between; border: 15px solid #0D2847; box-sizing: border-box; padding: 0.8in; background-color: white; position: relative; }
            .page-break { page-break-before: always; }
            .cert-header { text-align: center; margin-top: 0.3in; }
            .cert-header img { max-width: 190px; margin-bottom: 12px; }
            .cert-header h1 { font-family: 'Montserrat', sans-serif; font-size: 30px; letter-spacing: 1px; color: #0D2847; margin: 0; font-weight: 700; }
            .cert-body { flex-grow: 1; display: flex; flex-direction: column; justify-content: center; text-align: center; line-height: 1.6; padding-top: 10px; padding-bottom: 10px; }
            .cert-body p { font-size: 1.05rem; margin: 6px auto; color: #333; max-width: 95%; }
            .student-name { font-family: 'Montserrat', sans-serif; font-size: 2.1rem; color: #FBBF24; font-weight: 700; margin: 8px 0 15px 0; }
            .cert-footer { display: flex; justify-content: space-around; align-items: flex-end; width: 100%; padding-top: 20px; }
            .signature-block { width: 280px; text-align: center; padding-bottom: 10px; }
            .signature-line { border-top: 1px solid #444; position: relative; padding-top: 5px; margin-bottom: 5px; }
            .signature-img { position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); width: 140px; opacity: 0.95; max-height: 50px; object-fit: contain; }
            .signature-block p { margin: 0; font-weight: 600; font-size: 12px; }
            .signature-block span { font-size: 10px; color: #555; }
            .bottom-info { width: 100%; text-align: center; position: absolute; bottom: 0.4in; left: 0; right: 0; }
            .code-bottom { font-size: 10px; color: #777; margin-bottom: 3px; font-family: monospace; }
            .validity-info { font-size: 10px; color: #555; }
            .syllabus-page { border: 15px solid #0D2847; padding: 0.8in; box-sizing: border-box; background-color: white; height: 8.5in; display: flex; flex-direction: column; }
            .syllabus-header { text-align: center; margin-bottom: 0.2in; flex-shrink: 0; }
            .syllabus-header img { max-width: 150px; }
            .syllabus-page h2 { font-family: 'Montserrat', sans-serif; font-size: 24px; color: #0D2847; border-bottom: 2px solid #FBBF24; padding-bottom: 8px; margin-bottom: 20px; text-align: center; flex-shrink: 0; }
            .syllabus-content { flex-grow: 1; overflow: hidden; }
            .syllabus-page ul { max-width: 90%; margin: 0 auto; padding: 0; list-style: none; column-count: 2; column-gap: 30px; }
            .syllabus-page li { font-size: 11px; margin-bottom: 6px; padding-left: 15px; position: relative; line-height: 1.3; word-wrap: break-word; overflow-wrap: break-word; page-break-inside: avoid; column-break-inside: avoid; }
            .syllabus-page li::before { content: '•'; color: #FBBF24; position: absolute; left: 0; top: 0px; font-size: 16px; }
            .syllabus-footer { flex-shrink: 0; text-align: center; margin-top: 20px; font-size: 10px; color: #555; }
          </style>
        </head>
        <body>
          <div>
            <div class="page"> 
              <div class="cert-header">
                <img src="${logoUrl}" alt="Logo Empilha Plus" />
                <h1>CERTIFICADO DE CONCLUSÃO</h1>
              </div>
              <div class="cert-body">
                <p>Certificamos que</p>
                <p class="student-name">${user.name}</p>
                <p>
                  concluiu com aproveitamento o treinamento de <strong>${courseTitle}</strong>,
                  conforme determina a Portaria MT nº 3.214, de 8 de Junho de 1978, com carga horária de <strong>${duration} horas</strong>.
                </p>
                <p>Promovido pela <strong>Empilha Plus Treinamentos</strong>, CNPJ nº 35.077.899/0001-25.</p>
                <p>Concluído em ${format(completionDate, 'dd/MM/yyyy', { locale: ptBR })} com pontuação final de <strong>${score}%</strong>.</p>
              </div>
              <div class="cert-footer">
                <div class="signature-block">
                  <div class="signature-line">
                    <img src="${instructorSignatureUrl}" class="signature-img" alt="Assinatura Instrutor" />
                  </div>
                  <p>Rodrigo Vieira dos Santos</p>
                  <span>23880 - MTE/RJ</span>
                </div>
                <div class="signature-block">
                  <div class="signature-line"></div>
                  <p>${user.name}</p>
                  <span>CPF: ${userCPF}</span>
                </div>
              </div>
              <div class="bottom-info">
                 <div class="code-bottom">
                   Código de Validação: ${certificateCode || 'N/A'}
                 </div>
                 ${validityInfo ? `<div class="validity-info">${validityInfo}</div>` : ''}
              </div>
            </div>

            <div class="page syllabus-page page-break"> 
              <div class="syllabus-header">
                <img src="${logoUrl}" alt="Logo Empilha Plus" />
              </div>
              <h2>Conteúdo Programático - ${courseTitle}</h2>
              <div class="syllabus-content">
                 <ul>${syllabusItems}</ul>
              </div>
              <div class="syllabus-footer">
                ${validityInfo ? `<span>${validityInfo}</span>` : ''}
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const options = {
      filename: `certificado_${user.name.replace(/\s+/g, '_').toLowerCase()}.pdf`,
      image: { type: 'jpeg' as const, quality: 1.0 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' as const },
    };

    try {
        await html2pdf().from(content).set(options).save();
    } catch (pdfError) {
        console.error("Erro ao gerar PDF:", pdfError);
        alert("Ocorreu um erro ao gerar o PDF. Tente novamente.");
    } finally {
        setIsDownloading(false);
    }
  };

  // ✅ Função handleDownloadResultsPDF com HTML COMPLETO
  const handleDownloadResultsPDF = (showUserAnswers = false) => {
     if (!user || !test || !test.questions || score === null) return;
    const courseTitle = course?.title || test.title.replace('Teste Final - ', '');

    // ✅✅✅ HTML COMPLETO E CORRIGIDO ✅✅✅
    const content = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; background-color: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .container { border: 10px solid #0D2847; padding: 30px; }
            .header { text-align: center; border-bottom: 2px solid #FBBF24; padding-bottom: 20px; margin-bottom: 20px; }
            .header h1 { font-size: 28px; color: #0D2847; margin: 0; }
            .header h2 { font-size: 22px; color: #111827; margin: 10px 0 0 0; }
            .info { margin-top: 30px; font-size: 16px; line-height: 1.5; }
            .info p { margin: 5px 0; }
            hr { margin: 30px 0; border: none; border-top: 1px solid #eee; }
            .results-title { font-size: 18px; color: #0D2847; margin-top: 40px; margin-bottom: 15px; }
            .question-block { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9; page-break-inside: avoid; }
            .question-text { font-weight: bold; margin: 0 0 10px 0; }
            .answer-line { margin: 5px 0; }
            .correct-answer { font-weight: bold; color: #28a745; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Empilha+Plus Treinamentos</h1>
              <h2>${showUserAnswers ? 'Gabarito Detalhado do Teste' : 'Gabarito Oficial do Teste'}</h2>
            </div>
            <div class="info">
              <p><strong>Aluno:</strong> ${user.name}</p>
              <p><strong>Curso:</strong> ${courseTitle}</p>
              <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
              ${showUserAnswers ? `<p><strong>Pontuação Final:</strong> <span style="font-weight: bold; font-size: 18px;">${score}%</span></p>` : ''}
            </div>
            <hr>
            <h3 class="results-title">Respostas:</h3>
            ${test.questions.map((q: Question, index: number) => `
              <div class="question-block">
                <p class="question-text">${index + 1}. ${q.question}</p>
                ${showUserAnswers ? `<p class="answer-line">Sua Resposta: ${q.options[answers[index]] || 'Não respondida'}</p>` : ''}
                <p class="answer-line correct-answer">Gabarito: ${q.options[q.correctAnswer] || 'Resposta não encontrada'}</p>
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `;

    const options = {
        filename: `resultado_teste_${user.name.replace(/\s+/g, '_').toLowerCase()}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, logging: false },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' as const }
    };
    html2pdf().from(content).set(options).save();
  };

  // --- Renderização JSX (Completa) ---
  if (loading) return <div className="text-white text-center p-8">Carregando dados do teste...</div>;

  if (hasCertificate) {
    return (
      <div className="text-white bg-primary p-8 rounded-lg text-center">
        <Award className="w-16 h-16 text-secondary mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-4">Teste Concluído!</h1>
        <p className="text-text-secondary mb-8">Você já foi aprovado neste teste e seu certificado foi gerado.</p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button onClick={() => navigate('/')} className="bg-gray-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors">Voltar ao Dashboard</button>
            <button onClick={handleDownloadCertificatePDF} disabled={isDownloading} className="flex items-center justify-center gap-2 bg-secondary text-primary font-bold py-3 px-6 rounded-lg hover:bg-accent transition-colors disabled:opacity-50">
                {isDownloading ? <Loader className="animate-spin w-5 h-5"/> : <Download size={18} />}
                {isDownloading ? 'Gerando...' : 'Baixar Certificado'}
            </button>
            <button onClick={() => handleDownloadResultsPDF(false)} className="flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors">
                <FileText size={18} />
                Baixar Gabarito
            </button>
        </div>
      </div>
    );
  }

  if (!test) return <div className="text-red-500 text-center p-8">Erro: Teste não encontrado para este curso. Contate o suporte.</div>;

  if (!testStarted) {
    const questionCount = Array.isArray(test.questions) ? test.questions.length : 0;
    return (
      <div className="text-white bg-primary p-8 rounded-lg">
        <Info className="w-16 h-16 text-secondary mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-center mb-4">Instruções do Teste Final</h1>
        {questionCount > 0 ? (
            <ul className="list-disc list-inside space-y-2 text-text-secondary mb-8">
              <li>Total de questões: <strong>{questionCount}</strong></li>
              <li>Aprovação: <strong>{test.min_score ?? 70}%</strong></li>
              <li>Marque apenas UMA alternativa por questão.</li>
            </ul>
        ) : (
            <p className="text-center text-yellow-400 mb-8">Nenhuma questão encontrada para este teste.</p>
        )}
        <button onClick={() => setTestStarted(true)} disabled={questionCount === 0} className="w-full bg-secondary text-primary font-bold py-3 px-6 rounded-lg text-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Começar Teste</button>
      </div>
    );
  }

  if (score !== null) {
      return (
        <div className="text-white bg-primary p-8 rounded-lg text-center">
          <h1 className="text-2xl font-bold mb-4">Resultado Final</h1>
          <p className="text-lg mb-2">Sua nota foi:</p>
          <p className={`text-5xl font-bold mb-8 ${score >= (test.min_score ?? 70) ? 'text-secondary' : 'text-red-500'}`}>{score}%</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button onClick={() => navigate('/')} className="bg-gray-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors">Voltar ao Dashboard</button>
              {score >= (test.min_score ?? 70) && (
                <>
                  <button onClick={handleDownloadCertificatePDF} disabled={isDownloading} className="flex items-center justify-center gap-2 bg-secondary text-primary font-bold py-3 px-6 rounded-lg hover:bg-accent transition-colors disabled:opacity-50">
                    {isDownloading ? <Loader className="animate-spin w-5 h-5"/> : <Download size={18} />}
                    {isDownloading ? 'Gerando...' : 'Baixar Certificado'}
                  </button>
                  <button onClick={() => handleDownloadResultsPDF(true)} className="flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors">
                     <FileText size={18} />
                     Baixar Gabarito Detalhado
                  </button>
                </>
              )}
          </div>
        </div>
      );
  }

  const questions = Array.isArray(test.questions) ? test.questions : [];
  return (
    <div className="text-white space-y-6">
      <h1 className="text-3xl font-bold">{test.title}</h1>
      <div className="space-y-8">
        {questions.map((q: Question, index: number) => (
          <div key={index} className="bg-primary p-6 rounded-lg">
            <p className="font-bold text-lg mb-4">{index + 1}. {q.question}</p>
            <div className="space-y-3">
              {Object.entries(q.options).map(([key, value]) => (
                <label key={key} className="flex items-center space-x-3 p-3 rounded-md hover:bg-background cursor-pointer">
                  <input type="radio" name={`question-${index}`} value={key} onChange={(e) => handleAnswerChange(index, e.target.value)} className="form-radio h-5 w-5 text-secondary bg-gray-800 border-gray-600 focus:ring-secondary" />
                  <span>{String(value)}</span>
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