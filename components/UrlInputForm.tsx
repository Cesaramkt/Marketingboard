import React, { useState } from 'react';

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
    return <span>Analisar Empresa</span>;
  };

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
          <h2 className="text-3xl font-bold text-center text-slate-100 mb-2 font-['Playfair_Display',_serif]">Informações da Empresa</h2>
          <p className="text-center text-slate-400 mb-8">Preencha os dados para a IA analisar e criar seu marketingboard. Se tiver um site, a análise será mais precisa.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Nome da Empresa *"
              disabled={isLoading}
              className="w-full bg-slate-700 text-slate-100 placeholder-slate-400 px-4 py-3 rounded-lg border border-slate-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-200 disabled:opacity-50"
              required
            />
            <input
              name="address"
              type="text"
              value={formData.address}
              onChange={handleChange}
              placeholder="Endereço *"
              disabled={isLoading}
              className="w-full bg-slate-700 text-slate-100 placeholder-slate-400 px-4 py-3 rounded-lg border border-slate-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-200 disabled:opacity-50"
              required
            />
            <input
              name="city"
              type="text"
              value={formData.city}
              onChange={handleChange}
              placeholder="Cidade *"
              disabled={isLoading}
              className="w-full bg-slate-700 text-slate-100 placeholder-slate-400 px-4 py-3 rounded-lg border border-slate-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-200 disabled:opacity-50"
              required
            />
            <input
              name="site"
              type="text"
              value={formData.site}
              onChange={handleChange}
              placeholder="Site (opcional, ex: www.empresa.com.br)"
              disabled={isLoading}
              className="w-full bg-slate-700 text-slate-100 placeholder-slate-400 px-4 py-3 rounded-lg border border-slate-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-200 disabled:opacity-50"
            />
            <input
              name="instagram"
              type="text"
              value={formData.instagram}
              onChange={handleChange}
              placeholder="Instagram (opcional, ex: @perfil ou URL)"
              disabled={isLoading}
              className="w-full bg-slate-700 text-slate-100 placeholder-slate-400 px-4 py-3 rounded-lg border border-slate-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-200 disabled:opacity-50"
            />
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitDisabled}
                className="w-full bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center space-x-2"
              >
                {renderSubmitButtonContent()}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};