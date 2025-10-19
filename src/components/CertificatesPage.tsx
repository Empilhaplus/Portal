// src/components/CertificatesPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Award, ArrowLeft, Download, Loader } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { addMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// --- Interfaces ---
interface CertificateData {
  id: string;
  issued_at: string;
  certificate_code: string;
  course_id: string;
}
interface CourseData {
  id: string;
  title: string;
  syllabus: string[] | null;
  duration_hours: number | null;
  validity_months: number | null;
}
interface CertificateWithCourseInfo {
  id: string;
  issued_at: string;
  certificate_code: string;
  course_id: string;
  courseTitle: string;
  syllabus: string[] | null;
  duration_hours: number | null;
  validity_months: number | null;
}
// --- Fim Interfaces ---

export const CertificatesPage: React.FC = () => {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<CertificateWithCourseInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    // ... (useEffect para buscar dados permanece o mesmo) ...
    const fetchCertificatesAndCourses = async () => { if (!user) return; setLoading(true); setCertificates([]); try { const { data: certData, error: certError } = await supabase .from('certificates') .select('id, issued_at, certificate_code, course_id') .eq('user_id', user.id) .returns<CertificateData[]>(); if (certError) throw certError; if (certData && certData.length > 0) { const courseIds = certData.map(cert => cert.course_id); const { data: coursesData, error: coursesError } = await supabase .from('courses') .select('id, title, syllabus, duration_hours, validity_months') .in('id', courseIds) .returns<CourseData[]>(); if (coursesError) throw coursesError; const coursesMap = new Map<string, CourseData>( coursesData.map(course => [course.id, course]) ); const combinedData: CertificateWithCourseInfo[] = certData.map(cert => { const courseInfo = coursesMap.get(cert.course_id); return { id: cert.id, issued_at: cert.issued_at, certificate_code: cert.certificate_code, course_id: cert.course_id, courseTitle: courseInfo?.title ?? 'Curso não encontrado', syllabus: courseInfo?.syllabus ?? null, duration_hours: courseInfo?.duration_hours ?? null, validity_months: courseInfo?.validity_months ?? null, }; }); setCertificates(combinedData); } } catch (error) { console.error("Erro ao buscar certificados/cursos:", error); } finally { setLoading(false); } }; fetchCertificatesAndCourses();
  }, [user]);

  const getValidityInfo = (issuedDate: Date, validityMonths: number | null): string | null => {
    // ... (getValidityInfo permanece o mesmo) ...
     if (!validityMonths) return null; const expiryDate = addMonths(issuedDate, validityMonths); const formattedExpiryDate = format(expiryDate, 'dd/MM/yyyy', { locale: ptBR }); return `Válido por ${validityMonths} ${validityMonths === 1 ? 'mês' : 'meses'} (até ${formattedExpiryDate})`;
  };

  // ✅ Função handleDownloadPDF com HTML COMPLETO
  const handleDownloadPDF = async (certificate: CertificateWithCourseInfo) => {
    if (!user) return;
    setDownloadingId(certificate.id);

    const { data: resultData, error } = await supabase
      .from('exercise_results')
      .select('score, total_questions')
      .eq('user_id', user.id)
      .eq('course_id', certificate.course_id)
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !resultData) {
        alert('Não foi possível encontrar o resultado do teste associado a este certificado.');
        setDownloadingId(null);
        return;
    }

    // ✅ Variáveis sendo USADAS no HTML abaixo
    const score = Math.round((resultData.score / resultData.total_questions) * 100);
    const syllabusItems = certificate.syllabus?.map((item: string) => `<li>${item}</li>`).join('') || '<li>Conteúdo não disponível.</li>';
    const userCPF = user.cpf || 'CPF não preenchido'; // USADO
    const duration = certificate.duration_hours || 10;
    const logoUrl = 'https://ckpbdoxtlopaiaupenqd.supabase.co/storage/v1/object/public/logo%20empilha%20plus/EMPILHA+PLUS.png'; // USADO
    const instructorSignatureUrl = 'https://ckpbdoxtlopaiaupenqd.supabase.co/storage/v1/object/public/logo%20empilha%20plus/Assinatura%20Rodrigo.png'; // USADO
    const issuedDate = new Date(certificate.issued_at);
    const validityInfo = getValidityInfo(issuedDate, certificate.validity_months); // USADO

    // ✅✅✅ HTML COMPLETO E CORRIGIDO ✅✅✅
    const content = `
      <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&family=Roboto:wght@400;500&display=swap');
            body { margin: 0; font-family: 'Roboto', sans-serif; color: #333; background-color: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page { width: 11in; height: 8.5in; display: flex; flex-direction: column; justify-content: space-between; border: 15px solid #0D2847; box-sizing: border-box; padding: 0.8in; background-color: white; position: relative; /* Para posicionar elementos filhos */ }
            .page-break { page-break-before: always; }
            .cert-header { text-align: center; margin-top: 0.3in; }
            .cert-header img { max-width: 190px; margin-bottom: 12px; }
            .cert-header h1 { font-family: 'Montserrat', sans-serif; font-size: 30px; letter-spacing: 1px; color: #0D2847; margin: 0; font-weight: 700; }
            .cert-body { flex-grow: 1; /* Ocupa espaço disponível */ display: flex; flex-direction: column; justify-content: center; /* Centraliza verticalmente */ text-align: center; line-height: 1.6; padding-top: 10px; padding-bottom: 10px; /* Reduz padding se necessário */ }
            .cert-body p { font-size: 1.05rem; margin: 6px auto; /* Reduzido margem */ color: #333; max-width: 95%; }
            .student-name { font-family: 'Montserrat', sans-serif; font-size: 2.1rem; color: #FBBF24; font-weight: 700; margin: 8px 0 15px 0; }
            .cert-footer { display: flex; justify-content: space-around; align-items: flex-end; width: 100%; padding-top: 20px; /* Adiciona espaço acima */ }
            .signature-block { width: 280px; text-align: center; padding-bottom: 10px; } /* Adiciona padding inferior */
            .signature-line { border-top: 1px solid #444; position: relative; padding-top: 5px; margin-bottom: 5px; }
            .signature-img { position: absolute; bottom: 8px; /* Ajusta posição vertical */ left: 50%; transform: translateX(-50%); width: 140px; opacity: 0.95; max-height: 50px; object-fit: contain; } /* Controla altura */
            .signature-block p { margin: 0; font-weight: 600; font-size: 12px; }
            .signature-block span { font-size: 10px; color: #555; }
            .bottom-info { width: 100%; text-align: center; position: absolute; bottom: 0.4in; left: 0; right: 0; } /* Posiciona no fundo */
            .code-bottom { font-size: 10px; color: #777; margin-bottom: 3px; font-family: monospace; }
            .validity-info { font-size: 10px; color: #555; }

            /* Estilos Syllabus */
            .syllabus-page { border: 15px solid #0D2847; padding: 0.8in; box-sizing: border-box; background-color: white; height: 8.5in; display: flex; flex-direction: column; }
            .syllabus-header { text-align: center; margin-bottom: 0.2in; flex-shrink: 0; } /* Ajustado */
            .syllabus-header img { max-width: 150px; }
            .syllabus-page h2 { font-family: 'Montserrat', sans-serif; font-size: 24px; color: #0D2847; border-bottom: 2px solid #FBBF24; padding-bottom: 8px; margin-bottom: 20px; text-align: center; flex-shrink: 0; }
            .syllabus-content { flex-grow: 1; overflow: hidden; } /* Permite que o conteúdo cresça */
            .syllabus-page ul { max-width: 90%; margin: 0 auto; padding: 0; list-style: none; column-count: 2; column-gap: 30px; } /* Usa 2 colunas */
            .syllabus-page li { font-size: 11px; /* Reduzido */ margin-bottom: 6px; padding-left: 15px; position: relative; line-height: 1.3; word-wrap: break-word; overflow-wrap: break-word; page-break-inside: avoid; column-break-inside: avoid; }
            .syllabus-page li::before { content: '•'; color: #FBBF24; position: absolute; left: 0; top: 0px; font-size: 16px; }
            .syllabus-footer { flex-shrink: 0; text-align: center; margin-top: 20px; font-size: 10px; color: #555; } /* Rodapé Syllabus */
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
                  concluiu com aproveitamento o treinamento de <strong>${certificate.courseTitle}</strong>,
                  conforme determina a Portaria MT nº 3.214, de 8 de Junho de 1978, com carga horária de <strong>${duration} horas</strong>.
                </p>
                <p>Promovido pela <strong>Empilha Plus Treinamentos</strong>, CNPJ nº 35.077.899/0001-25.</p>
                <p>Concluído em ${format(issuedDate, 'dd/MM/yyyy', { locale: ptBR })} com pontuação final de <strong>${score}%</strong>.</p>
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
                   Código de Validação: ${certificate.certificate_code}
                 </div>
                 ${validityInfo ? `<div class="validity-info">${validityInfo}</div>` : ''}
              </div>
            </div>

            <div class="page syllabus-page page-break"> 
              <div class="syllabus-header">
                <img src="${logoUrl}" alt="Logo Empilha Plus" />
              </div>
              <h2>Conteúdo Programático - ${certificate.courseTitle}</h2>
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
        alert("Ocorreu um erro ao gerar o PDF do certificado.");
    } finally {
        setDownloadingId(null);
    }
  };

  // --- Renderização JSX ---
  if (loading) return <div className="text-white text-center p-8">Carregando...</div>;

  return (
    <div className="text-white">
      <h1 className="text-3xl font-bold mb-2 text-text-primary">Meus Certificados</h1>
      <Link to="/" className="inline-flex items-center text-text-secondary hover:text-white mb-6 group transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
        Voltar ao Dashboard
      </Link>

      {certificates.length > 0 ? (
        <div className="space-y-4">
          {certificates.map(cert => (
            <div key={cert.id} className="bg-primary p-6 rounded-lg border border-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <Award className="w-10 h-10 text-secondary" />
                <div>
                  <h2 className="text-xl font-bold text-text-primary">{cert.courseTitle}</h2>
                  <p className="text-sm text-text-secondary mt-1">
                    Emitido em: {new Date(cert.issued_at).toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-xs font-mono bg-background mt-2 p-1 rounded-md inline-block">
                    Código: {cert.certificate_code}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDownloadPDF(cert)}
                disabled={downloadingId === cert.id}
                className="flex items-center justify-center gap-2 bg-secondary text-primary font-bold py-2 px-5 rounded-lg hover:bg-accent transition-colors w-full sm:w-auto disabled:opacity-50"
              >
                {downloadingId === cert.id ? (
                  <><Loader className="animate-spin w-4 h-4" /><span>Gerando...</span></>
                ) : (
                  <><Download size={16} /><span>Baixar Certificado</span></>
                )}
              </button>
            </div>
          ))}
        </div>
      ) : (
         <div className="text-center p-10 bg-primary rounded-lg">
           <p className="text-text-secondary">Você ainda não conquistou nenhum certificado.</p>
           <p className="text-text-secondary mt-2">Conclua os testes finais dos cursos para gerá-los!</p>
         </div>
      )}
    </div>
  );
};