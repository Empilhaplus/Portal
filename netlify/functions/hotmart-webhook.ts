import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Variáveis de ambiente
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Chave de Service Role (Admin)
const webhookSecret = process.env.HOTMART_WEBHOOK_SECRET!;
const resendApiKey = process.env.RESEND_API_KEY!;

// Use a Chave de Service Role para operações de Admin (criar usuário, matricular)
const supabaseAdmin = createClient(supabaseUrl, serviceKey);
const resend = new Resend(resendApiKey);

// --- PASSO 1: DEFINA OS UUIDs AQUI ---
// Substitua pelos UUIDs REAIS dos seus cursos no Supabase
const NR01_UUID = 'a9de04a3-e0f7-4ac1-a303-3b980a62c80c'; // Já estava no seu código
const NR06_UUID = '9adbbcb4-63dc-4521-9e7d-20cd62259f4a'; // Já estava no seu código
const NR35_UUID = 'c075f4dd-4e54-4f15-bd18-2d7580765944'; // Já estava no seu código (Confirmar se NR-35 é o terceiro curso do pacote)

// Função de Mapeamento Atualizada
// Agora retorna: string (ID único) | string[] (Lista de IDs para pacotes) | null
function getCourseIdsFromHotmartProductId(productId: number): string | string[] | null {
  if (productId === 6457666) { return NR06_UUID; }
  if (productId === 6475697) { return '05b91c42-fffb-4836-88e8-3325347c3b63'; } // NR-10 Básico
  if (productId === 6475285) { return NR01_UUID; }
  if (productId === 6508848) { return '1729ba53-3d7c-4b07-aedd-d57b7ece4e2a'; } // NR-10 SEP
  if (productId === 6508941) { return '8d4dc6cc-3ec2-4a5f-b62c-f42fb6aebd23'; } // NR-11
  if (productId === 6509913) { return '950d17c6-dc4c-4b4c-a414-c18d32159c2a'; } // NR-12
  if (productId === 6509949) { return '25ca194d-837e-4890-82ae-f0782fd515dc'; } // NR-16
  if (productId === 6509974) { return 'd9d502c6-2f5f-4bb9-af90-9cdb23bd2ab3'; } // NR-18
  if (productId === 6510009) { return '8feeab8f-08b7-4761-b1ec-a9dd79570177'; } // NR-20
  if (productId === 6510031) { return 'd1f17359-c9cc-48e1-90ed-af590832d162'; } // NR-33
  if (productId === 6510064) { return '4d7128f0-bff9-405c-b002-58b77d78ab21'; } // NR-34
  if (productId === 6510080) { return NR35_UUID; }
  if (productId === 6510193) { return 'f24c050c-5121-4765-bae2-b847c8515850'; } // NR-36
  
  // --- PASSO 2: ADICIONE A REGRA PARA O PACOTE ---
  if (productId === 6521819) { // ID do Pacote Essencial
    return [NR01_UUID, NR06_UUID, NR35_UUID]; // Retorna um ARRAY com os 3 IDs
  }

  // Se chegou aqui, o produto não está mapeado
  console.warn(`Produto da Hotmart com ID ${productId} não foi mapeado.`);
  return null;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Verificação de segurança Hottok
    const hottok = event.headers['x-hotmart-hottok'];
    if (hottok !== webhookSecret) {
      console.error("Falha na verificação de segurança. Hottok não corresponde.");
      return { statusCode: 401, body: 'Unauthorized webhook' };
    }

    // Extração dos dados do payload
    const payload = JSON.parse(event.body || '{}');
    const email = payload?.data?.buyer?.email;
    const name = payload?.data?.buyer?.name || '';
    const status = payload?.data?.purchase?.status;
    const hotmartProductId = payload?.data?.product?.id;

    // Validação dos dados essenciais
    if (!email || !status || hotmartProductId === undefined || hotmartProductId === null) {
      console.error("Dados essenciais não encontrados.", JSON.stringify(payload, null, 2));
      return { statusCode: 400, body: 'Payload incompleto.' };
    }

    // --- PASSO 3: OBTENHA OS IDs DOS CURSOS (PODE SER UM OU VÁRIOS) ---
    const courseIdOrIds = getCourseIdsFromHotmartProductId(hotmartProductId);
    if (!courseIdOrIds) {
      console.log(`Produto ${hotmartProductId} não mapeado. Ignorando.`);
      // Retorna 200 OK para a Hotmart não ficar tentando reenviar
      return { statusCode: 200, body: `Produto ${hotmartProductId} não mapeado.` };
    }
    
    // Normaliza para sempre trabalhar com um array de IDs
    const coursesToEnroll = Array.isArray(courseIdOrIds) ? courseIdOrIds : [courseIdOrIds];
    
    const normalizedStatus = status.toLowerCase();

    switch (normalizedStatus) {
      case 'approved':
      case 'aprovado': {
        
        let userId: string;
        let isNewUser = false; 

        // Tenta encontrar o usuário pelo e-mail usando RPC
        console.log(`Verificando usuário ${email} via RPC...`);
        const { data: foundUserId, error: rpcError } = await supabaseAdmin.rpc(
            'find_user_id_by_email', { user_email: email }
        );

        if (rpcError) {
          throw new Error(`Erro ao chamar RPC find_user_id_by_email: ${rpcError.message}`);
        }

        // Se encontrou, usa o ID existente
        if (foundUserId) {
            userId = foundUserId as string;
            console.log(`Cliente existente encontrado via RPC: ${email}, ID: ${userId}`);
        } 
        // Se não encontrou, tenta criar um novo usuário
        else {
            console.log(`Usuário ${email} não encontrado via RPC. Criando novo usuário...`);
            const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
              email, email_confirm: true, user_metadata: { name: name }
            });

            if (createUserError) {
              // Se o erro for "usuário já existe" (condição de corrida), tenta buscar de novo
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
        
        // --- PASSO 4: LOOP PARA MATRICULAR EM TODOS OS CURSOS ---
        let enrollmentSuccessCount = 0;
        for (const courseId of coursesToEnroll) {
          console.log(`Matriculando UserID: ${userId} no CursoID: ${courseId}`);
          const { error: enrollmentError } = await supabaseAdmin
            .from('user_courses') // Verifique se 'user_courses' é o nome correto da sua tabela
            .insert({ user_id: userId, course_id: courseId }); // Verifique se 'user_id' e 'course_id' são os nomes corretos das colunas
          
          // Se houver erro E NÃO FOR erro de duplicidade (código 23505)
          if (enrollmentError && enrollmentError.code !== '23505') {
              console.error(`Erro ao matricular usuário ${userId} no curso ${courseId}: ${enrollmentError.message}`);
              // Decide se quer parar ou continuar para os outros cursos
              // throw new Error(`Erro ao matricular usuário: ${enrollmentError.message}`); 
          } 
          // Se for erro de duplicidade
          else if (enrollmentError?.code === '23505') {
              console.log(`Usuário ${email} (ID: ${userId}) já estava matriculado no curso ${courseId}.`);
              enrollmentSuccessCount++; // Conta como sucesso mesmo assim
          } 
          // Se não houver erro
          else {
              console.log(`Usuário ${email} (ID: ${userId}) matriculado com sucesso no curso ${courseId}`);
              enrollmentSuccessCount++;
          }
        } // Fim do loop for

        // Se pelo menos uma matrícula foi bem-sucedida (ou já existia), envia o e-mail
        if (enrollmentSuccessCount > 0) {
          // --- Bloco de Envio de E-mail (Envia apenas UM e-mail) ---
          console.log(`Preparando para enviar e-mail de acesso/boas-vindas para ${email}...`);
          const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
              type: 'recovery', // Gera um link de redefinição de senha/primeiro acesso
              email: email,
          });
          if (linkError) throw new Error(`Erro ao gerar link de acesso: ${linkError.message}`);
          
          const magicLink = linkData?.properties?.action_link;
          if (!magicLink) throw new Error('Link mágico não foi gerado.');

          try {
              const { data, error: emailError } = await resend.emails.send({
                from: 'Empilha+Plus Treinamentos <contato@empilhaplusportal.fipei.com.br>', // Use seu e-mail verificado
                to: email,
                subject: isNewUser ? `✅ Bem-vindo! Seu acesso aos cursos está liberado!` : `✅ Acesso liberado a novos cursos!`, // Assunto dinâmico
                html: `
                  <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #0d9488;">🎉 Olá, ${name}!</h2>
                    <p>Seu acesso ${coursesToEnroll.length > 1 ? 'aos cursos' : 'ao curso'} foi liberado com sucesso em nosso portal.</p>
                    <p>Clique no botão abaixo para acessar o portal. Se for seu primeiro acesso ou você esqueceu sua senha, este link permitirá que você defina/redefina sua senha.</p>
                    <p style="margin: 30px 0;">
                      <a href="${magicLink}" style="background-color: #facc15; color: #000; padding: 15px 25px; text-decoration: none; font-weight: bold; border-radius: 5px;">
                        ACESSAR O PORTAL
                      </a>
                    </p>
                    <p>Seu login é sempre o seu e-mail: <strong>${email}</strong></p>
                    ${coursesToEnroll.length > 1 ? '<p>Você adquiriu o Pacote Essencial e tem acesso aos cursos: NR-01, NR-06 e NR-35.</p>' : ''} 
                    <br>
                    <p>💚 Bons estudos!</p>
                  </div>` // MENSAGEM AJUSTADA PARA PACOTE
              });

              if (emailError) {
                  console.error(`ERRO AO ENVIAR E-MAIL via Resend para ${email}:`, emailError);
              } else {
                  console.log(`E-mail de acesso/boas-vindas enviado com sucesso para ${email}. ID Resend: ${data?.id}`);
              }
          } catch (resendCatchError) {
              console.error(`ERRO INESPERADO ao tentar enviar e-mail para ${email}:`, resendCatchError);
          }
          // --- Fim do Bloco de Envio de E-mail ---
        } else {
          // Se nenhuma matrícula deu certo (caso raro)
          console.error(`Nenhuma matrícula pôde ser realizada para o usuário ${userId}. E-mail não enviado.`);
        }
        
        break; // Fim do case 'approved'
      }
      
      case 'canceled':
      case 'refunded':
      case 'chargeback':
      case 'expired': {
        // --- Lógica de Cancelamento ---
        console.log(`Recebido status ${normalizedStatus} para ${email}, produto ${hotmartProductId}. Removendo acesso...`);
        
        // Encontra o userId primeiro
        const { data: foundUserId, error: rpcError } = await supabaseAdmin.rpc('find_user_id_by_email', { user_email: email });
        
        if (rpcError) {
           console.error(`Erro ao buscar usuário ${email} para cancelamento via RPC: ${rpcError.message}`);
           // Decide se retorna erro ou continua (pode não conseguir cancelar)
           break; 
        }

        if (!foundUserId) {
           console.warn(`Usuário ${email} não encontrado para cancelamento. Nenhuma ação tomada.`);
           break;
        }
        const userId = foundUserId as string;

        // Loop para remover acesso de TODOS os cursos associados à compra
        for (const courseId of coursesToEnroll) {
          console.log(`Removendo acesso do UserID: ${userId} do CursoID: ${courseId}`);
          const { error: deleteError } = await supabaseAdmin
            .from('user_courses')
            .delete()
            .match({ user_id: userId, course_id: courseId }); // Combinação exata

          if (deleteError) {
            console.error(`Erro ao remover acesso do curso ${courseId} para ${userId}: ${deleteError.message}`);
            // Decide se continua ou para
          } else {
            console.log(`Acesso removido com sucesso para ${userId} do curso ${courseId}.`);
          }
        }
        break;
      }
      
      default:
        console.log(`Evento com status "${status}" recebido e ignorado.`);
    }

    // Retorna 200 OK para a Hotmart
    return { statusCode: 200, body: 'Webhook processado com sucesso.' };

  } catch (err) {
    const error = err as Error;
    console.error('Erro GERAL e INESPERADO no processamento do webhook:', error);
    // Retorna 500 para a Hotmart tentar reenviar mais tarde
    return { statusCode: 500, body: `Erro interno do servidor: ${error.message}` };
  }
};