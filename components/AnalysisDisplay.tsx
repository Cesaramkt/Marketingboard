import React from 'react';
import type { Source } from '../types';

interface AnalysisDisplayProps {
  analysisText: string | undefined;
  sources: Source[] | undefined;
  onConfirm: () => void;
  onBack: () => void;
}

const parseMarkdown = (text: string) => {
    const blocks = text.split('\n\n'); // Split by double newlines to group list items
    
    return blocks.flatMap((block, blockIndex) => {
        const lines = block.split('\n');
        
        if (lines.some(line => line.trim().startsWith('- '))) {
            const listItems = lines
                .filter(line => line.trim().startsWith('- '))
                .map((line, lineIndex) => (
                    <li key={`${blockIndex}-${lineIndex}`} className="mb-1">{line.trim().substring(2)}</li>
                ));
            return <ul key={blockIndex} className="list-disc pl-5 mb-4">{listItems}</ul>;
        }

        return lines.map((line, lineIndex) => {
            if (line.startsWith('## ')) {
                return <h2 key={`${blockIndex}-${lineIndex}`} className="text-xl font-bold text-purple-700 mt-6 mb-3 pb-2 border-b border-purple-100">{line.substring(3)}</h2>;
            }
            if (line.trim() === '') {
                return null;
            }
            return <p key={`${blockIndex}-${lineIndex}`} className="mb-3 leading-relaxed">{line}</p>;
        });
    });
};

export const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ analysisText, sources, onConfirm, onBack }) => {
    if (!analysisText) {
        return (
            <div className="text-center p-8">
                <p>Carregando análise...</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto">
             <button onClick={onBack} className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 group">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Voltar
            </button>
            <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-xl">
                <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">Análise Profunda da Marca</h1>
                <p className="text-center text-gray-600 mb-8">Nossa IA realizou uma pesquisa (OSINT) sobre a empresa. Revise o diagnóstico abaixo. Ele será a base para criar todo o marketingboard.</p>
                
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 text-gray-700">
                    {parseMarkdown(analysisText)}
                </div>

                {sources && sources.length > 0 && (
                    <div className="mt-8">
                        <h3 className="font-semibold text-gray-800 text-lg">Fontes Utilizadas na Análise:</h3>
                        <ul className="mt-2 text-sm space-y-1">
                            {sources.map((source, index) => (
                                <li key={index} className="flex items-start">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-purple-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline break-all">{source.title}</a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                
                <div className="flex justify-center gap-4 mt-10">
                    <button
                        onClick={onBack}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-6 rounded-lg shadow-sm transition-all duration-300"
                    >
                        Voltar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105"
                    >
                        Confirmar e Gerar Núcleo da Marca
                    </button>
                </div>
            </div>
        </div>
    );
};
