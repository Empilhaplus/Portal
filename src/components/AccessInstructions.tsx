import React from 'react';
import { Link } from 'react-router-dom';

const AccessInstructions: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto py-12 px-6 text-white">
      <h1 className="text-4xl font-bold text-center mb-8 text-[#0AFF0F]">Instruções de Acesso</h1>

      <div className="space-y-6 bg-[#1E1E1E] p-6 rounded-xl border border-gray-700">
        <p>Após realizar sua compra pela Hotmart, você receberá um e-mail com seus dados de acesso ao portal educacional do <strong>Método VAP</strong>.</p>

        <ul className="list-disc list-inside space-y-2">
          <li><strong>Portal de Acesso:</strong> <a href="https://portalcursovap.fipei.com.br" className="text-[#0AFF0F] underline">portalcursovap.fipei.com.br</a></li>
          <li><strong>Login:</strong> seu e-mail utilizado na compra</li>
          <li><strong>Senha:</strong> será gerada automaticamente e enviada no seu e-mail</li>
        </ul>

        <p>⚠️ Caso não localize o e-mail na caixa de entrada, verifique o <strong>lixo eletrônico</strong> ou <strong>spam</strong>.</p>

        <p>Você poderá alterar sua senha após o primeiro acesso, acessando a opção "Alterar Senha" no menu principal do portal.</p>

        <p>Se precisar de suporte, entre em contato pelo e-mail: <a href="mailto:contato@email.fipei.com.br" className="text-[#0AFF0F] underline">contato@email.fipei.com.br</a></p>

        <div className="text-center pt-6">
          <Link to="/login" className="inline-block px-6 py-3 bg-[#0AFF0F] text-black rounded-lg font-medium hover:bg-[#0AFF0F]/90 transition-colors">
            Ir para Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AccessInstructions;
