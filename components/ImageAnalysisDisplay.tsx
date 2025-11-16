import React from 'react';

interface ImageAnalysisDisplayProps {
  imageSrc: string;
  analysisText: string;
  onBack: () => void;
}

const parseMarkdown = (text: string) => {
    const blocks = text.split('\n\n'); 
    
    return blocks.flatMap((block, blockIndex) => {
        const lines = block.split('\n');
        
        if (lines.some(line => line.trim().startsWith('* ') || line.trim().startsWith('- '))) {
            const listItems = lines
                .filter(line => line.trim().startsWith('* ') || line.trim().startsWith('- '))
                .map((line, lineIndex) => (
                    <li key={`${blockIndex}-${lineIndex}`} className="mb-1">{line.trim().substring(2)}</li>
                ));
            return <ul key={blockIndex} className="list-disc pl-5 mb-4">{listItems}</ul>;
        }

        return lines.map((line, lineIndex) => {
            if (line.startsWith('## ')) {
                return <h2 key={`${blockIndex}-${lineIndex}`} className="text-xl font-bold text-purple-700 mt-6 mb-3 pb-2 border-b border-purple-100">{line.substring(3)}</h2>;
            }
             if (line.startsWith('**') && line.endsWith('**')) {
                return <h3 key={`${blockIndex}-${lineIndex}`} className="text-lg font-semibold text-gray-800 mt-4 mb-2">{line.substring(2, line.length-2)}</h3>;
            }
            if (line.trim() === '') {
                return null;
            }
            return <p key={`${blockIndex}-${lineIndex}`} className="mb-3 leading-relaxed">{line}</p>;
        });
    });
};


export const ImageAnalysisDisplay: React.FC<ImageAnalysisDisplayProps> = ({ imageSrc, analysisText, onBack }) => {
    return (
        <div className="max-w-5xl mx-auto">
            <button onClick={onBack} className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 group">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Voltar e analisar outra imagem
            </button>
            <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-xl">
                <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">Resultado da Análise</h1>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="flex flex-col">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center md:text-left">Imagem Enviada</h2>
                         <div className="bg-gray-100 rounded-lg p-4 border border-gray-200 flex justify-center items-center flex-grow">
                             <img src={imageSrc} alt="Imagem analisada" className="max-w-full max-h-96 object-contain rounded-md" />
                         </div>
                    </div>
                    <div className="flex flex-col">
                         <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center md:text-left">Análise da IA</h2>
                         <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 text-gray-700 prose max-w-none">
                            {parseMarkdown(analysisText)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};