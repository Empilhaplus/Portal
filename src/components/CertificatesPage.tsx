// src/components/CertificatesPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Award, ArrowLeft, Download, Loader } from 'lucide-react';
import html2pdf from 'html2pdf.js';

interface CertificateWithCourse extends Certificate {
  courseTitle: string;
  syllabus: string[] | null;
}

interface Certificate {
  id: string;
  issued_at: string;
  certificate_code: string;
  course_id: string;
}

export const CertificatesPage: React.FC = () => {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<CertificateWithCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCertificatesAndCourses = async () => {
      if (!user) return;
      setLoading(true);

      const { data: certData, error: certError } = await supabase
        .from('certificates')
        .select('id, issued_at, certificate_code, course_id')
        .eq('user_id', user.id);

      if (certError) {
        console.error("Erro ao buscar certificados:", certError);
        setLoading(false);
        return;
      }

      if (certData && certData.length > 0) {
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('id, title, syllabus');
        
        if (coursesError) {
          console.error("Erro ao buscar cursos:", coursesError);
          setLoading(false);
          return;
        }

        const coursesMap = new Map(coursesData.map(course => [course.id, { title: course.title, syllabus: course.syllabus }]));
        const combinedData = certData.map(cert => ({
          ...cert,
          courseTitle: coursesMap.get(cert.course_id)?.title || 'Curso não encontrado',
          syllabus: coursesMap.get(cert.course_id)?.syllabus || null,
        }));
        setCertificates(combinedData);

      } else {
        setCertificates([]);
      }
      
      setLoading(false);
    };

    fetchCertificatesAndCourses();
  }, [user]);

  const handleDownloadPDF = async (certificate: CertificateWithCourse) => {
    if (!user) return;
    setDownloadingId(certificate.id);

    const { data: resultData, error } = await supabase
      .from('exercise_results')
      .select('score, total_questions')
      .eq('user_id', user.id)
      .eq('course_id', certificate.course_id)
      .single();

    if (error || !resultData) {
      alert('Não foi possível encontrar o resultado do seu teste para gerar o certificado.');
      setDownloadingId(null);
      return;
    }
    
    const score = Math.round((resultData.score / resultData.total_questions) * 100);
    const syllabusItems = certificate.syllabus?.map((item: string) => `<li>${item}</li>`).join('') || '<li>Conteúdo não disponível.</li>';
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
                <p><strong>${certificate.courseTitle}</strong></p>
                <p>Concluído em ${new Date(certificate.issued_at).toLocaleDateString('pt-BR')} com uma pontuação final de <strong>${score}%</strong>.</p>
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
              <p class="code-bottom">Código de Validação: ${certificate.certificate_code}</p>
            </div>
            <div class="page syllabus-page page-break">
              <h2>Conteúdo Programático - ${certificate.courseTitle}</h2>
              <ul>${syllabusItems}</ul>
            </div>
          </div>
        </body>
      </html>
    `;
    const options = { filename: `certificado_${user.name.replace(/\s/g, '_')}.pdf`, image: { type: 'jpeg' as const, quality: 1.0 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' as const } };
    
    html2pdf().from(content).set(options).save().then(() => {
        setDownloadingId(null);
    });
  };

  if (loading) {
    return <div className="text-white text-center p-8">Carregando seus certificados...</div>;
  }

  return (
    <div className="text-white">
      <h1 className="text-3xl font-bold mb-2 text-text-primary">Meus Certificados</h1>
      
      <Link to="/" className="inline-flex items-center text-text-secondary hover:text-white mb-6 group transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
        Voltar ao Dashboard
      </Link>

      {certificates.length > 0 ? (
        <div className="space-y-4">
          {certificates.map((cert) => (
            <div key={cert.id} className="bg-primary p-6 rounded-lg border border-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <Award className="w-10 h-10 text-secondary" />
                </div>
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
                  <>
                    <Loader className="animate-spin w-4 h-4" />
                    <span>Gerando...</span>
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    <span>Baixar Certificado</span>
                  </>
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