import React from 'react';

interface HomePageProps {
  onStart: () => void;
}

const FeatureCard: React.FC<{icon: React.ReactNode, title: string, children: React.ReactNode}> = ({ icon, title, children }) => (
    <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-200 dark:border-white/10 text-center transform transition-all duration-300 hover:-translate-y-2 hover:shadow-xl dark:hover:bg-slate-800 hover:bg-white">
        {icon}
        <h3 className="font-bold text-xl mb-2 text-gray-900 dark:text-slate-100">{title}</h3>
        <p className="text-gray-600 dark:text-slate-400 text-sm">{children}</p>
    </div>
);

const featureIcons = {
    creation: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4 text-fuchsia-600 dark:text-fuchsia-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 2.5l1.5 3-1 1.5-3-1.5-1.5-3l3-1.5 1.5 1.5zM14.5 7.5l1.5 3-1 1.5-3-1.5-1.5-3l3-1.5 1.5 1.5zM4.5 12.5l1.5 3-1 1.5-3-1.5-1.5-3l3-1.5 1.5 1.5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 3l-1.93 1.93a3.5 3.5 0 00-4.95 4.95L3 15" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 9l-5.02 5.02a3.5 3.5 0 01-4.95-4.95L15 5" />
        </svg>
    ),
    structured: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4 text-cyan-600 dark:text-cyan-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
    ),
    download: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4 text-violet-600 dark:text-violet-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    ),
    easy: (
         <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4 text-fuchsia-600 dark:text-fuchsia-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM2.25 10.5a8.25 8.25 0 1116.5 0 8.25 8.25 0 01-16.5 0z" />
        </svg>
    )
};


export const HomePage: React.FC<HomePageProps> = ({ onStart }) => {
  return (
    <div className="bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white relative overflow-hidden transition-colors duration-300">
      <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 relative">
        {/* Background smoke/blob effects - visible mostly in dark mode, subtle in light */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-fuchsia-300 dark:bg-fuchsia-500 rounded-full filter blur-3xl opacity-30 dark:opacity-20 animate-blob"></div>
            <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-300 dark:bg-cyan-500 rounded-full filter blur-3xl opacity-30 dark:opacity-20 animate-blob animation-delay-2"></div>
            <div className="absolute -bottom-20 left-20 w-80 h-80 bg-violet-300 dark:bg-violet-600 rounded-full filter blur-3xl opacity-30 dark:opacity-20 animate-blob animation-delay-4"></div>
        </div>
        
        {/* Central Content */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-4xl w-full">
            <div className="relative p-8 md:p-10">
                <h1 className="text-6xl md:text-8xl font-serif font-bold text-gray-900 dark:text-slate-100 tracking-tighter">
                    Marketingboard
                </h1>
                <p className="mt-4 text-lg md:text-xl text-gray-600 dark:text-slate-300 max-w-lg mx-auto">
                    Crie seu manual de marketing completo em minutos.
                </p>
            </div>
            <button
                onClick={onStart}
                className="mt-10 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-purple-500/20 transition-all duration-300 transform hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-purple-500/50"
            >
                Começar Agora
            </button>
        </div>
        
      </div>
      <div className="py-20 px-4 bg-white dark:bg-slate-900 relative z-10 transition-colors duration-300">
        <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4 text-gray-900 dark:text-slate-100">As vantagens de usar o Marketingboard</h2>
            <p className="text-lg text-gray-600 dark:text-slate-400 mb-12 max-w-3xl mx-auto">Uma solução completa para criar, gerenciar e compartilhar suas diretrizes de marca e marketing de forma inteligente.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <FeatureCard icon={featureIcons.creation} title="Fácil criação">
                    Crie um manual de marketing online completo com a ajuda da nossa IA.
                </FeatureCard>
                <FeatureCard icon={featureIcons.structured} title="Personalizado e estruturado">
                    Criação fácil e intuitiva de suas diretrizes. Fácil de usar e totalmente personalizada de acordo com suas especificações.
                </FeatureCard>
                <FeatureCard icon={featureIcons.download} title="Baixe e envie seus arquivos">
                    Crie seu marketingboard e tenha todos os seus ativos prontos para download em PDF.
                </FeatureCard>
                <FeatureCard icon={featureIcons.easy} title="A maneira mais fácil de criar">
                    O Marketingboard valoriza a imagem da sua marca. Ele tem bom desempenho e é fácil de usar.
                </FeatureCard>
            </div>
        </div>
    </div>
      <style>{`
          .font-serif { font-family: 'Playfair Display', serif; }
          
          @keyframes blob {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          
          .animate-blob {
            animation: blob 8s infinite ease-in-out;
          }

          .animation-delay-2 {
              animation-delay: -2s;
          }
           .animation-delay-4 {
              animation-delay: -4s;
          }
      `}</style>
    </div>
  );
};