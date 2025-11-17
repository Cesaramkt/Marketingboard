import React from 'react';
import type { Source } from '../types';

interface AnalysisDisplayProps {
  analysisText: string | undefined;
  sources: Source[] | undefined;
  onConfirm: () => void;
  onBack: () => void;
}

interface Section {
  title: string;
  content: string;
}

const parseContentToListItems = (contentBlock: string) => {
    return contentBlock.split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('- ') || line.startsWith('* '))
      .map((line, index) => (
        <li key={index} className="mb-2">{line.substring(2)}</li>
      ));
};

const parseContentToParagraphs = (contentBlock: string) => {
    return contentBlock.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('- ') && !line.startsWith('* '))
        .map((line, index) => <p key={index} className="mb-4 leading-relaxed">{line}</p>)
}

const parseAnalysisToSections = (text: string): Section[] => {
  const sections: Section[] = [];
  // Split on lines that start with ##, keeping the delimiter
  const rawSections = text.split(/^(?=##\s)/m); 

  rawSections.forEach(rawSection => {
    if (rawSection.trim() === '') return;
    const lines = rawSection.split('\n');
    const title = lines[0].replace('## ', '').trim();
    const content = lines.slice(1).join('\n').trim();
    sections.push({ title, content });
  });

  return sections;
};

export const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ analysisText, sources, onConfirm, onBack }) => {
    if (!analysisText) {
        return (
            <div className="text-center p-8">
                <p>Carregando análise...</p>
            </div>
        );
    }

    const analysisSections = parseAnalysisToSections(analysisText);

    return (
        <div className="max-w-4xl mx-auto">
             <button onClick={onBack} className="flex items-center text-sm text-slate-400 hover:text-slate-200 mb-4 group">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Voltar
            </button>
            <div className="bg-slate-800/50 backdrop-blur-sm p-6 sm:p-10 rounded-2xl shadow-xl border border-slate-700">
                <h1 className="text-3xl font-bold text-center text-slate-100 mb-2 font-['Playfair_Display',_serif]">Análise Profunda da Marca</h1>
                <p className="text-center text-slate-400 mb-8">Nossa IA realizou uma pesquisa sobre a empresa. Revise o diagnóstico abaixo. Ele será a base para criar todo o marketingboard.</p>
                
                <div className="space-y-6">
                    {analysisSections.map((section, index) => {
                         const listItems = parseContentToListItems(section.content);
                         const paragraphs = parseContentToParagraphs(section.content);

                         return (
                            <div key={index} className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-slate-300 transition-all hover:border-purple-500/30">
                                <h2 className="text-xl font-bold text-purple-400 mb-4">{section.title}</h2>
                                <div className="prose prose-invert max-w-none text-slate-300">
                                    {paragraphs}
                                    {listItems.length > 0 && (
                                        <ul className="list-disc pl-5 space-y-1">
                                            {listItems}
                                        </ul>
                                    )}
                                </div>
                            </div>
                         )
                    })}
                </div>

                {sources && sources.length > 0 && (
                    <div className="mt-8">
                        <h3 className="font-semibold text-slate-200 text-lg">Fontes Utilizadas na Análise:</h3>
                        <ul className="mt-2 text-sm space-y-1">
                            {sources.map((source, index) => (
                                <li key={index} className="flex items-start">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-purple-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline break-all">{source.title}</a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                
                <div className="flex justify-center gap-4 mt-10">
                    <button
                        onClick={onBack}
                        className="bg-slate-600 hover:bg-slate-500 text-slate-100 font-semibold py-2 px-6 rounded-lg shadow-sm transition-all duration-300"
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