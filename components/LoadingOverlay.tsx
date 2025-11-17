import React, { useState, useEffect, useRef } from 'react';
import { AppLogo } from './AppLogo';

interface LoadingOverlayProps {
  message: string;
  streamingText?: string;
}

const interestingFacts = [
  "Marcas com apresentação consistente têm uma receita, em média, 33% maior.",
  "47% dos internautas brasileiros sempre buscam informações online antes de comprar em lojas físicas.",
  "96% dos consumidores leem avaliações no Google antes de escolher uma loja.",
  "Empresas que utilizam Inteligência Artificial relatam um aumento de 71% na produtividade.",
];

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const Spinner: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message, streamingText }) => {
  const [fact, setFact] = useState('');
  const [thinkingSteps, setThinkingSteps] = useState<string[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFact(interestingFacts[Math.floor(Math.random() * interestingFacts.length)]);
    const interval = setInterval(() => {
      setFact(interestingFacts[Math.floor(Math.random() * interestingFacts.length)]);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (streamingText) {
        // Stop updating if the JSON response starts
        if (streamingText.includes('```json')) {
            return;
        }

        const lines = streamingText.split('\n');
        const steps = lines
            .filter(line => line.startsWith('PENSAMENTO:'))
            .map(line => line.replace('PENSAMENTO:', '').trim())
            .filter(step => step.length > 0);
        
        setThinkingSteps(steps);
    } else {
        setThinkingSteps([]);
    }
  }, [streamingText]);


  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [thinkingSteps]);

  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col justify-center items-center z-50 p-4 overflow-hidden">
        {/* Background Blobs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-fuchsia-500 rounded-full filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500 rounded-full filter blur-3xl opacity-20 animate-blob animation-delay-2"></div>
            <div className="absolute -bottom-20 left-20 w-80 h-80 bg-violet-600 rounded-full filter blur-3xl opacity-20 animate-blob animation-delay-4"></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center w-full">
            <div className="flex items-center justify-center space-x-4 mb-4">
                <div className="animate-spin" style={{ animationDuration: '3s' }}>
                <AppLogo />
                </div>
            </div>
            <p className="text-slate-100 text-xl font-medium animate-pulse text-center">{message}</p>
            
            {streamingText !== undefined && thinkingSteps.length > 0 ? (
                <div 
                ref={scrollContainerRef}
                className="mt-6 w-full max-w-2xl bg-slate-800/50 backdrop-blur-sm rounded-lg shadow-lg max-h-[50vh] overflow-y-auto p-6 font-sans text-slate-300 border border-white/10"
                >
                    <ul className="space-y-3">
                        {thinkingSteps.map((step, index) => {
                             const isLastStep = index === thinkingSteps.length - 1;
                             return (
                                <li key={index} className={`flex items-center gap-3 transition-opacity duration-300 ${isLastStep ? 'text-white' : 'text-slate-400'}`}>
                                    {isLastStep 
                                        ? <Spinner className="h-5 w-5 text-fuchsia-400 flex-shrink-0" />
                                        : <CheckIcon className="h-5 w-5 text-green-400 flex-shrink-0" />
                                    }
                                    <span className={isLastStep ? 'font-medium' : ''}>{step}</span>
                                </li>
                             )
                        })}
                    </ul>
                </div>
            ) : (
                <p className="text-slate-400 text-sm mt-4 max-w-md text-center transition-opacity duration-500">{fact}</p>
            )}
        </div>
        <style>{`
          @keyframes blob {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          .animate-blob { animation: blob 8s infinite ease-in-out; }
          .animation-delay-2 { animation-delay: -2s; }
          .animation-delay-4 { animation-delay: -4s; }
      `}</style>
    </div>
  );
};