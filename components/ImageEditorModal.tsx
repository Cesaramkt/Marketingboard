import React, { useState, useCallback } from 'react';
import { editImage } from '../services/geminiService';
import { FileUploader } from './FileUploader';

interface ImageEditorModalProps {
  isVisible: boolean;
  onClose: () => void;
}

const CloseIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ isVisible, onClose }) => {
  const [originalImage, setOriginalImage] = useState<{ base64: string; mimeType: string; name: string } | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const base64 = (e.target?.result as string).split(',')[1];
        setOriginalImage({ base64, mimeType: file.type, name: file.name });
        setEditedImage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleEdit = useCallback(async () => {
    if (!originalImage || !prompt) {
      setError('Por favor, envie uma imagem e digite um comando.');
      return;
    }
    setIsEditing(true);
    setError(null);
    setEditedImage(null);

    try {
      const resultBase64 = await editImage(originalImage.base64, originalImage.mimeType, prompt);
      setEditedImage(`data:${originalImage.mimeType};base64,${resultBase64}`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Falha ao editar a imagem.');
    } finally {
      setIsEditing(false);
    }
  }, [originalImage, prompt]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col relative" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Editor de Imagem com IA</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition-colors">
             <CloseIcon className="h-6 w-6" />
          </button>
        </header>
        
        <div className="p-6 flex-grow overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col space-y-4">
              <FileUploader onFileSelect={handleFileSelect} uploadedFileName={originalImage?.name}/>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ex: 'Adicione um filtro retrô', 'Deixe o céu roxo', 'Remova a pessoa no fundo'"
                rows={3}
                className="w-full bg-gray-100 text-gray-800 placeholder-gray-400 p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 transition-colors"
                disabled={!originalImage || isEditing}
              />
              <button onClick={handleEdit} disabled={!originalImage || !prompt || isEditing} className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-300 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed flex items-center justify-center">
                {isEditing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Editando...</span>
                  </>
                ) : (
                  <span>Aplicar Edição</span>
                )}
              </button>
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </div>
            
            <div className="bg-gray-100 rounded-lg p-4 border border-gray-200 flex justify-center items-center min-h-[300px]">
              {editedImage ? (
                <img src={editedImage} alt="Edited" className="max-w-full max-h-full object-contain rounded-md" />
              ) : originalImage ? (
                <img src={`data:${originalImage.mimeType};base64,${originalImage.base64}`} alt="Original" className="max-w-full max-h-full object-contain rounded-md" />
              ) : (
                <p className="text-gray-500">Sua imagem editada aparecerá aqui</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};