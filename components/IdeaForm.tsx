import React, { useState } from 'react';
import { TestimonialPanel } from './TestimonialPanel';

interface IdeaFormData {
    name: string;
    description: string;
    segment: string;
    city: string;
    country: string;
    benchmarks: string;
    investment: string;
}

interface IdeaFormProps {
  onSubmit: (data: IdeaFormData) => void;
  isLoading: boolean;
  onBack: () => void;
}

export const IdeaForm: React.FC<IdeaFormProps> = ({ onSubmit, isLoading, onBack }) => {
    const [formData, setFormData] = useState<IdeaFormData>({
        name: '',
        description: '',
        segment: '',
        city: '',
        country: '',
        benchmarks: '',
        investment: 'Até R$5.000',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const isSubmitDisabled = isLoading || !formData.name.trim() || !formData.description.trim() || !formData.segment.trim();

    return (
        <div className="grid md:grid-cols-2 min-h-[calc(100vh-140px)]">
            {/* Left Column: Form */}
            <div className="flex flex-col justify-center p-8 sm:p-16 bg-white dark:bg-slate-900">
                <div className="w-full max-w-md mx-auto">
                    <button onClick={onBack} className="flex items-center text-sm text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 mb-8 group">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Voltar
                    </button>
                    <h2 className="text-5xl font-bold text-gray-900 dark:text-slate-100 tracking-tight font-['Playfair_Display',_serif]">Vamos dar vida à sua ideia.</h2>
                    <p className="mt-4 text-gray-600 dark:text-slate-400">Preencha os campos para a IA criar um conceito de marca inicial para você.</p>
                    <form onSubmit={handleSubmit} className="mt-12 space-y-8">
                        <input 
                            name="name"
                            type="text" 
                            value={formData.name} 
                            onChange={handleChange} 
                            placeholder="Nome da Ideia ou Marca *" 
                            className="w-full bg-transparent text-lg text-gray-900 dark:text-slate-100 placeholder-gray-400 border-0 border-b-2 border-gray-300 dark:border-slate-700 py-2 focus:outline-none focus:ring-0 focus:border-purple-500 transition-colors duration-300 disabled:opacity-50"
                            required 
                            disabled={isLoading}
                        />
                        <textarea 
                            name="description"
                            value={formData.description} 
                            onChange={handleChange}
                            placeholder="Descreva sua ideia em poucas frases *" 
                            rows={2}
                            className="w-full bg-transparent text-lg text-gray-900 dark:text-slate-100 placeholder-gray-400 border-0 border-b-2 border-gray-300 dark:border-slate-700 py-2 focus:outline-none focus:ring-0 focus:border-purple-500 transition-colors duration-300 disabled:opacity-50"
                            required 
                            disabled={isLoading}
                        />
                        <input 
                            name="segment"
                            type="text" 
                            value={formData.segment} 
                            onChange={handleChange} 
                            placeholder="Segmento de mercado? *" 
                            className="w-full bg-transparent text-lg text-gray-900 dark:text-slate-100 placeholder-gray-400 border-0 border-b-2 border-gray-300 dark:border-slate-700 py-2 focus:outline-none focus:ring-0 focus:border-purple-500 transition-colors duration-300 disabled:opacity-50"
                            required 
                            disabled={isLoading}
                        />
                         <div className="grid grid-cols-2 gap-4">
                            <input 
                                name="city"
                                type="text" 
                                value={formData.city} 
                                onChange={handleChange} 
                                placeholder="Cidade (opcional)" 
                                className="w-full bg-transparent text-lg text-gray-900 dark:text-slate-100 placeholder-gray-400 border-0 border-b-2 border-gray-300 dark:border-slate-700 py-2 focus:outline-none focus:ring-0 focus:border-purple-500 transition-colors duration-300 disabled:opacity-50"
                                disabled={isLoading}
                            />
                            <input 
                                name="country"
                                type="text" 
                                value={formData.country} 
                                onChange={handleChange} 
                                placeholder="País (opcional)" 
                                className="w-full bg-transparent text-lg text-gray-900 dark:text-slate-100 placeholder-gray-400 border-0 border-b-2 border-gray-300 dark:border-slate-700 py-2 focus:outline-none focus:ring-0 focus:border-purple-500 transition-colors duration-300 disabled:opacity-50"
                                disabled={isLoading}
                            />
                        </div>
                         <textarea 
                            name="benchmarks"
                            value={formData.benchmarks} 
                            onChange={handleChange}
                            placeholder="Concorrentes ou inspirações (opcional)" 
                            rows={2}
                            className="w-full bg-transparent text-lg text-gray-900 dark:text-slate-100 placeholder-gray-400 border-0 border-b-2 border-gray-300 dark:border-slate-700 py-2 focus:outline-none focus:ring-0 focus:border-purple-500 transition-colors duration-300 disabled:opacity-50"
                            disabled={isLoading}
                        />
                        <select
                            name="investment"
                            value={formData.investment}
                            onChange={handleChange}
                            disabled={isLoading}
                            className="w-full bg-transparent text-lg text-gray-900 dark:text-slate-100 border-0 border-b-2 border-gray-300 dark:border-slate-700 py-2 focus:outline-none focus:ring-0 focus:border-purple-500 transition-colors duration-300 disabled:opacity-50"
                            required
                        >
                            <option value="Até R$5.000">Investimento: Até R$5.000</option>
                            <option value="Entre R$5.000 e R$20.000">Investimento: Entre R$5.000 e R$20.000</option>
                            <option value="Entre R$20.000 e R$100.000">Investimento: Entre R$20.000 e R$100.000</option>
                            <option value="Acima de R$100.000">Investimento: Acima de R$100.000</option>
                        </select>
                        <div className="pt-6">
                            <button type="submit" disabled={isSubmitDisabled} className="bg-gray-900 dark:bg-white text-white dark:text-black font-semibold py-3 px-8 rounded-full shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center">
                                {isLoading ? 'Criando Conceito...' : 'Continuar'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            {/* Right Column: Testimonials */}
            <TestimonialPanel />
        </div>
    );
};
