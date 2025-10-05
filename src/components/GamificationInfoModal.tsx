import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Award, TrendingUp, Star, Target, Edit3 } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const GamificationInfoModal: React.FC<Props> = ({ onClose }) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#1E1E1E] rounded-2xl p-8 border border-gray-700 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="prose prose-invert prose-headings:text-white prose-p:text-gray-300 prose-strong:text-white max-w-none">
            <h2 className="text-3xl font-bold text-center mb-6 text-[#0AFF0F]">
              Como Funciona a Gamificação? 🚀
            </h2>
            <p className="text-center">
              Sua jornada de aprendizado no Portal Método VAP é também uma aventura! Cada passo que você dá, cada módulo que completa e cada desafio que supera se transforma em recompensas. Veja como funciona:
            </p>

            <div className="mt-8 space-y-6">
              
              <div className="flex items-start gap-3">
                <div className="bg-[#0AFF0F]/10 p-3 rounded-lg"><Star className="w-6 h-6 text-[#0AFF0F]" /></div>
                <div>
                  <h3 className="font-bold text-lg">1. Ganhe Pontos (PTS) por Cada Ação</h3>
                  <p>Você ganha pontos por cada ação importante que realiza. A conclusão de cada <strong>módulo</strong> concede uma pontuação base, e o desbloqueio de <strong>conquistas</strong> garante pontos de bônus significativos. Seu total está sempre visível no topo da página!</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-[#0AFF0F]/10 p-3 rounded-lg"><TrendingUp className="w-6 h-6 text-[#0AFF0F]" /></div>
                <div>
                  <h3 className="font-bold text-lg">2. Suba de Nível e Mostre sua Evolução</h3>
                  <p>A cada <strong>500 pontos</strong> que você acumula, você sobe de nível automaticamente. Seu nível é um símbolo da sua maestria e dedicação ao método, representando seu crescimento profissional.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-[#0AFF0F]/10 p-3 rounded-lg"><Award className="w-6 h-6 text-[#0AFF0F]" /></div>
                <div>
                  <h3 className="font-bold text-lg">3. Desbloqueie Conquistas Épicas</h3>
                  <p>As conquistas são medalhas especiais por atingir marcos importantes. Elas te dão um bônus de pontos e podem ser vistas no seu <strong>Mural de Conquistas</strong>. Existem vários tipos de desafios, como:</p>
                  <ul className="list-disc list-inside mt-2 text-green-100">
                    <li>Completar seu primeiro módulo (<strong>Primeiros Passos</strong>).</li>
                    <li>Completar múltiplos módulos em sequência (<strong>Dedicação Constante</strong>).</li>
                    <li>Acertar 100% em um quiz (<strong>Mente Brilhante</strong>).</li>
                    <li>Acumular uma grande quantidade de pontos (<strong>Maratonista dos Pontos</strong>).</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-[#0AFF0F]/10 p-3 rounded-lg"><Target className="w-6 h-6 text-[#0AFF0F]" /></div>
                <div>
                  <h3 className="font-bold text-lg">4. Defina e Cumpra Suas Metas</h3>
                  <p>Use a seção <strong>"Metas"</strong> para definir seus próprios objetivos (ex: "Completar 3 módulos"). Ao cumprir uma meta definida por você, além de acelerar seu aprendizado, você desbloqueia a conquista exclusiva <strong>"Mestre das Metas"</strong>!</p>
                </div>
              </div>

               <div className="flex items-start gap-3">
                <div className="bg-[#0AFF0F]/10 p-3 rounded-lg"><Edit3 className="w-6 h-6 text-[#0AFF0F]" /></div>
                <div>
                  <h3 className="font-bold text-lg">5. Teste seu Conhecimento com os Exercícios</h3>
                  <p>Ao final de cada módulo, não se esqueça de fazer os <strong>Exercícios Práticos</strong>. Eles são a chave para reforçar o aprendizado e são necessários para desbloquear conquistas de desempenho, como a "Mente Brilhante".</p>
                </div>
              </div>

            </div>

            <p className="text-center mt-10 text-lg">
              <strong>Bons estudos, e que comece a jornada!</strong>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};