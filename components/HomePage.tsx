import React from 'react';

interface HomePageProps {
  onStart: () => void;
}

const FeatureCard: React.FC<{icon: React.ReactNode, title: string, children: React.ReactNode}> = ({ icon, title, children }) => (
    <div className="bg-white dark:bg-brand-surface p-8 rounded-card border border-gray-100 dark:border-white/10 shadow-card hover:shadow-lg transition-all duration-300 hover:-translate-y-2 group">
        <div className="mb-6 group-hover:scale-110 transition-transform duration-300">{icon}</div>
        <h3 className="font-bold text-xl mb-3 text-gray-900 dark:text-white font-display">{title}</h3>
        <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed">{children}</p>
    </div>
);

const featureIcons = {
    creation: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
    ),
    structured: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
    ),
    download: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
    ),
    easy: (
         <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
    )
};


export const HomePage: React.FC<HomePageProps> = ({ onStart }) => {
  return (
    <div className="bg-white dark:bg-brand-dark text-gray-900 dark:text-white relative overflow-hidden transition-colors duration-300 w-full">
      {/* Hero Section */}
      <div className="w-full min-h-[90vh] flex flex-col justify-center items-center p-4 relative bg-brand-dark text-white">
         {/* Glow Effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-primary/20 rounded-full blur-[120px] pointer-events-none"></div>

        {/* Hero Content */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-5xl w-full px-4">
            <span className="inline-block py-2 px-4 rounded-pill border border-white/20 bg-white/5 backdrop-blur-sm text-sm font-medium tracking-wide mb-8 text-brand-primary">
                AGÊNCIA DE MARKETING COM IA
            </span>
            <h1 className="text-6xl md:text-8xl font-display font-bold text-white tracking-tight leading-tight mb-8">
                Crie seu Marketingboard em <span className="text-brand-primary">minutos</span>.
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12 font-light">
                O manual de marketing completo para alinhar sua equipe, orientar freelancers e solidificar sua marca.
            </p>
            <button
                onClick={onStart}
                className="bg-brand-primary hover:bg-brand-hover text-black font-bold py-4 px-10 rounded-pill text-lg shadow-glow hover:shadow-glow transition-all duration-300 transform hover:scale-105"
            >
                Começar Agora
            </button>
        </div>
      </div>

      {/* Features Grid */}
      <div className="py-32 px-6 bg-brand-gray dark:bg-brand-dark border-t border-gray-200 dark:border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
                <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 text-gray-900 dark:text-white">
                    Design System de Marketing
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                    Uma estrutura profissional que transforma ideias soltas em um sistema de marca coerente e acionável.
                </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <FeatureCard icon={featureIcons.creation} title="Criação Guiada">
                    A IA atua como seu Diretor de Estratégia, fazendo as perguntas certas e gerando respostas de alto nível.
                </FeatureCard>
                <FeatureCard icon={featureIcons.structured} title="Estrutura Validada">
                    Baseado em metodologias de grandes agências. Do propósito à estratégia de canais, nada fica de fora.
                </FeatureCard>
                <FeatureCard icon={featureIcons.download} title="Exportação Profissional">
                    Baixe seu marketingboard em PDF pronto para compartilhar com stakeholders, equipe e parceiros.
                </FeatureCard>
                <FeatureCard icon={featureIcons.easy} title="Visual Incrível">
                    Design moderno e tipografia elegante que valorizam a apresentação da sua marca desde o primeiro dia.
                </FeatureCard>
            </div>
        </div>
    </div>
    </div>
  );
};