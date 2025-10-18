import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Variáveis de ambiente
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const webhookSecret = process.env.HOTMART_WEBHOOK_SECRET!;
const resendApiKey = process.env.RESEND_API_KEY!;

const supabaseAdmin = createClient(supabaseUrl, serviceKey);
const resend = new Resend(resendApiKey);

// Função de Mapeamento (sem alterações aqui)
function getCourseIdFromHotmartProductId(productId: number): string | null {
  if (productId === 6457666) { 
    return '9adbbcb4-63dc-4521-9e7d-20cd62259f4a';
  }
  if (productId === 445566) {
    return '05b91c42-fffb-4836-88e8-3325347c3b63';
  }
  if (productId === 778899) {
    return '1729ba53-3d7c-4b07-aedd-d57b7ece4e2a';
  }
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

    if (!email || !status || hotmartProductId === undefined || hotmartProductId === null) {
      console.error("Dados essenciais não encontrados.", JSON.stringify(payload, null, 2));
      return { statusCode: 400, body: 'Payload incompleto.' };
    }

    const courseId = getCourseIdFromHotmartProductId(hotmartProductId);
    if (!courseId) {
      console.log(`Produto ${hotmartProductId} não mapeado. Ignorando.`);
      return { statusCode: 200, body: `Produto ${hotmartProductId} não mapeado. Ignorando.` };
    }
    
    const normalizedStatus = status.toLowerCase();

    switch (normalizedStatus) {
      case 'approved':
      case 'aprovado': {
        
        let userId: string; // userId declared for this block
        let isNewUser = false;

        console.log(`Verificando usuário ${email} via RPC...`);
        const { data: foundUserId, error: rpcError } = await supabaseAdmin.rpc(
            'find_user_id_by_email', { user_email: email }
        );

        if (rpcError) {
             throw new Error(`Erro ao chamar RPC find_user_id_by_email: ${rpcError.message}`);
        }

        if (foundUserId) {
            userId = foundUserId as string;
            console.log(`Cliente existente encontrado via RPC: ${email}, ID: ${userId}`);
        } else {
            console.log(`Usuário ${email} não encontrado via RPC. Criando novo usuário...`);
            const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
              email, email_confirm: true, user_metadata: { name: name }
            });

            if (createUserError) {
              if (createUserError.message.includes('User already registered')) {
                  console.warn(`Criação falhou (usuário já existe), tentando buscar via RPC novamente...`);
                  const { data: retryUserId, error: retryError } = await supabaseAdmin.rpc('find_user_id_by_email', { user_email: email });
                  if (retryError || !retryUserId) {
                      throw new Error(`Erro Crítico de Sincronização: Usuário ${email} existe mas não foi encontrado na retentativa RPC.`);
                  }
                  userId = retryUserId as string;
              } else {
                  throw new Error(`Erro ao criar usuário: ${createUserError.message}`);
              }
            } else if (!newUser || !newUser.user) {
              throw new Error('Criação do usuário não retornou os dados esperados.');
            } else {
              userId = newUser.user.id;
              isNewUser = true;
              console.log(`Novo usuário criado com ID: ${userId}`);
            }
        }
        
        console.log(`Matriculando UserID: ${userId} no CursoID: ${courseId}`);
        const { error: enrollmentError } = await supabaseAdmin
          .from('user_courses')
          .insert({ user_id: userId, course_id: courseId });
        
        if (enrollmentError && enrollmentError.code !== '23505') {
            throw new Error(`Erro ao matricular usuário: ${enrollmentError.message}`);
        }
        
        if (enrollmentError?.code === '23505') {
            console.log(`Usuário ${email} já estava matriculado neste curso.`);
        } else {
            console.log(`Usuário ${email} matriculado com sucesso no curso ${courseId}`);
        }

        if (isNewUser) {
             const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                type: 'recovery', email: email,
            });
            if (linkError) throw new Error(`Erro ao gerar link de acesso: ${linkError.message}`);
            
            const magicLink = linkData.properties.action_link;

            await resend.emails.send({
              from: 'Empilha+Plus Treinamentos <onboarding@resend.dev>',
              to: email,
              subject: `✅ Seu acesso ao curso está liberado!`,
              html: `... (seu HTML de e-mail aqui) ...` 
            });
            console.log(`E-mail de boas-vindas enviado para ${email}`);
        }
        break;
      }
      
      case 'canceled':
      case 'refunded':
      case 'chargeback':
      case 'expired': {
        
        // 1. Busca o ID via RPC
        const { data: removeUserId, error: rpcRemoveError } = await supabaseAdmin.rpc('find_user_id_by_email', { user_email: email });
        
        if(rpcRemoveError || !removeUserId) {
            console.log(`Usuário ${email} não encontrado para remover acesso via RPC. Ignorando.`);
            break; // Sai do case se o usuário não for encontrado
        }
        
        // ✅ CORREÇÃO APLICADA AQUI: Usar a variável correta 'removeUserId'
        // 2. Remove matrícula usando o ID encontrado
        const { error: deleteError } = await supabaseAdmin
          .from('user_courses')
          .delete()
          .match({ user_id: removeUserId, course_id: courseId }); // Usando removeUserId aqui

        if (deleteError) throw new Error(`Erro ao remover matrícula: ${deleteError.message}`);

        console.log(`Acesso removido para ${email} do curso ${courseId} devido ao status: ${status}`);
        break;
      }
      
      default:
        console.log(`Evento com status "${status}" recebido e ignorado.`);
    }

    return { statusCode: 200, body: 'Webhook processado com sucesso.' };

  } catch (err) {
    const error = err as Error;
    console.error('Erro geral no webhook:', error.message);
    return { statusCode: 500, body: `Erro interno do servidor: ${error.message}` };
  }
};