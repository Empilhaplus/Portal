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

        // ✅ CORREÇÃO PRINCIPAL: Buscar o usuário na tabela 'auth.users'
        // 1. Tenta encontrar o usuário na tabela de autenticação
        const { data: existingAuthUser, error: authUserError } = await supabase
          .from('users')
          .inSchema('auth') // Especifica que queremos a tabela 'users' do schema 'auth'
          .select('id')
          .eq('email', email)
          .single();

        if (authUserError && authUserError.code !== 'PGRST116') { // PGRST116 = 'exact one row not found'
            throw new Error(`Erro ao buscar usuário na auth: ${authUserError.message}`);
        }
        
        if (existingAuthUser) {
            // SCENARIO 1: Cliente existente. Apenas pegamos o ID.
            userId = existingAuthUser.id;
            console.log(`Cliente existente encontrado na autenticação: ${email}, ID: ${userId}`);
        } else {
            // SCENARIO 2: Cliente não existe. Criamos o novo usuário.
            console.log(`Usuário ${email} não encontrado. Criando novo usuário...`);
            const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
              email, email_confirm: true, user_metadata: { name: name }
            });

            if (createUserError) {
              throw new Error(`Erro ao criar usuário: ${createUserError.message}`);
            }
            if (!newUser || !newUser.user) {
              throw new Error('Criação do usuário não retornou os dados esperados.');
            }
            
            userId = newUser.user.id;
            isNewUser = true; // Marca que este usuário é novo
            console.log(`Novo usuário criado com ID: ${userId}`);
        }
        
        // 2. Matricula o usuário no curso correto (sem alteração)
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

        // 3. Envia o e-mail de boas-vindas APENAS se for um usuário novo (sem alteração)
        if (isNewUser) {
            const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
                type: 'recovery', email: email,
            });
            if (linkError) throw new Error(`Erro ao gerar link de acesso: ${linkError.message}`);
            
            const magicLink = linkData.properties.action_link;

            await resend.emails.send({
              from: 'Empilha+Plus Treinamentos <onboarding@resend.dev>',
              to: email,
              subject: `✅ Seu acesso ao curso está liberado!`,
              html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                  <h2 style="color: #0AFF0F;">🎉 Bem-vindo, ${name}!</h2>
                  <p>Seu acesso ao nosso portal de treinamentos já está liberado.</p>
                  <p>Para o seu primeiro acesso, clique no botão abaixo para <strong>definir sua senha pessoal</strong> e entrar.</p>
                  <p style="margin: 30px 0;">
                    <a href="${magicLink}" style="background-color: #0AFF0F; color: #000; padding: 15px 25px; text-decoration: none; font-weight: bold; border-radius: 5px;">
                      ACESSAR O PORTAL E DEFINIR MINHA SENHA
                    </a>
                  </p>
                  <p>Seu login será sempre o seu e-mail: <strong>${email}</strong></p>
                  <br>
                  <p>💚 Bons estudos!</p>
                </div>`
            });
            console.log(`E-mail de boas-vindas enviado para ${email}`);
        }
        break;
      }
      
      case 'canceled':
      case 'refunded':
      case 'chargeback':
      case 'expired': {
        // --- AÇÃO: Remover acesso ---
        
        // ✅ CORREÇÃO PRINCIPAL: Buscar o usuário na tabela 'auth.users'
        // 1. Encontra o ID do usuário pelo e-mail na tabela de autenticação
        const { data: userToRemove, error: findError } = await supabase
            .from('users')
            .inSchema('auth')
            .select('id')
            .eq('email', email)
            .single();

        if (!userToRemove || findError) {
          console.log(`Usuário ${email} não encontrado para remover acesso. Ignorando.`);
          break;
        }

        // 2. Remove a matrícula do curso específico
        const { error: deleteError } = await supabase
          .from('user_courses')
          .delete()
          .match({ user_id: userToRemove.id, course_id: courseId });

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
    return { statusCode: 500, body: 'Erro interno do servidor.' };
  }
};