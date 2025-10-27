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

// Função de Mapeamento (Preencha com seus IDs)
function getCourseIdFromHotmartProductId(productId: number): string | null {
  if (productId === 6457666) { 
    return '9adbbcb4-63dc-4521-9e7d-20cd62259f4a'; // NR-06
  }
  if (productId === 6475697) { // Substitua pelo ID real do NR-10 Básico
    return '05b91c42-fffb-4836-88e8-3325347c3b63'; // NR-10 Básico UUID
  }
  if (productId === 6475285) { // Substitua pelo ID real do NR-01
    return 'a9de04a3-e0f7-4ac1-a303-3b980a62c80c'; // NR-01 UUID
  }
  if (productId === 6508848) { // Substitua pelo ID real do NR-10 SEP
    return '1729ba53-3d7c-4b07-aedd-d57b7ece4e2a'; // NR-10 SEP UUID
  }
  if (productId === 6508941) { // Substitua pelo ID real do NR-11
    return '8d4dc6cc-3ec2-4a5f-b62c-f42fb6aebd23'; // NR-11 UUID
  }
  if (productId === 6509913) { // Substitua pelo ID real do NR-12
    return '950d17c6-dc4c-4b4c-a414-c18d32159c2a'; // NR-12 UUID
  }if (productId === 6509949) { // Substitua pelo ID real do NR-16
    return '25ca194d-837e-4890-82ae-f0782fd515dc'; // NR-16 UUID
  }
  if (productId === 6509974) { // Substitua pelo ID real do NR-18
    return 'd9d502c6-2f5f-4bb9-af90-9cdb23bd2ab3'; // NR-18 UUID
  }
  if (productId === 6510009) { // Substitua pelo ID real do NR-20
    return '8feeab8f-08b7-4761-b1ec-a9dd79570177'; // NR-20 UUID
  }if (productId === 6510031) { // Substitua pelo ID real do NR-33
    return 'd1f17359-c9cc-48e1-90ed-af590832d162'; // NR-33 UUID
  }
  if (productId === 6510064) { // Substitua pelo ID real do NR-34
    return '4d7128f0-bff9-405c-b002-58b77d78ab21'; // NR-34 UUID
  }
  if (productId === 6510080) { // Substitua pelo ID real do NR-35
    return 'c075f4dd-4e54-4f15-bd18-2d7580765944'; // NR-35 UUID
  }
  if (productId === 6510193) { // Substitua pelo ID real do NR-36
    return 'f24c050c-5121-4765-bae2-b847c8515850'; // NR-36 UUID
  }
  if (productId === 9999999) { // Substitua pelo ID real do NR-37
    return '111111111111111111111111111111111111'; // NR-37 UUID
  }
  // Adicione outros cursos aqui...
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

        // --- Bloco de Envio de E-mail ---
        console.log(`Preparando para enviar e-mail para ${email}...`);
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery', 
            email: email,
        });
        if (linkError) throw new Error(`Erro ao gerar link de acesso: ${linkError.message}`);
        
        const magicLink = linkData.properties.action_link;

        try {
            const { data, error: emailError } = await resend.emails.send({
              // ✅ REMETENTE ATUALIZADO AQUI
              from: 'Empilha+Plus Treinamentos <contato@empilhaplusportal.fipei.com.br>', 
              to: email,
              subject: isNewUser ? `✅ Bem-vindo! Seu acesso ao curso está liberado!` : `✅ Acesso liberado ao novo curso!`, 
              html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                  <h2 style="color: #0AFF0F;">🎉 Olá, ${name}!</h2>
                  <p>Seu acesso ao curso foi liberado com sucesso em nosso portal.</p>
                  <p>Clique no botão abaixo para acessar o portal. Se for seu primeiro acesso ou você esqueceu sua senha, este link permitirá que você defina/redefina sua senha.</p>
                  <p style="margin: 30px 0;">
                    <a href="${magicLink}" style="background-color: #0AFF0F; color: #000; padding: 15px 25px; text-decoration: none; font-weight: bold; border-radius: 5px;">
                      ACESSAR O PORTAL
                    </a>
                  </p>
                  <p>Seu login é sempre o seu e-mail: <strong>${email}</strong></p>
                  <br>
                  <p>💚 Bons estudos!</p>
                </div>` // Mantenha ou ajuste seu HTML aqui
            });

            if (emailError) {
                console.error(`ERRO AO ENVIAR E-MAIL via Resend para ${email}:`, emailError);
                 console.log("Webhook continuará apesar do erro no envio do e-mail.");
            } else {
                console.log(`E-mail de acesso/boas-vindas enviado com sucesso para ${email}. ID Resend: ${data?.id}`);
            }
        } catch (resendCatchError) {
            console.error(`ERRO INESPERADO ao tentar enviar e-mail para ${email}:`, resendCatchError);
             console.log("Webhook continuará apesar do erro inesperado no envio do e-mail.");
        }
        // --- Fim do Bloco de Envio de E-mail ---
        
        break; // Fim do case 'approved'
      }
      
      case 'canceled':
      case 'refunded':
      case 'chargeback':
      case 'expired': {
        // ... (lógica de cancelamento) ...
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