import React, { useState, useEffect } from 'react';
import type { ValidationData } from '../types';
import { FileUploader } from './FileUploader';
import { enhanceLogo } from '../services/geminiService';

interface ValidationModalProps {
  isVisible: boolean;
  onConfirm: (updatedData: ValidationData, logoFile: File | null) => void;
  onReject: () => void;
  onCancel: () => void;
  validationData: ValidationData | null;
}

const CloseIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const EditIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
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

  // Editable Fields State
  const [editedDescription, setEditedDescription] = useState('');
  const [editedInstagramHandle, setEditedInstagramHandle] = useState('');
  const [editedFollowers, setEditedFollowers] = useState('');
  const [editedBio, setEditedBio] = useState('');

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

  useEffect(() => {
    if (isVisible && validationData) {
      // Handle empty or whitespace-only strings from the API
      const url = validationData.logoUrl;
      setApiLogoUrl(url && url.trim() ? url : null);

      // Initialize editable fields
      setEditedDescription(validationData.description || '');
      setEditedInstagramHandle(validationData.instagramStats?.handle || '');
      setEditedFollowers(validationData.instagramStats?.followers || '');
      setEditedBio(validationData.instagramStats?.bio || '');
    } else {
      // Reset state when modal is closed
      setLogoFile(null);
      setLogoPreviewUrl(null);
      setNoLogo(false);
      setApiLogoUrl(null);
      setIsEnhancing(false);
      setEditedDescription('');
      setEditedInstagramHandle('');
      setEditedFollowers('');
      setEditedBio('');
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
      if (!validationData) return;

      // Construct updated data object
      const updatedData: ValidationData = {
          ...validationData,
          description: editedDescription,
          instagramStats: {
              ...validationData.instagramStats,
              handle: editedInstagramHandle,
              followers: editedFollowers,
              bio: editedBio,
              posts: validationData.instagramStats?.posts || '',
              profileUrl: validationData.instagramStats?.profileUrl || ''
          }
      };

      onConfirm(updatedData, noLogo ? null : logoFile);
  };

  if (!isVisible) return null;

  const displayUrl = logoPreviewUrl || apiLogoUrl;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl text-center p-6 md:p-8 relative border border-gray-200 dark:border-slate-700 my-auto" onClick={e => e.stopPropagation()}>
        <button onClick={onCancel} className="absolute top-4 right-4 text-gray-500 dark:text-slate-500 hover:text-gray-800 dark:hover:text-slate-200 transition-colors">
            <CloseIcon className="h-6 w-6" />
        </button>
        
        <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2 font-['Playfair_Display',_serif]">Confirmar Dados</h2>
        <p className="text-gray-600 dark:text-slate-400 mb-6 text-sm">
            A IA coletou estas informações. <strong>Edite qualquer campo incorreto</strong> para garantir um resultado perfeito.
        </p>

        <div className="grid md:grid-cols-2 gap-6 text-left">
            {/* Left Column: Core Info */}
            <div className="space-y-4">
                 <div className="bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-4">
                    <p className="text-xs font-bold uppercase text-gray-400 mb-1">Empresa</p>
                    <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{validationData?.companyName || 'Carregando...'}</p>
                    {validationData?.websiteUrl && (
                        <a href={validationData.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:underline block truncate">{validationData.websiteUrl}</a>
                    )}
                 </div>

                 <div className="bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-bold uppercase text-gray-400">Descrição do Negócio</label>
                        <EditIcon className="w-3 h-3 text-gray-400" />
                    </div>
                    <textarea 
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded p-2 text-sm text-gray-700 dark:text-slate-300 focus:ring-2 focus:ring-purple-500 outline-none resize-none h-24"
                        placeholder="Descreva o que a empresa faz..."
                    />
                 </div>

                 <div className="bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-4">
                     <p className="text-xs font-bold uppercase text-gray-400 mb-2">Logotipo</p>
                     {displayUrl && !noLogo && (
                        <div className="flex justify-center mb-4 relative">
                            <img 
                                src={displayUrl} 
                                alt="Logotipo da empresa" 
                                className={`h-20 object-contain bg-white p-2 rounded-md shadow transition-opacity duration-500 ${isEnhancing ? 'opacity-50' : 'opacity-100'}`}
                                onError={(e) => {
                                if (apiLogoUrl && e.currentTarget.src === apiLogoUrl) {
                                    setApiLogoUrl(null);
                                }
                                }}
                            />
                            {isEnhancing && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center">
                                        <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        IA...
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="mb-2">
                         <FileUploader onFileSelect={handleFileSelect} uploadedFileName={logoFile?.name} disabled={noLogo || isEnhancing} />
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
                        <label htmlFor="no-logo" className="ml-2 block text-xs text-gray-700 dark:text-slate-300">
                            Não tenho logo (criar um novo).
                        </label>
                    </div>
                 </div>
            </div>

            {/* Right Column: Instagram Stats (Editable) */}
            <div className="space-y-4">
                <div className="bg-gradient-to-r from-pink-500/5 to-purple-500/5 p-4 rounded-lg border border-purple-100 dark:border-purple-900/50 h-full flex flex-col">
                    <div className="flex items-center gap-2 mb-4 border-b border-purple-100 dark:border-purple-900/50 pb-2">
                        <svg className="h-5 w-5 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                        <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">Dados do Instagram (Essencial)</p>
                    </div>
                    
                    <div className="space-y-4 flex-grow">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Handle (Usuário)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-gray-400">@</span>
                                <input 
                                    type="text"
                                    value={editedInstagramHandle.replace('@', '')}
                                    onChange={(e) => setEditedInstagramHandle(e.target.value)}
                                    className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                                    placeholder="ex: nike"
                                />
                            </div>
                        </div>

                        <div>
                             <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Número de Seguidores</label>
                             <input 
                                type="text"
                                value={editedFollowers}
                                onChange={(e) => setEditedFollowers(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                                placeholder="ex: 10.5k ou 1 milhão"
                            />
                            <p className="text-[10px] text-gray-400 mt-1">A IA usa isso para definir o "tamanho" da marca.</p>
                        </div>

                         <div className="flex-grow">
                             <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Bio do Perfil (Copie e cole)</label>
                             <textarea 
                                value={editedBio}
                                onChange={(e) => setEditedBio(e.target.value)}
                                className="w-full h-32 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded focus:ring-2 focus:ring-purple-500 outline-none text-sm resize-none"
                                placeholder="Cole a bio do Instagram aqui. Isso ajuda muito a entender o tom de voz da marca."
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div className="flex justify-center gap-4 mt-8">
            <button
                onClick={onReject}
                disabled={isEnhancing}
                className="bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 text-gray-800 dark:text-slate-100 font-semibold py-2 px-6 rounded-lg shadow-sm transition-all duration-300 disabled:opacity-50 text-sm"
            >
                Cancelar
            </button>
            <button
                onClick={handleConfirm}
                disabled={isEnhancing}
                className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-bold py-2 px-8 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:scale-100 text-sm"
            >
                {isEnhancing ? 'Processando...' : 'Confirmar Dados e Gerar'}
            </button>
        </div>
      </div>
    </div>
  );
};