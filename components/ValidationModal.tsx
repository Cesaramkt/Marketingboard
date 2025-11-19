import React, { useState, useEffect, useRef } from 'react';
import type { ValidationData } from '../types';
import { FileUploader } from './FileUploader';
import { enhanceLogo } from '../services/geminiService';

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

const CameraIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

// Helper to convert Base64 to File
const base64ToFile = (base64Data: string, filename: string, mimeType: string): File => {
    const byteString = atob(base64Data);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeType });
    return new File([blob], filename, { type: mimeType });
};

export const ValidationModal: React.FC<ValidationModalProps> = ({ 
    isVisible, 
    onConfirm, 
    onCancel, 
    onReject,
    validationData, 
}) => {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [noLogo, setNoLogo] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [apiLogoUrl, setApiLogoUrl] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processImage = async (file: File) => {
    setLogoFile(file);
    setNoLogo(false);
    setIsEnhancing(true);

    // Show initial preview while enhancing
    const reader = new FileReader();
    reader.onloadend = () => {
        setLogoPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Enhance with AI
    try {
        const readerForAI = new FileReader();
        readerForAI.onloadend = async () => {
             const base64 = (readerForAI.result as string).split(',')[1];
             try {
                 const enhancedBase64 = await enhanceLogo(base64, file.type);
                 const enhancedFile = base64ToFile(enhancedBase64, `enhanced_${file.name}`, file.type);
                 
                 setLogoFile(enhancedFile);
                 setLogoPreviewUrl(`data:${file.type};base64,${enhancedBase64}`);
             } catch (error) {
                 console.error("Failed to enhance logo:", error);
                 // Fallback to original is already set
             } finally {
                 setIsEnhancing(false);
             }
        };
        readerForAI.readAsDataURL(file);
    } catch (e) {
        console.error(e);
        setIsEnhancing(false);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
        alert('Por favor, envie apenas arquivos de imagem.');
        return;
    }
    processImage(file);
  };
  
  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          processImage(file);
      }
  };

  useEffect(() => {
    if (isVisible) {
      // Handle empty or whitespace-only strings from the API, treating them as null
      const url = validationData?.logoUrl;
      setApiLogoUrl(url && url.trim() ? url : null);
    } else {
      // Reset state when modal is closed for cleanliness
      setLogoFile(null);
      setLogoPreviewUrl(null);
      setNoLogo(false);
      setApiLogoUrl(null);
      setIsEnhancing(false);
    }
  }, [isVisible, validationData]);


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
      setLogoPreviewUrl(null);
      setIsEnhancing(false);
    }
  };

  const handleConfirm = () => {
    onConfirm(noLogo ? null : logoFile);
  };

  if (!isVisible) return null;

  const displayUrl = logoPreviewUrl || apiLogoUrl;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg text-center p-8 relative border border-gray-200 dark:border-slate-700 my-auto" onClick={e => e.stopPropagation()}>
        <button onClick={onCancel} className="absolute top-4 right-4 text-gray-500 dark:text-slate-500 hover:text-gray-800 dark:hover:text-slate-200 transition-colors">
            <CloseIcon className="h-6 w-6" />
        </button>
        
        <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4 font-['Playfair_Display',_serif]">Confirmar Empresa</h2>
        <p className="text-gray-600 dark:text-slate-400 mb-6">
            A IA encontrou os dados abaixo. Estão corretos? Envie seu logo (se tiver) para prosseguir com a análise.
        </p>

        <div className="bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6 text-left mb-6 space-y-4">
            {displayUrl && !noLogo && (
                <div className="flex justify-center mb-4 relative">
                    <img 
                        src={displayUrl} 
                        alt="Logotipo da empresa" 
                        className={`max-h-32 bg-white p-2 rounded-md shadow transition-opacity duration-500 ${isEnhancing ? 'opacity-50' : 'opacity-100'}`}
                        onError={(e) => {
                          // Only hide the image if the source that failed is the one from the API.
                          if (apiLogoUrl && e.currentTarget.src === apiLogoUrl) {
                              setApiLogoUrl(null);
                          }
                        }}
                    />
                     {isEnhancing && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-black/70 text-white px-4 py-2 rounded-full flex items-center text-sm font-medium shadow-lg backdrop-blur-sm">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Otimizando com IA...
                            </div>
                        </div>
                    )}
                </div>
            )}
            <div>
                <p className="text-lg font-semibold text-purple-600 dark:text-purple-400">{validationData?.companyName || 'Carregando...'}</p>
                <p className="text-gray-600 dark:text-slate-300 mt-1">{validationData?.description || 'Buscando detalhes...'}</p>
            </div>
            {validationData?.address && (
                 <div>
                    <p className="text-sm font-semibold text-gray-500 dark:text-slate-500">Endereço:</p>
                    <p className="text-gray-700 dark:text-slate-300">{validationData.address}</p>
                </div>
            )}
            {validationData?.websiteUrl && (
                <div>
                    <p className="text-sm font-semibold text-gray-500 dark:text-slate-500">Website:</p>
                    <a href={validationData.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-purple-600 dark:text-purple-400 hover:underline break-all">{validationData.websiteUrl}</a>
                </div>
            )}
            {validationData?.reviewsSummary && (
                 <div>
                    <p className="text-sm font-semibold text-gray-500 dark:text-slate-500">Avaliações:</p>
                    <p className="text-gray-600 dark:text-slate-400 whitespace-pre-wrap text-sm italic border-l-2 border-purple-500/30 pl-2">"{validationData.reviewsSummary}"</p>
                </div>
            )}
            {validationData?.socialMediaLinks && validationData.socialMediaLinks.length > 0 && (
                <div>
                    <p className="text-sm font-semibold text-gray-500 dark:text-slate-500">Redes Sociais:</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {validationData.socialMediaLinks.map(link => (
                            <a key={link.platform} href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full hover:bg-purple-100 dark:hover:bg-purple-500/30 transition-colors">{link.platform}</a>
                        ))}
                    </div>
                </div>
            )}
        </div>

        <div className="bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6 text-left mb-8 space-y-4">
            <h3 className="font-semibold text-gray-800 dark:text-slate-200">Você já tem um logotipo?</h3>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div className="sm:col-span-3">
                    <FileUploader onFileSelect={handleFileSelect} uploadedFileName={logoFile?.name} disabled={noLogo || isEnhancing} />
                </div>
                
                {/* Botão de Câmera Mobile */}
                <div className="sm:col-span-1">
                    <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        ref={cameraInputRef} 
                        onChange={handleCameraCapture} 
                        className="hidden" 
                        disabled={noLogo || isEnhancing}
                    />
                    <button 
                        onClick={() => cameraInputRef.current?.click()}
                        disabled={noLogo || isEnhancing}
                        className="w-full h-full min-h-[60px] flex flex-col items-center justify-center bg-violet-100 dark:bg-violet-900/30 hover:bg-violet-200 dark:hover:bg-violet-900/50 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Tirar foto do logo"
                    >
                        <CameraIcon className="h-6 w-6 mb-1" />
                        <span className="text-xs font-bold">Câmera</span>
                    </button>
                </div>
            </div>

            <div className="flex items-center">
                <input 
                    type="checkbox" 
                    id="no-logo" 
                    checked={noLogo} 
                    onChange={handleNoLogoChange}
                    disabled={isEnhancing}
                    className="h-4 w-4 text-purple-600 bg-gray-100 dark:bg-slate-600 border-gray-300 dark:border-slate-500 rounded focus:ring-purple-500"
                />
                <label htmlFor="no-logo" className="ml-2 block text-sm text-gray-700 dark:text-slate-300">
                    Não tenho um logotipo, a IA pode criar um.
                </label>
            </div>
        </div>
        
        <div className="flex justify-center gap-4">
            <button
                onClick={onReject}
                disabled={isEnhancing}
                className="bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 text-gray-800 dark:text-slate-100 font-semibold py-2 px-6 rounded-lg shadow-sm transition-all duration-300 disabled:opacity-50"
            >
                Não, buscar outra
            </button>
            <button
                onClick={handleConfirm}
                disabled={isEnhancing}
                className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:scale-100"
            >
                {isEnhancing ? 'Otimizando...' : 'Sim, Gerar Marketingboard'}
            </button>
        </div>
      </div>
    </div>
  );
};