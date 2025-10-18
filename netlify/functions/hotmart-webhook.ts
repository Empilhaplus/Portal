import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Variáveis de ambiente
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const webhookSecret = process.env.HOTMART_WEBHOOK_SECRET!; // Seu Hottok
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

    if (!email || !status || !hotmartProductId) {
      console.error("Dados essenciais (email, status, productId) não encontrados.", JSON.stringify(payload, null, 2));
      return { statusCode: 400, body: 'Payload incompleto.' };
    }

    const courseId = getCourseIdFromHotmartProductId(hotmartProductId);
    if (!courseId) {
      return { statusCode: 200, body: `Produto ${hotmartProductId} não mapeado. Ignorando.` };
    }

    switch (status) {
      case 'approved': {
        // --- AÇÃO: Liberar acesso ---

        // ✅ CORREÇÃO 1: Lógica de criação/busca de usuário aprimorada
        let userId: string;

        // 1. Tenta encontrar o usuário na tabela de perfis pelo e-mail
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single();

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = 'exact one row not found'
            throw new Error(`Erro ao buscar perfil: ${profileError.message}`);
        }
        
        if (existingProfile) {
            // Se o perfil já existe, usamos o ID dele
            userId = existingProfile.id;
            console.log(`Usuário ${email} já existe com o ID: ${userId}`);
        } else {
            // Se não existe, criamos um novo usuário
            console.log(`Usuário ${email} não encontrado. Criando novo usuário...`);
            const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
              email,
              email_confirm: true,
              user_metadata: { name: name }
            });

            if (createUserError) {
              throw new Error(`Erro ao criar usuário: ${createUserError.message}`);
            }
            if (!newUser || !newUser.user) { // ✅ CORREÇÃO 2: Verificação de 'null'
              throw new Error('Criação do usuário não retornou os dados esperados.');
            }
            userId = newUser.user.id;
            console.log(`Novo usuário criado com ID: ${userId}`);
        }
        
        // 2. Matricula o usuário no curso correto
        const { error: enrollmentError } = await supabase
          .from('user_courses')
          .insert({ user_id: userId, course_id: courseId });
        
        if (enrollmentError && enrollmentError.code !== '23505') {
            throw new Error(`Erro ao matricular usuário: ${enrollmentError.message}`);
        }

        console.log(`Usuário ${email} matriculado com sucesso no curso ${courseId}`);

        // 3. Envia o e-mail de boas-vindas
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email: email,
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
        break;
      }

      case 'canceled':
      case 'refunded':
      case 'chargeback':
      case 'expired': {
        // --- AÇÃO: Remover acesso ---
        
        // ✅ CORREÇÃO 3: Lógica de busca de usuário aprimorada
        // 1. Encontra o ID do usuário pelo e-mail na tabela de perfis
        const { data: profileToRemove, error: findError } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single();

        if (!profileToRemove || findError) {
          console.log(`Perfil de ${email} não encontrado para remover acesso. Ignorando.`);
          break;
        }

        // 2. Remove a matrícula do curso específico
        const { error: deleteError } = await supabase
          .from('user_courses')
          .delete()
          .match({ user_id: profileToRemove.id, course_id: courseId });

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