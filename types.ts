
export interface Source {
  uri: string;
  title: string;
}

export interface CompanyCandidate {
  id: string; // Para key do React
  companyName: string;
  address: string;
  websiteUrl: string;
  description: string;
  matchType: 'EXATO_NA_CIDADE' | 'NOME_CORRETO_OUTRA_CIDADE' | 'SUGESTAO';
}

export interface LogoAnalysis {
  logoDescription: string;
  colorPalette: {
    primary: Array<{ name: string; hex: string }>;
    secondary: Array<{ name: string; hex: string }>;
    neutral: Array<{ name: string; hex: string }>;
  };
}

export interface InstagramStats {
  handle: string;
  followers: string;
  following?: string;
  posts: string;
  bio: string;
  profileUrl: string;
  postTypes?: string; // Ex: "Fotos, Vídeos, Carrosséis"
  recentLikesAvg?: string; // Média de likes
  visualStyle?: string; // Descrição contextual
  highlights?: string;
  linkInBio?: string;
}

export interface ValidationData {
  companyName: string;
  description: string;
  address: string;
  logoUrl: string;
  websiteUrl?: string;
  reviewsSummary?: string;
  socialMediaLinks?: Array<{ platform: string; url: string; }>;
  instagramStats?: InstagramStats; // Novo campo específico
  companyAnalysis?: string; // Usado para Diagnóstico (Empresa Existente) e Briefing (Nova Ideia)
  companyAnalysisSources?: Source[];
  sources?: Source[];
  uploadedLogoAnalysis?: LogoAnalysis;
  generatedLogo?: string;
  locationWarning?: string;
  initialInvestment?: string; // Campo para o fluxo de "Nova Ideia"
  businessBriefing?: { // Específico para o fluxo de "Nova Ideia"
    productServiceIdea: string;
    distributionStrategy: string;
    impactAndPotential: string;
  };
}

export interface CompanyValue {
  name: string;
  description: string;
  attributes?: string[];
}

export interface ProductStrategy {
  category: string;
  description: string;
  portfolioStructure: string;
}

export interface BrandboardData {
  part1: {
    productStrategy: ProductStrategy;
    purpose: string;
    mission: string;
    vision: string;
    values: CompanyValue[];
    archetypes: {
      primary: string;
      secondary?: string;
      imagePrompt?: string;
    };
    audienceAndPositioning: {
      targetAudience: string;
      competitors: Array<{ name: string; link: string; }>;
      differentiators: string[];
      positioningStatement: string;
    };
  };
  part2: {
    voicePersonality: string;
    toneOfVoiceApplication: {
      sales: string;
      support: string;
      content: string;
    };
    practicalGuidelines: {
      weAre: Array<{ trait: string; description: string; }>;
      weAreNot: Array<{ trait: string; description: string; }>;
    };
    slogan: string;
    keyMessages: {
      product: string;
      benefit: string;
      brand: string;
    };
    contentPillars: Array<{ name: string; description: string; }>;
  };
  part3: {
    logo: {
      description: string;
      prompt: string | null;
    };
    colorPalette: {
      primary: Array<{ name: string; hex: string }>;
      secondary: Array<{ name: string; hex: string }>;
    };
    typography: {
      primary: { font: string; usage: string };
      secondary: { font: string; usage: string };
      hierarchy: { h1: string; h2: string; body: string };
    };
    photographyStyle: {
      description: string;
      imagePrompts: string[];
    };
  };
  part4: {
    personas: Array<{
      name: string;
      story: string;
      pains: string;
      goals: string;
      informationSources: string;
      howWeHelp: string;
      imagePrompt?: string;
    }>;
    customerJourney: {
      discovery: { description: string; goal: string };
      consideration: { description: string; goal: string };
      decision: { description: string; goal: string };
      loyalty: { description: string; goal: string };
    };
    channelMatrix: Array<{
      channel: string;
      mainPurpose: string;
      audience: string;
      successMetrics: string;
    }>;
  };
}

export interface User {
  id: string;
  email?: string;
}

export interface SavedProject {
  id: string;
  created_at: string;
  user_id: string;
  company_name: string;
  brandboard_data: BrandboardData;
  validation_data: ValidationData;
  generated_logo: string | null;
  photography_images: string[];
}
