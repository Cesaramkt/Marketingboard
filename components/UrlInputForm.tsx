import React, { useState } from 'react';
import { TestimonialPanel } from './TestimonialPanel';

interface FormData {
  name: string;
  address: string;
  city: string;
  site: string;
  instagram: string;
}

interface UrlInputFormProps {
  onSubmit: (data: FormData) => void;
  isLoading: boolean;
  onBack: () => void;
}

export const UrlInputForm: React.FC<UrlInputFormProps> = ({ onSubmit, isLoading, onBack }) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    address: '',
    city: '',
    site: '',
    instagram: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };
  
  const isSubmitDisabled = isLoading || !formData.name.trim() || !formData.address.trim() || !formData.city.trim();

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
          <h2 className="text-5xl font-bold text-gray-900 dark:text-white tracking-tight font-display mb-4">Vamos Começar.</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-12">
            Informe os dados da sua empresa para a IA realizar a análise.
          </p>
          <form onSubmit={handleSubmit} className="space-y-6">
            <input
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Nome da Empresa *"
              disabled={isLoading}
              className="w-full bg-gray-50 dark:bg-brand-surface text-gray-900 dark:text-white placeholder-gray-400 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all duration-300 disabled:opacity-50"
              required
            />
             <input
              name="address"
              type="text"
              value={formData.address}
              onChange={handleChange}
              placeholder="Endereço *"
              disabled={isLoading}
              className="w-full bg-gray-50 dark:bg-brand-surface text-gray-900 dark:text-white placeholder-gray-400 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all duration-300 disabled:opacity-50"
              required
            />
            <input
              name="city"
              type="text"
              value={formData.city}
              onChange={handleChange}
              placeholder="Cidade *"
              disabled={isLoading}
              className="w-full bg-gray-50 dark:bg-brand-surface text-gray-900 dark:text-white placeholder-gray-400 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all duration-300 disabled:opacity-50"
              required
            />
            <input
              name="site"
              type="text"
              value={formData.site}
              onChange={handleChange}
              placeholder="Site (opcional)"
              disabled={isLoading}
              className="w-full bg-gray-50 dark:bg-brand-surface text-gray-900 dark:text-white placeholder-gray-400 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all duration-300 disabled:opacity-50"
            />
            <input
              name="instagram"
              type="text"
              value={formData.instagram}
              onChange={handleChange}
              placeholder="Instagram (opcional)"
              disabled={isLoading}
              className="w-full bg-gray-50 dark:bg-brand-surface text-gray-900 dark:text-white placeholder-gray-400 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all duration-300 disabled:opacity-50"
            />
            <div className="pt-6">
              <button
                type="submit"
                disabled={isSubmitDisabled}
                className="w-full bg-brand-primary hover:bg-brand-hover text-black font-bold py-4 px-8 rounded-pill shadow-lg hover:shadow-glow transition-all duration-300 ease-in-out transform hover:scale-[1.02] disabled:bg-gray-300 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none flex items-center justify-center"
              >
                {isLoading ? 'Analisando...' : 'Continuar'}
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