import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Variáveis de ambiente
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const webhookSecret = process.env.HOTMART_WEBHOOK_SECRET!;
const resendApiKey = process.env.RESEND_API_KEY!;
const portalUrl = 'https://portalcursovap.fipei.com.br'; // URL do seu portal

const supabase = createClient(supabaseUrl, serviceKey);
const resend = new Resend(resendApiKey);

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
    const name = payload?.data?.buyer?.name || ''; // Pega o nome do comprador também

    if (!email) {
      console.error("Email do comprador não encontrado no payload.", JSON.stringify(payload, null, 2));
      return { statusCode: 400, body: 'Email do comprador não encontrado.' };
    }

    // Tenta criar o usuário. Se já existir, a função continua.
    const { data: userData, error: createUserError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { name: name } // Salva o nome do usuário no perfil
    });

    if (createUserError && !createUserError.message.includes('User already registered')) {
      console.error("Erro ao criar usuário no Supabase:", createUserError.message);
      return { statusCode: 500, body: 'Erro ao criar usuário' };
    }

    // PONTO-CHAVE: Gerar link de redefinição de senha para o primeiro acesso
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery', // 'recovery' força o usuário a criar uma nova senha
        email: email,
    });

    if (linkError) {
        console.error("Erro ao gerar link de acesso:", linkError.message);
        return { statusCode: 500, body: 'Erro ao gerar link de acesso' };
    }
    
    const magicLink = linkData.properties.action_link;

    // Enviar o e-mail de boas-vindas SEGURO
    await resend.emails.send({
      from: 'Método VAP <contato@email.fipei.com.br>',
      to: email,
      subject: '✅ Seu acesso ao Método VAP está liberado!',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #0AFF0F;">🎉 Bem-vindo ao Método VAP, ${name}!</h2>
          <p>Seu acesso à nossa área de membros exclusiva já está liberado.</p>
          <p>Para o seu primeiro acesso, clique no botão abaixo para definir sua senha pessoal e entrar no portal.</p>
          <p style="margin: 30px 0;">
            <a href="${magicLink}" style="background-color: #0AFF0F; color: #000; padding: 15px 25px; text-decoration: none; font-weight: bold; border-radius: 5px;">
              ACESSAR O PORTAL E DEFINIR MINHA SENHA
            </a>
          </p>
          <p>Seu login será sempre o seu e-mail: <strong>${email}</strong></p>
          <p>O material em PDF do curso está disponível para download dentro do portal, na sua área de aluno.</p>
          <br>
          <p>💚 Bons estudos!</p>
        </div>
      `
    });

    console.log(`Usuário processado e e-mail de boas-vindas enviado para ${email}`);
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, email })
    };

  } catch (err) {
    const error = err as Error;
    console.error('Erro geral no webhook:', error.message);
    return { statusCode: 500, body: 'Erro interno do servidor' };
  }
};