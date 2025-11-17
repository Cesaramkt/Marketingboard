import React, { useState } from 'react';

interface IdeaFormProps {
  onSubmit: (name: string, description: string, segment: string, benchmarks: string) => void;
  isLoading: boolean;
  onBack: () => void;
}

export const IdeaForm: React.FC<IdeaFormProps> = ({ onSubmit, isLoading, onBack }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [segment, setSegment] = useState('');
    const [benchmarks, setBenchmarks] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(name, description, segment, benchmarks);
    };

    const renderSubmitButtonContent = () => {
        if (isLoading) {
            return (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Criando Conceito...</span>
                </>
            );
        }
        return <span>Gerar Conceito de Marca</span>;
    };

    const isSubmitDisabled = isLoading || !name.trim() || !description.trim() || !segment.trim();

    return (
        <div className="w-full">
            <div className="max-w-2xl mx-auto">
                 <button onClick={onBack} className="flex items-center text-sm text-slate-400 hover:text-slate-200 mb-4 group">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Voltar
                </button>
                <div className="bg-slate-800/50 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-700">
                    <h2 className="text-3xl font-bold text-center text-slate-100 mb-2 font-['Playfair_Display',_serif]">Vamos dar vida à sua ideia</h2>
                    <p className="text-center text-slate-400 mb-8">Preencha os campos abaixo para a IA criar um conceito de marca inicial para você.</p>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input 
                            type="text" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            placeholder="Nome da Ideia ou Marca *" 
                            className="w-full bg-slate-700 text-slate-100 placeholder-slate-400 px-4 py-3 rounded-lg border border-slate-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-200"
                            required 
                        />
                        <textarea 
                            value={description} 
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Descreva sua ideia em poucas frases *" 
                            rows={3}
                            className="w-full bg-slate-700 text-slate-100 placeholder-slate-400 px-4 py-3 rounded-lg border border-slate-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-200"
                            required 
                        />
                        <input 
                            type="text" 
                            value={segment} 
                            onChange={(e) => setSegment(e.target.value)} 
                            placeholder="Qual o segmento de mercado? (Ex: moda, tecnologia, alimentação) *" 
                            className="w-full bg-slate-700 text-slate-100 placeholder-slate-400 px-4 py-3 rounded-lg border border-slate-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-200"
                            required 
                        />
                         <textarea 
                            value={benchmarks} 
                            onChange={(e) => setBenchmarks(e.target.value)}
                            placeholder="Cite 1 a 3 concorrentes ou empresas que te inspiram (sites, se possível)" 
                            rows={2}
                            className="w-full bg-slate-700 text-slate-100 placeholder-slate-400 px-4 py-3 rounded-lg border border-slate-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-200"
                        />
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                            <button type="submit" disabled={isSubmitDisabled} className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center space-x-2">
                               {renderSubmitButtonContent()}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};