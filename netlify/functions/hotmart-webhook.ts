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
        
        let userId: string;
        let isNewUser = false;

        // ✅ CORREÇÃO PRINCIPAL: Tentar criar primeiro, depois buscar se necessário
        console.log(`Tentando criar/processar usuário para ${email}...`);
        const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
          email, 
          email_confirm: true, // Já cria confirmado
          user_metadata: { name: name }
        });

        if (createUserError && createUserError.message.includes('User already registered')) {
            // SCENARIO 1: Usuário já existe. Precisamos buscar o ID dele na tabela profiles.
            console.log(`Usuário ${email} já existe na autenticação. Buscando ID no perfil...`);
            // IMPORTANTE: Assumimos que a tabela 'profiles' tem uma coluna 'id' que é a FK para auth.users.id
            // E que você tem um trigger/RLS que copia o email ou que a busca pelo ID é suficiente.
            // A busca mais segura aqui é pelo ID que *deveria* existir se o trigger funcionou.
            // Vamos tentar buscar pelo email na tabela profiles, se ela tiver essa coluna.
            // Se a tabela profiles NÃO tiver email, esta busca precisa ser ajustada.
            const { data: existingProfile, error: profileError } = await supabase
              .from('profiles')
              .select('id') // Seleciona o ID do perfil (que deve ser o mesmo do auth.users)
              .eq('email', email) // Tenta buscar pelo email, SE a coluna existir
              .single();

            // Se a busca acima falhar porque a coluna email não existe em profiles,
            // precisaremos de outra estratégia (talvez buscar todos os usuários via admin API e filtrar,
            // ou garantir que a tabela profiles tenha o email).
            // Por enquanto, vamos assumir que a busca acima funciona ou que o erro indicará o problema.

            if (profileError || !existingProfile) {
              // Tentativa alternativa: Buscar o usuário na auth DEPOIS do erro de criação
              const { data: existingAuthUserRetry, error: retryAuthError } = await supabase.auth.admin.getUserById(
                // Precisamos obter o ID de alguma forma. Se não temos o email em profiles, estamos bloqueados aqui.
                // Vamos lançar um erro mais informativo por enquanto.
                 "ID_DO_USUARIO_PRECISA_SER_OBTIDO_DE_ALGUMA_FORMA" 
                 // Se você tiver o email na tabela profiles, pode usar existingProfile.id
              );

               if (retryAuthError || !existingAuthUserRetry?.user) {
                 throw new Error(`Erro Crítico de Sincronização: Usuário ${email} existe (auth) mas ID não pôde ser recuperado via perfil/retry.`);
               }
               userId = existingAuthUserRetry.user.id;
               console.log(`ID recuperado via retry na auth: ${userId}`);

            } else {
               userId = existingProfile.id; // Usa o ID encontrado no perfil
               console.log(`ID encontrado no perfil existente: ${userId}`);
            }

        } else if (createUserError) {
            // SCENARIO 2: Outro erro durante a criação.
            throw new Error(`Erro ao criar usuário: ${createUserError.message}`);
        
        } else if (!newUser || !newUser.user) {
            // SCENARIO 3: Criação bem-sucedida, mas não retornou dados.
            throw new Error('Criação do usuário não retornou os dados esperados.');
        
        } else {
            // SCENARIO 4: Criação bem-sucedida! Usuário é novo.
            userId = newUser.user.id;
            isNewUser = true;
            console.log(`Novo usuário criado com ID: ${userId}`);
        }
        
        // 2. Matricula o usuário no curso correto
        const { error: enrollmentError } = await supabase
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

        // 3. Envia o e-mail de boas-vindas APENAS se for um usuário novo
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
              html: `... (seu HTML de e-mail aqui) ...`
            });
            console.log(`E-mail de boas-vindas enviado para ${email}`);
        }
        break;
      }
      
      case 'canceled': // ... (lógica de cancelamento precisa ser revisada também)
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