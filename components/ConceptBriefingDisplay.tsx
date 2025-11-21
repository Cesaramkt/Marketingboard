import React, { useState, useEffect } from 'react';
import type { ValidationData } from '../types';
import { regenerateFieldText } from '../services/geminiService';
import { TestimonialPanel } from './TestimonialPanel';
import { FileUploader } from './FileUploader';

interface ConceptBriefingDisplayProps {
  validationData: ValidationData | null;
  onConfirm: (updatedData: ValidationData, logoFile: File | null) => void;
  onBack: () => void;
}

const SpinnerIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const EditableField: React.FC<{
  as?: 'p' | 'h4' | 'div';
  value: string;
  onUpdate: (newValue: string) => void;
  className?: string;
}> = ({ as: Component = 'p', value, onUpdate, className = '' }) => {
  const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
    const newValue = e.currentTarget.textContent || '';
    if (newValue !== value) {
      onUpdate(newValue);
    }
  };

  return (
    <Component
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      dangerouslySetInnerHTML={{ __html: value }}
      className={`focus:outline-none focus:bg-gray-100/50 dark:focus:bg-slate-700/50 focus:ring-1 focus:ring-purple-400 rounded-sm p-1 -m-1 ${className}`}
    />
  );
};


export const ConceptBriefingDisplay: React.FC<ConceptBriefingDisplayProps> = ({ validationData, onConfirm, onBack }) => {
    const [editableData, setEditableData] = useState(validationData);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [noLogo, setNoLogo] = useState(false);
    const [comment, setComment] = useState('');
    const [isRegenerating, setIsRegenerating] = useState(false);
    
    useEffect(() => {
        setEditableData(validationData);
    }, [validationData]);

    if (!editableData) return null;

    const handleUpdate = (field: keyof ValidationData['businessBriefing'], value: string) => {
        setEditableData(prev => prev ? ({
            ...prev,
            businessBriefing: { ...prev.businessBriefing!, [field]: value }
        }) : null);
    };

    const handleRegenerate = async () => {
        setIsRegenerating(true);
        try {
            const newText = await regenerateFieldText(
                editableData, 
                {}, 
                'businessBriefing', 
                JSON.stringify(editableData.businessBriefing), 
                comment
            );
            const newBriefing = JSON.parse(newText);
            setEditableData(prev => prev ? ({ ...prev, businessBriefing: newBriefing }) : null);
        } catch (e) {
            alert("Falha ao reescrever o briefing. Por favor, tente novamente.");
        } finally {
            setIsRegenerating(false);
        }
    };
    
    const handleFileSelect = (file: File) => {
        setLogoFile(file);
        setNoLogo(false);
    };
    
    const handleNoLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNoLogo(e.target.checked);
        if (e.target.checked) {
            setLogoFile(null);
        }
    };

    return (
        <div className="grid md:grid-cols-2 min-h-[calc(100vh-140px)]">
            <div className="flex flex-col justify-between p-8 sm:p-16 bg-white dark:bg-slate-900 overflow-y-auto">
                <div>
                    <button onClick={onBack} className="flex items-center text-sm text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 mb-8 group">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Voltar
                    </button>

                    <h1 className="text-5xl font-bold text-gray-900 dark:text-slate-100 tracking-tight font-['Playfair_Display',_serif]">A Ideia de Negócio</h1>
                    <p className="mt-4 text-gray-600 dark:text-slate-400 max-w-lg">
                        A IA analisou sua ideia e o mercado, criando este briefing estratégico. Revise, edite e aprove para continuarmos.
                    </p>

                    <div className="mt-8 prose prose-lg dark:prose-invert max-w-none space-y-6">
                        <div>
                            <h2 className="text-xl font-semibold text-purple-600 dark:text-purple-400 !mb-2">Ideia do Produto/Serviço</h2>
                            <EditableField as="div" value={editableData.businessBriefing?.productServiceIdea || ''} onUpdate={v => handleUpdate('productServiceIdea', v)} />
                        </div>
                         <div>
                            <h2 className="text-xl font-semibold text-purple-600 dark:text-purple-400 !mb-2">Estratégia de Distribuição</h2>
                            <EditableField as="div" value={editableData.businessBriefing?.distributionStrategy || ''} onUpdate={v => handleUpdate('distributionStrategy', v)} />
                        </div>
                         <div>
                            <h2 className="text-xl font-semibold text-purple-600 dark:text-purple-400 !mb-2">Impacto e Potencial</h2>
                            <EditableField as="div" value={editableData.businessBriefing?.impactAndPotential || ''} onUpdate={v => handleUpdate('impactAndPotential', v)} />
                        </div>
                    </div>

                    <div className="mt-8 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700">
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Gostou, mas quer ajustar? Deixe um comentário para a IA..."
                            rows={2}
                            className="w-full bg-white dark:bg-slate-800 text-sm p-3 rounded-md border border-gray-300 dark:border-slate-600 focus:ring-2 focus:ring-purple-500"
                        />
                        <button onClick={handleRegenerate} disabled={isRegenerating || !comment.trim()} className="mt-2 text-sm font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isRegenerating ? 'Reescrevendo...' : 'Reescrever com IA'}
                        </button>
                    </div>

                    <div className="mt-8 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700">
                        <h3 className="font-semibold text-gray-800 dark:text-slate-200 mb-4">Você já tem um logotipo?</h3>
                         <FileUploader onFileSelect={handleFileSelect} uploadedFileName={logoFile?.name} disabled={noLogo} />
                         <div className="flex items-center mt-4">
                            <input type="checkbox" id="no-logo" checked={noLogo} onChange={handleNoLogoChange} className="h-4 w-4 text-purple-600 bg-gray-100 dark:bg-slate-600 border-gray-300 dark:border-slate-500 rounded focus:ring-purple-500" />
                            <label htmlFor="no-logo" className="ml-2 block text-sm text-gray-700 dark:text-slate-300">
                                Não tenho um logotipo, a IA pode criar um.
                            </label>
                        </div>
                    </div>

                </div>

                <div className="mt-12">
                     <button onClick={() => onConfirm(editableData, noLogo ? null : logoFile)} className="bg-gray-900 dark:bg-white text-white dark:text-black font-semibold py-3 px-8 rounded-full shadow-md transition-all duration-300 ease-in-out transform hover:scale-105">
                        Aprovar e Gerar Núcleo da Marca
                     </button>
                </div>
            </div>
            <TestimonialPanel />
        </div>
    );
};