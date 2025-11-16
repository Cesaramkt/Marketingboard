import React, { useState } from 'react';
import { FileUploader } from './FileUploader';

interface ImageAnalysisFormProps {
  onSubmit: (imageFile: File, prompt: string) => void;
  isLoading: boolean;
  onBack: () => void;
}

export const ImageAnalysisForm: React.FC<ImageAnalysisFormProps> = ({ onSubmit, isLoading, onBack }) => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [prompt, setPrompt] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (imageFile && prompt) {
            onSubmit(imageFile, prompt);
        }
    };

    const renderSubmitButtonContent = () => {
        if (isLoading) {
            return (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Analisando...</span>
                </>
            );
        }
        return <span>Analisar Imagem</span>;
    };

    const isSubmitDisabled = isLoading || !imageFile || !prompt.trim();

    return (
        <div className="max-w-2xl mx-auto">
             <button onClick={onBack} className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 group">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Voltar
            </button>
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg">
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Analisar Imagem com IA</h2>
                <p className="text-center text-gray-600 mb-8">Envie uma imagem e diga à IA o que você quer analisar. Ótimo para pesquisa de produtos, locais e concorrentes.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <FileUploader onFileSelect={setImageFile} uploadedFileName={imageFile?.name} disabled={isLoading} />
                    <textarea 
                        value={prompt} 
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="O que você quer analisar nesta imagem? (Ex: 'Descreva o estilo deste produto', 'Identifique pontos fortes e fracos neste design', 'Que público compraria este item?')" 
                        rows={4}
                        className="w-full bg-gray-100 text-gray-800 placeholder-gray-400 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-200"
                        required 
                        disabled={isLoading}
                    />
                    <div className="pt-4">
                        <button type="submit" disabled={isSubmitDisabled} className="w-full bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center space-x-2">
                           {renderSubmitButtonContent()}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};