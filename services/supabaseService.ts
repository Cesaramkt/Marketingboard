import { supabase } from '../supabaseClient';
import type { BrandboardData, ValidationData, SavedProject } from '../types';

interface NewMarketingboard {
  company_name: string;
  brandboard_data: BrandboardData;
  validation_data: ValidationData;
  generated_logo: string | null;
  photography_images: string[];
}

export const saveMarketingboard = async (projectData: NewMarketingboard): Promise<SavedProject> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Usuário não autenticado.');
  }

  const { data, error } = await supabase
    .from('marketingboards')
    .insert([{ ...projectData, user_id: user.id }])
    .select()
    .single();

  if (error) {
    console.error('Supabase error:', error);
    throw new Error(`Falha ao salvar o projeto: ${error.message}`);
  }

  return data as SavedProject;
};

export const getMarketingboards = async (): Promise<SavedProject[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return [];
    }

    const { data, error } = await supabase
        .from('marketingboards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Falha ao buscar projetos: ${error.message}`);
    }

    return data as SavedProject[];
};
