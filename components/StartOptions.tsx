import React from 'react';

const LightbulbIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
);

const BuildingIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
);

interface StartOptionsProps {
  onSelect: (mode: 'NEW_IDEA' | 'EXISTING_COMPANY') => void;
}

export const StartOptions: React.FC<StartOptionsProps> = ({ onSelect }) => {
    
    const OptionCard: React.FC<{title: string, description: string, icon: React.ReactNode, onClick: () => void}> = ({ title, description, icon, onClick }) => (
        <div 
            onClick={onClick}
            className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-lg hover:shadow-purple-500/10 border border-gray-200 dark:border-slate-700 hover:border-purple-500 transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
        >
            <div className="flex flex-col items-center text-center">
                {icon}
                <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">{title}</h3>
                <p className="text-gray-600 dark:text-slate-400">{description}</p>
            </div>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold text-center text-gray-900 dark:text-slate-100 mb-2 font-['Playfair_Display',_serif]">Como você quer começar?</h2>
            <p className="text-center text-lg text-gray-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto">Escolha uma opção para iniciar a criação do seu brandboard.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <OptionCard 
                    title="Criar uma marca do zero"
                    description="Ideal para quem tem uma nova ideia de negócio e precisa de uma identidade completa, do conceito ao logo."
                    icon={<LightbulbIcon />}
                    onClick={() => onSelect('NEW_IDEA')}
               />
               <OptionCard 
                    title="Analisar uma empresa existente"
                    description="Forneça o site ou nome de uma empresa para extrair a identidade atual e gerar um brandboard a partir dela."
                    icon={<BuildingIcon />}
                    onClick={() => onSelect('EXISTING_COMPANY')}
               />
            </div>
        </div>
    );
};