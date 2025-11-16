import React from 'react';
import type { CompanyCandidate } from '../types';

interface CandidateSelectionModalProps {
  isVisible: boolean;
  candidates: CompanyCandidate[];
  onSelect: (candidate: CompanyCandidate) => void;
  onReject: () => void;
}

const CloseIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const CandidateCard: React.FC<{ candidate: CompanyCandidate; onSelect: () => void; }> = ({ candidate, onSelect }) => {
    const getTag = () => {
        switch (candidate.matchType) {
            case 'EXATO_NA_CIDADE':
                return <span className="text-xs font-bold uppercase tracking-wider bg-green-100 text-green-800 px-2 py-1 rounded-full">Melhor Correspondência</span>;
            case 'NOME_CORRETO_OUTRA_CIDADE':
                 return <span className="text-xs font-bold uppercase tracking-wider bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">Em Outra Cidade</span>;
            default:
                return <span className="text-xs font-bold uppercase tracking-wider bg-gray-100 text-gray-800 px-2 py-1 rounded-full">Sugestão</span>;
        }
    };
    
    return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-left space-y-3 transition-shadow hover:shadow-md">
            <div className="flex justify-between items-start">
                <h3 className="font-semibold text-purple-700 text-lg pr-4">{candidate.companyName}</h3>
                {getTag()}
            </div>
            <p className="text-sm text-gray-600">{candidate.address}</p>
            {candidate.websiteUrl && candidate.websiteUrl !== 'Não encontrado' && (
                 <a href={candidate.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-purple-600 hover:underline break-all block">{candidate.websiteUrl}</a>
            )}
            <button 
                onClick={onSelect}
                className="w-full mt-2 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-300 rounded-lg shadow-sm transition-colors"
            >
                É esta, selecionar
            </button>
        </div>
    );
};

export const CandidateSelectionModal: React.FC<CandidateSelectionModalProps> = ({ 
    isVisible, 
    candidates,
    onSelect, 
    onReject
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg text-center p-8 relative" onClick={e => e.stopPropagation()}>
        <button onClick={onReject} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition-colors">
            <CloseIcon className="h-6 w-6" />
        </button>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Encontramos alguns resultados</h2>
        <p className="text-gray-600 mb-6">
            A IA encontrou mais de uma empresa com o nome parecido. Para garantir a precisão, por favor, selecione a empresa correta abaixo.
        </p>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {candidates.map(candidate => (
                <CandidateCard key={candidate.id} candidate={candidate} onSelect={() => onSelect(candidate)} />
            ))}
        </div>
        
        <div className="mt-8">
            <button
                onClick={onReject}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-6 rounded-lg shadow-sm transition-all duration-300"
            >
                Nenhuma destas, refazer a busca
            </button>
        </div>
      </div>
    </div>
  );
};