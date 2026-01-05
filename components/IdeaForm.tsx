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
            <div className="flex flex-col justify-center p-8 sm:p-16 bg-white dark:bg-brand-dark">
                <div className="w-full max-w-md mx-auto">
                    <button onClick={onBack} className="flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-8 group transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Voltar
                    </button>
                    <h2 className="text-5xl font-bold text-gray-900 dark:text-white tracking-tight font-display mb-4">Sua ideia. Real.</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-12">Preencha os campos para a IA estruturar o conceito do seu negócio.</p>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <input 
                            name="name"
                            type="text" 
                            value={formData.name} 
                            onChange={handleChange} 
                            placeholder="Nome da Ideia ou Marca *" 
                            className="w-full bg-gray-50 dark:bg-brand-surface text-gray-900 dark:text-white placeholder-gray-400 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all duration-300 disabled:opacity-50"
                            required 
                            disabled={isLoading}
                        />
                        <textarea 
                            name="description"
                            value={formData.description} 
                            onChange={handleChange}
                            placeholder="Descreva sua ideia em poucas frases *" 
                            rows={3}
                            className="w-full bg-gray-50 dark:bg-brand-surface text-gray-900 dark:text-white placeholder-gray-400 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all duration-300 disabled:opacity-50"
                            required 
                            disabled={isLoading}
                        />
                        <input 
                            name="segment"
                            type="text" 
                            value={formData.segment} 
                            onChange={handleChange} 
                            placeholder="Segmento de mercado? *" 
                            className="w-full bg-gray-50 dark:bg-brand-surface text-gray-900 dark:text-white placeholder-gray-400 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all duration-300 disabled:opacity-50"
                            required 
                            disabled={isLoading}
                        />
                         <div className="grid grid-cols-2 gap-4">
                            <input 
                                name="city"
                                type="text" 
                                value={formData.city} 
                                onChange={handleChange} 
                                placeholder="Cidade" 
                                className="w-full bg-gray-50 dark:bg-brand-surface text-gray-900 dark:text-white placeholder-gray-400 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all duration-300 disabled:opacity-50"
                                disabled={isLoading}
                            />
                            <input 
                                name="country"
                                type="text" 
                                value={formData.country} 
                                onChange={handleChange} 
                                placeholder="País" 
                                className="w-full bg-gray-50 dark:bg-brand-surface text-gray-900 dark:text-white placeholder-gray-400 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all duration-300 disabled:opacity-50"
                                disabled={isLoading}
                            />
                        </div>
                         <textarea 
                            name="benchmarks"
                            value={formData.benchmarks} 
                            onChange={handleChange}
                            placeholder="Concorrentes ou inspirações (opcional)" 
                            rows={2}
                            className="w-full bg-gray-50 dark:bg-brand-surface text-gray-900 dark:text-white placeholder-gray-400 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all duration-300 disabled:opacity-50"
                            disabled={isLoading}
                        />
                        <div className="relative">
                            <select
                                name="investment"
                                value={formData.investment}
                                onChange={handleChange}
                                disabled={isLoading}
                                className="w-full bg-gray-50 dark:bg-brand-surface text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all duration-300 disabled:opacity-50"
                                required
                            >
                                <option value="Até R$5.000">Investimento: Até R$5.000</option>
                                <option value="Entre R$5.000 e R$20.000">Investimento: Entre R$5.000 e R$20.000</option>
                                <option value="Entre R$20.000 e R$100.000">Investimento: Entre R$20.000 e R$100.000</option>
                                <option value="Acima de R$100.000">Investimento: Acima de R$100.000</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>

                        <div className="pt-6">
                            <button type="submit" disabled={isSubmitDisabled} className="w-full bg-brand-primary hover:bg-brand-hover text-black font-bold py-4 px-8 rounded-pill shadow-lg hover:shadow-glow transition-all duration-300 ease-in-out transform hover:scale-[1.02] disabled:bg-gray-300 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none flex items-center justify-center">
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