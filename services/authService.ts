import { supabase } from '../supabaseClient';
import type { User } from '../types'; // Manter o tipo User pode ser útil para o app

export const register = async (email: string, password: string) => {
  if (!email || !password) {
    throw new Error('E-mail e senha são obrigatórios.');
  }
  if (password.length < 6) {
    throw new Error('A senha deve ter pelo menos 6 caracteres.');
  }

  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
  });

  if (error) {
    if (error.message.includes('User already registered')) {
        throw new Error('Este e-mail já está cadastrado. Tente fazer login.');
    }
    throw new Error(error.message);
  }

  if (!data.user) {
      throw new Error('O registro falhou. Nenhum usuário foi retornado.');
  }

  return data.user;
};

export const login = async (email: string, password: string) => {
  if (!email || !password) {
    throw new Error('E-mail e senha são obrigatórios.');
  }
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (error) {
     if (error.message.includes('Invalid login credentials')) {
        throw new Error('E-mail ou senha inválidos.');
     }
    throw new Error(error.message);
  }
  
   if (!data.user) {
      throw new Error('O login falhou. Nenhum usuário foi retornado.');
  }

  return data.user;
};

export const loginWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin,
        },
    });

    if (error) {
        throw new Error(`Falha no login com Google: ${error.message}`);
    }

    return data;
};

export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        throw new Error(`Falha ao sair: ${error.message}`);
    }
};

export const getCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user ?? null;
};

export const onAuthStateChange = (callback: (event: string, session: import('@supabase/supabase-js').Session | null) => void) => {
    return supabase.auth.onAuthStateChange(callback);
}