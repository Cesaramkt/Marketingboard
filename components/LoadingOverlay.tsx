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
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
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
    <div className="fixed inset-0 bg-white dark:bg-brand-dark flex flex-col justify-center items-center z-50 p-4 overflow-hidden transition-colors duration-300">
        {/* Background Blobs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-primary/10 rounded-full filter blur-[100px] animate-blob"></div>
            <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-brand-primary/10 rounded-full filter blur-[100px] animate-blob animation-delay-2"></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center w-full max-w-2xl">
            <div className="flex items-center justify-center space-x-4 mb-8">
                <div className="animate-spin" style={{ animationDuration: '3s' }}>
                <AppLogo />
                </div>
            </div>
            <h3 className="text-gray-900 dark:text-white text-2xl font-display font-bold text-center mb-2">{message}</h3>
            
            {streamingText !== undefined && thinkingSteps.length > 0 ? (
                <div 
                ref={scrollContainerRef}
                className="mt-8 w-full bg-gray-50/80 dark:bg-brand-surface/80 backdrop-blur-md rounded-2xl shadow-xl max-h-[40vh] overflow-y-auto p-6 border border-gray-200 dark:border-white/10"
                >
                    <ul className="space-y-4">
                        {thinkingSteps.map((step, index) => {
                             const isLastStep = index === thinkingSteps.length - 1;
                             return (
                                <li key={index} className={`flex items-start gap-4 transition-all duration-300 ${isLastStep ? 'text-gray-900 dark:text-white scale-100 opacity-100' : 'text-gray-500 dark:text-gray-500 scale-95 opacity-70'}`}>
                                    <div className="mt-0.5">
                                        {isLastStep 
                                            ? <Spinner className="h-5 w-5 text-brand-primary" />
                                            : <CheckIcon className="h-5 w-5 text-brand-primary" />
                                        }
                                    </div>
                                    <span className={`font-medium ${isLastStep ? 'font-bold' : ''}`}>{step}</span>
                                </li>
                             )
                        })}
                    </ul>
                </div>
            ) : (
                <p className="text-gray-500 dark:text-gray-400 text-base mt-4 max-w-md text-center animate-pulse">{fact}</p>
            )}
        </div>
        <style>{`
          @keyframes blob {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          .animate-blob { animation: blob 10s infinite ease-in-out; }
          .animation-delay-2 { animation-delay: -3s; }
      `}</style>
    </div>
  );
};