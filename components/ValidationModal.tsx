import React, { useState, useEffect } from 'react';
import type { ValidationData } from '../types';
import { FileUploader } from './FileUploader';

interface ValidationModalProps {
  isVisible: boolean;
  onConfirm: (logoFile: File | null) => void;
  onReject: () => void;
  onCancel: () => void;
  validationData: ValidationData | null;
}

const CloseIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export const ValidationModal: React.FC<ValidationModalProps> = ({ 
    isVisible, 
    onConfirm, 
    onCancel, 
    onReject,
    validationData, 
}) => {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [noLogo, setNoLogo] = useState(false);
  
  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
        alert('Por favor, envie apenas arquivos de imagem.');
        return;
    }
    setLogoFile(file);
    setNoLogo(false);
  };

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (!isVisible || noLogo) return;

      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleFileSelect(file);
            break;
          }
        }
      }
    };

    if (isVisible) {
      document.addEventListener('paste', handlePaste);
    }

    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [isVisible, noLogo]);


  const handleNoLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNoLogo(e.target.checked);
    if (e.target.checked) {
      setLogoFile(null);
    }
  };

  const handleConfirm = () => {
    onConfirm(noLogo ? null : logoFile);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg text-center p-8 relative" onClick={e => e.stopPropagation()}>
        <button onClick={onCancel} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition-colors">
            <CloseIcon className="h-6 w-6" />
        </button>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Confirmar Empresa</h2>
        <p className="text-gray-600 mb-6">
            A IA encontrou os dados abaixo. Estão corretos? Envie seu logo (se tiver) para prosseguir com a análise.
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-left mb-6 space-y-4">
            {validationData?.logoUrl && !logoFile && (
                <div className="flex justify-center mb-4">
                    <img src={validationData.logoUrl} alt="Logotipo da empresa" className="max-h-20 bg-white p-2 rounded-md shadow"/>
                </div>
            )}
            <div>
                <p className="text-lg font-semibold text-purple-600">{validationData?.companyName || 'Carregando...'}</p>
                <p className="text-gray-700 mt-1">{validationData?.description || 'Buscando detalhes...'}</p>
            </div>
            {validationData?.address && (
                 <div>
                    <p className="text-sm font-semibold text-gray-500">Endereço:</p>
                    <p className="text-gray-700">{validationData.address}</p>
                </div>
            )}
            {validationData?.websiteUrl && (
                <div>
                    <p className="text-sm font-semibold text-gray-500">Website:</p>
                    <a href={validationData.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline break-all">{validationData.websiteUrl}</a>
                </div>
            )}
            {validationData?.reviewsSummary && (
                 <div>
                    <p className="text-sm font-semibold text-gray-500">Avaliações:</p>
                    <p className="text-gray-700 whitespace-pre-wrap text-sm italic border-l-2 border-purple-200 pl-2">"{validationData.reviewsSummary}"</p>
                </div>
            )}
            {validationData?.socialMediaLinks && validationData.socialMediaLinks.length > 0 && (
                <div>
                    <p className="text-sm font-semibold text-gray-500">Redes Sociais:</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {validationData.socialMediaLinks.map(link => (
                            <a key={link.platform} href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm bg-purple-100 text-purple-700 px-2 py-1 rounded-full hover:bg-purple-200 transition-colors">{link.platform}</a>
                        ))}
                    </div>
                </div>
            )}
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-left mb-8 space-y-4">
            <h3 className="font-semibold text-gray-800">Você já tem um logotipo?</h3>
            <FileUploader onFileSelect={handleFileSelect} uploadedFileName={logoFile?.name} disabled={noLogo} />
            <div className="flex items-center">
                <input 
                    type="checkbox" 
                    id="no-logo" 
                    checked={noLogo} 
                    onChange={handleNoLogoChange}
                    className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="no-logo" className="ml-2 block text-sm text-gray-700">
                    Não tenho um logotipo, a IA pode criar um.
                </label>
            </div>
        </div>
        
        <div className="flex justify-center gap-4">
            <button
                onClick={onReject}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-6 rounded-lg shadow-sm transition-all duration-300"
            >
                Não, buscar outra
            </button>
            <button
                onClick={handleConfirm}
                className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105"
            >
                Sim, Gerar Marketingboard
            </button>
        </div>
      </div>
    </div>
  );
};