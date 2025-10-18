import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Variáveis de ambiente
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const webhookSecret = process.env.HOTMART_WEBHOOK_SECRET!;
const resendApiKey = process.env.RESEND_API_KEY!;

const supabase = createClient(supabaseUrl, serviceKey);
const resend = new Resend(resendApiKey);

// Função de Mapeamento (sem alterações aqui)
function getCourseIdFromHotmartProductId(productId: number): string | null {
  if (productId === 6457666) { 
    return '9adbbcb4-63dc-4521-9e7d-20cd62259f4a';
  }
  // IDs de teste da Hotmart também podem ser mapeados, se necessário.
  // if (productId === 0 || productId === 4774438) {
  //   return 'uuid-de-um-curso-de-teste';
  // }
  console.warn(`Produto da Hotmart com ID ${productId} não foi mapeado.`);
  return null;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const hottok = event.headers['x-hotmart-hottok'];
    if (hottok !== webhookSecret) {
      console.error("Falha na verificação de segurança. Hottok não corresponde.");
      return { statusCode: 401, body: 'Unauthorized webhook' };
    }

    const payload = JSON.parse(event.body || '{}');
    const email = payload?.data?.buyer?.email;
    const name = payload?.data?.buyer?.name || '';
    const status = payload?.data?.purchase?.status;
    const hotmartProductId = payload?.data?.product?.id;

    // ✅ CORREÇÃO 1: Verificação mais robusta para permitir productId = 0
    if (!email || !status || hotmartProductId === undefined || hotmartProductId === null) {
      console.error("Dados essenciais (email, status, productId) não encontrados.", JSON.stringify(payload, null, 2));
      return { statusCode: 400, body: 'Payload incompleto.' };
    }

    const courseId = getCourseIdFromHotmartProductId(hotmartProductId);
    if (!courseId) {
      // Se for uma compra real de produto não mapeado, avisa e para.
      // Se for apenas o teste da Hotmart com ID 0, não é um problema.
      console.log(`Produto ${hotmartProductId} não mapeado. Ignorando evento.`);
      return { statusCode: 200, body: `Produto ${hotmartProductId} não mapeado. Ignorando.` };
    }
    
    // ✅ CORREÇÃO 2: Converte o status para minúsculas para padronizar
    const normalizedStatus = status.toLowerCase();

    switch (normalizedStatus) {
      // ✅ CORREÇÃO 3: Adicionado 'aprovado' para compatibilidade com o teste
      case 'approved':
      case 'aprovado': {
        // --- AÇÃO: Liberar acesso ---
        let userId: string;
        
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single();

        if (existingProfile) {
            userId = existingProfile.id;
        } else {
            const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
              email, email_confirm: true, user_metadata: { name: name }
            });
            if (createUserError) throw createUserError;
            if (!newUser || !newUser.user) throw new Error('Criação do usuário não retornou dados.');
            userId = newUser.user.id;
        }
        
        await supabase.from('user_courses').insert({ user_id: userId, course_id: courseId });
        console.log(`Usuário ${email} matriculado com sucesso no curso ${courseId}`);

        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: 'recovery', email: email,
        });
        if (linkError) throw new Error(`Erro ao gerar link de acesso: ${linkError.message}`);
        
        await resend.emails.send({
          from: 'Empilha+Plus Treinamentos <onboarding@resend.dev>',
          to: email,
          subject: `✅ Seu acesso ao curso está liberado!`,
          html: `...` // Conteúdo do e-mail
        });
        break;
      }
      
      // Lógica para cancelamento...
      case 'canceled':
      case 'refunded':
      case 'chargeback':
      case 'expired': {
        // ...
        break;
      }

      default:
        console.log(`Evento com status "${status}" recebido e ignorado.`);
    }

    return { statusCode: 200, body: 'Webhook processado com sucesso.' };

  } catch (err) {
    const error = err as Error;
    console.error('Erro geral no webhook:', error.message);
    return { statusCode: 500, body: 'Erro interno do servidor.' };
  }
};