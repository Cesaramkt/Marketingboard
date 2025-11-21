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
  
  const isSubmitDisabled = isLoading || !formData.name.trim() || !formData.city.trim();

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
          <h2 className="text-5xl font-bold text-gray-900 dark:text-slate-100 tracking-tight font-['Playfair_Display',_serif]">Vamos Começar.</h2>
          <p className="mt-4 text-gray-600 dark:text-slate-400">
            Comece informando os dados da sua empresa para a IA realizar a análise.
          </p>
          <form onSubmit={handleSubmit} className="mt-12 space-y-8">
            <input
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Nome da Empresa *"
              disabled={isLoading}
              className="w-full bg-transparent text-lg text-gray-900 dark:text-slate-100 placeholder-gray-400 border-0 border-b-2 border-gray-300 dark:border-slate-700 py-2 focus:outline-none focus:ring-0 focus:border-purple-500 transition-colors duration-300 disabled:opacity-50"
              required
            />
            <input
              name="city"
              type="text"
              value={formData.city}
              onChange={handleChange}
              placeholder="Cidade *"
              disabled={isLoading}
              className="w-full bg-transparent text-lg text-gray-900 dark:text-slate-100 placeholder-gray-400 border-0 border-b-2 border-gray-300 dark:border-slate-700 py-2 focus:outline-none focus:ring-0 focus:border-purple-500 transition-colors duration-300 disabled:opacity-50"
              required
            />
             <input
              name="address"
              type="text"
              value={formData.address}
              onChange={handleChange}
              placeholder="Endereço (opcional)"
              disabled={isLoading}
              className="w-full bg-transparent text-lg text-gray-900 dark:text-slate-100 placeholder-gray-400 border-0 border-b-2 border-gray-300 dark:border-slate-700 py-2 focus:outline-none focus:ring-0 focus:border-purple-500 transition-colors duration-300 disabled:opacity-50"
            />
            <input
              name="site"
              type="text"
              value={formData.site}
              onChange={handleChange}
              placeholder="Site (opcional)"
              disabled={isLoading}
              className="w-full bg-transparent text-lg text-gray-900 dark:text-slate-100 placeholder-gray-400 border-0 border-b-2 border-gray-300 dark:border-slate-700 py-2 focus:outline-none focus:ring-0 focus:border-purple-500 transition-colors duration-300 disabled:opacity-50"
            />
            <input
              name="instagram"
              type="text"
              value={formData.instagram}
              onChange={handleChange}
              placeholder="Instagram (opcional)"
              disabled={isLoading}
              className="w-full bg-transparent text-lg text-gray-900 dark:text-slate-100 placeholder-gray-400 border-0 border-b-2 border-gray-300 dark:border-slate-700 py-2 focus:outline-none focus:ring-0 focus:border-purple-500 transition-colors duration-300 disabled:opacity-50"
            />
            <div className="pt-6">
              <button
                type="submit"
                disabled={isSubmitDisabled}
                className="bg-gray-900 dark:bg-white text-white dark:text-black font-semibold py-3 px-8 rounded-full shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center"
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
