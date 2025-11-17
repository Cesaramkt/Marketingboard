import React, { useState, useEffect } from 'react';
import { login, register, loginWithGoogle } from '../services/authService';

interface AuthModalProps {
  isVisible: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
}

const CloseIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const GoogleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" xmlnsXlink="http://www.w3.org/1999/xlink">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
        <path fill="none" d="M0 0h48v48H0z"></path>
    </svg>
);


export const AuthModal: React.FC<AuthModalProps> = ({ isVisible, onClose, onAuthSuccess }) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
      setIsLoading(true);
      setError(null);
      try {
          await loginWithGoogle();
          // onAuthStateChange vai lidar com o sucesso
      } catch (err) {
          if (err instanceof Error) {
              setError(err.message);
          } else {
              setError('Ocorreu um erro desconhecido durante o login com o Google.');
          }
           setIsLoading(false);
      }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'LOGIN') {
        await login(email, password);
      } else {
        await register(email, password);
      }
      onAuthSuccess();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocorreu um erro desconhecido.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const switchMode = () => {
    setMode(prev => prev === 'LOGIN' ? 'REGISTER' : 'LOGIN');
    setError(null);
    setEmail('');
    setPassword('');
  }

  const renderSubmitButtonContent = () => {
    const text = mode === 'LOGIN' ? 'Entrar' : 'Cadastrar e Avançar';
    if (isLoading) {
        return (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Aguarde...</span>
            </>
        );
    }
    return <span>{text}</span>;
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-8 relative border border-slate-700" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 transition-colors">
            <CloseIcon className="h-6 w-6" />
        </button>
        <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-100 mb-2 font-['Playfair_Display',_serif]">
                {mode === 'LOGIN' ? 'Acesse sua Conta' : 'Crie sua Conta'}
            </h2>
            <p className="text-slate-400 mb-6">
                {mode === 'LOGIN' ? 'Faça login para continuar com seu projeto.' : 'Crie uma conta para salvar seu progresso e começar.'}
            </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Seu melhor e-mail"
                required
                className="w-full bg-slate-700 text-slate-100 placeholder-slate-400 px-4 py-3 rounded-lg border border-slate-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-200"
            />
            <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
                required
                minLength={6}
                className="w-full bg-slate-700 text-slate-100 placeholder-slate-400 px-4 py-3 rounded-lg border border-slate-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-200"
            />
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <div className="pt-2">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center space-x-2"
                >
                    {renderSubmitButtonContent()}
                </button>
            </div>
        </form>

        <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-600" />
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="bg-slate-800 px-2 text-slate-400">ou</span>
            </div>
        </div>
        
        <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-100 font-semibold py-2.5 px-4 rounded-lg shadow-sm border border-slate-600 transition-all duration-300 flex items-center justify-center space-x-3 disabled:opacity-50"
        >
           <GoogleIcon className="h-5 w-5" />
           <span>Entrar com Google</span>
        </button>

        <div className="text-center mt-6">
            <button onClick={switchMode} className="text-sm text-purple-400 hover:text-purple-300 hover:underline">
                {mode === 'LOGIN' ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça login'}
            </button>
        </div>
      </div>
    </div>
  );
};