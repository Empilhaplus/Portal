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
      console.error("Dados essenciais (email, status, productId) não encontrados.", JSON.stringify(payload, null, 2));
      return { statusCode: 400, body: 'Payload incompleto.' };
    }

    const courseId = getCourseIdFromHotmartProductId(hotmartProductId);
    if (!courseId) {
      console.log(`Produto ${hotmartProductId} não mapeado. Ignorando evento.`);
      return { statusCode: 200, body: `Produto ${hotmartProductId} não mapeado. Ignorando.` };
    }
    
    const normalizedStatus = status.toLowerCase();

    switch (normalizedStatus) {
      case 'approved':
      case 'aprovado': {
        
        let userId: string;
        let isNewUser = false; // Flag para saber se precisamos enviar o e-mail de boas-vindas

        // 1. Tenta encontrar o usuário na tabela de perfis
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single();

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = 'exact one row not found'
            throw new Error(`Erro ao buscar perfil: ${profileError.message}`);
        }
        
        if (existingProfile) {
            // SCENARIO 1: Cliente existente, comprando de novo. Perfeito.
            userId = existingProfile.id;
            console.log(`Cliente existente: ${email}, ID: ${userId}`);
        } else {
            // SCENARIO 2: Cliente não encontrado em 'profiles'. Tentar criar.
            console.log(`Perfil não encontrado para ${email}. Tentando criar novo usuário...`);
            const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
              email, email_confirm: true, user_metadata: { name: name }
            });

            // ✅ LÓGICA DE CORREÇÃO PRINCIPAL ESTÁ AQUI 
            if (createUserError && createUserError.message.includes('User already registered')) {
                // SCENARIO 3: Cliente não estava em 'profiles', mas JÁ ESTAVA em 'auth'.
                // Isso é o que aconteceu com você! O usuário existe, só precisamos do ID.
                // Vamos buscar no 'profiles' de novo, pois o trigger do Supabase já pode ter criado o perfil.
                console.log(`Usuário ${email} já existe na autenticação. Buscando perfil novamente...`);
                const { data: profileAgain, error: profileErrorAgain } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('email', email)
                    .single();
                
                if (profileErrorAgain || !profileAgain) {
                    throw new Error(`Erro Crítico de Sincronização: Usuário ${email} existe (auth) mas não foi encontrado (profiles). Verifique seus triggers de banco de dados.`);
                }
                userId = profileAgain.id;
            
            } else if (createUserError) {
                // SCENARIO 4: Um erro de criação diferente (ex: e-mail inválido)
                throw new Error(`Erro ao criar usuário: ${createUserError.message}`);
            
            } else if (!newUser || !newUser.user) {
                // SCENARIO 5: Sucesso na criação, mas não retornou dados (erro inesperado)
                throw new Error('Criação do usuário não retornou os dados esperados.');
            } else {
                // SCENARIO 6: Sucesso! O usuário é 100% novo.
                userId = newUser.user.id;
                isNewUser = true; // Marca que este usuário é novo
                console.log(`Novo usuário criado com ID: ${userId}`);
            }
        }
        
        // 2. Matricula o usuário no curso correto
        const { error: enrollmentError } = await supabase
          .from('user_courses')
          .insert({ user_id: userId, course_id: courseId });
        
        if (enrollmentError && enrollmentError.code !== '23505') { // 23505 = unique_violation (já matriculado)
            throw new Error(`Erro ao matricular usuário: ${enrollmentError.message}`);
        }
        
        if (enrollmentError?.code === '23505') {
            console.log(`Usuário ${email} já estava matriculado neste curso. Nenhuma ação necessária.`);
        } else {
            console.log(`Usuário ${email} matriculado com sucesso no curso ${courseId}`);
        }

        // 3. Envia o e-mail de boas-vindas APENAS se for um usuário novo
        if (isNewUser) {
            const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
                type: 'recovery', email: email,
            });
            if (linkError) throw new Error(`Erro ao gerar link de acesso: ${linkError.message}`);
            
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
      
      // Lógica de cancelamento...
      case 'canceled':
      case 'refunded':
      // ...
        break;
      
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