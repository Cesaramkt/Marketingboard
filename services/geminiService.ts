import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import type { ValidationData, BrandboardData, Source, LogoAnalysis, CompanyCandidate } from '../types';
import { getInstagramData } from './instagramService';

const ai = new GoogleGenAI({apiKey: process.env.API_KEY!});

const parseJsonFromText = (text: string | undefined | null) => {
    if (!text) {
        throw new Error("O texto da resposta da IA está vazio ou indefinido.");
    }
    // First, try to find JSON inside markdown ```json ... ```
    const match = text.match(/```json\n([\s\S]*?)\n```/);
    if (match && match[1]) {
        try {
            // If found, parse just that part.
            return JSON.parse(match[1]);
        } catch(e) {
            console.error("Error parsing JSON from markdown block:", e);
            // If parsing fails, fall through to try parsing the whole text as a fallback.
        }
    }

    // Fallback: clean the whole text from potential markdown fences and try to parse.
    // This handles raw JSON, or truncated markdown.
    try {
        const cleanedText = text.replace(/^```json\n?/, '').replace(/```$/, '').trim();
        return JSON.parse(cleanedText);
    } catch(e) {
         console.error("Failed to parse JSON. Raw text received from API:", text);
         throw new Error(`A resposta da IA não estava em um formato JSON válido. O resultado pode ter sido truncado. Início: ${text.substring(0, 200)}...`);
    }
};

const extractSources = (response: GenerateContentResponse): Source[] => {
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    if (!groundingMetadata?.groundingChunks) {
        return [];
    }
    const sources: Source[] = [];
    for (const chunk of groundingMetadata.groundingChunks) {
        if (chunk.web) {
            sources.push({
                uri: chunk.web.uri || '#',
                title: chunk.web.title || 'Fonte da Web'
            });
        } else if (chunk.maps) {
            sources.push({
               uri: chunk.maps.uri || '#',
               title: chunk.maps.title || 'Ver no Google Maps'
           });
       }
    }
    // Deduplicate sources
    const uniqueSources = Array.from(new Map(sources.map(item => [item['uri'], item])).values());
    return uniqueSources;
};

const parseValidationData = (text: string, sources?: Source[]): ValidationData => {
    if (!text) return {
        companyName: '', description: '', address: '', logoUrl: ''
    } as ValidationData;

    const data: Partial<ValidationData> = {};

    const companyNameMatch = text.match(/^(?:-\s*)?Nome da Empresa:\s*(.*)$/im);
    if (companyNameMatch) {
        const name = companyNameMatch[1].trim();
        if (name.toUpperCase() === 'NÃO ENCONTRADO') {
            throw new Error("COMPANY_NOT_FOUND");
        }
        data.companyName = name;
    }
    
    const descriptionMatch = text.match(/^(?:-\s*)?Descrição:\s*(.*)$/im);
    if (descriptionMatch) data.description = descriptionMatch[1].trim();
    
    const addressMatch = text.match(/^(?:-\s*)?Endereço:\s*(.*)$/im);
    if (addressMatch) data.address = addressMatch[1].trim();

    const websiteMatch = text.match(/^(?:-\s*)?Website:\s*(.*)$/im);
    if (websiteMatch) data.websiteUrl = websiteMatch[1].trim();

    const logoUrlMatch = text.match(/^(?:-\s*)?Logo URL:\s*(.*)$/im);
    if (logoUrlMatch) data.logoUrl = logoUrlMatch[1].trim();

    const reviewsSummaryMatch = text.match(/^(?:-\s*)?Resumo das Avaliações:\s*([\s\S]*?)(?=^\s*(?:-\s*)?Redes Sociais:|Instagram Stats:|AVISO_LOCALIZACAO:|$)/im);
    if (reviewsSummaryMatch && reviewsSummaryMatch[1].trim()) data.reviewsSummary = reviewsSummaryMatch[1].trim();
    
    const socialMediaBlockMatch = text.match(/^(?:-\s*)?Redes Sociais:\s*([\s\S]*?)(?=^\s*(?:-\s*)?Instagram Stats:|AVISO_LOCALIZACAO:|$)/im);
    if (socialMediaBlockMatch && socialMediaBlockMatch[1].trim()) {
      const socialLines = socialMediaBlockMatch[1].trim().split('\n');
      const links = socialLines.map(line => {
        const match = line.match(/^\s*(?:-\s*)?(\w+):\s*(https?:\/\/\S+.*)$/i);
        if (match) {
          return { platform: match[1].trim(), url: match[2].trim() };
        }
        return null;
      }).filter((link): link is { platform: string, url: string } => link !== null);
      if (links.length > 0) {
        data.socialMediaLinks = links;
      }
    }

    // Parsing básico para Instagram Stats (Fallback caso a API direta falhe ou não seja chamada)
    const instagramBlockMatch = text.match(/^(?:-\s*)?Instagram Stats:\s*([\s\S]*?)(?=^\s*(?:-\s*)?AVISO_LOCALIZACAO:|$)/im);
    if (instagramBlockMatch && instagramBlockMatch[1].trim()) {
        const block = instagramBlockMatch[1];
        const handleMatch = block.match(/Handle:\s*(.*)/i);
        const followersMatch = block.match(/Seguidores:\s*(.*)/i);
        const postsMatch = block.match(/Posts:\s*(.*)/i);
        const bioMatch = block.match(/Bio:\s*(.*)/i);
        const urlMatch = block.match(/URL:\s*(.*)/i);

        if (handleMatch) {
            data.instagramStats = {
                handle: handleMatch[1].trim(),
                followers: followersMatch ? followersMatch[1].trim() : 'Não informado',
                posts: postsMatch ? postsMatch[1].trim() : 'Não informado',
                bio: bioMatch ? bioMatch[1].trim() : '',
                profileUrl: urlMatch ? urlMatch[1].trim() : ''
            };
        }
    }

    const locationWarningMatch = text.match(/^(?:-\s*)?AVISO_LOCALIZACAO:\s*(.*)$/im);
    if (locationWarningMatch) data.locationWarning = locationWarningMatch[1].trim();
    
    if (!data.companyName || !data.description) {
        console.error("Falha ao analisar os dados de validação. Texto bruto:", text);
        throw new Error("Não foi possível extrair informações da empresa. Tente fornecer mais detalhes.");
    }

    return {
        companyName: data.companyName,
        description: data.description,
        address: data.address === 'Não encontrado' ? '' : data.address || '',
        websiteUrl: data.websiteUrl === 'Não encontrado' ? '' : data.websiteUrl || '',
        logoUrl: data.logoUrl === 'Não encontrado' ? '' : data.logoUrl || '',
        reviewsSummary: data.reviewsSummary === 'Não encontrado' ? '' : data.reviewsSummary,
        socialMediaLinks: data.socialMediaLinks,
        instagramStats: data.instagramStats,
        sources: sources,
        locationWarning: data.locationWarning,
    };
}

export const findCompanyCandidates = async (
  site: string,
  name?: string,
  city?: string,
  address?: string,
  coords?: { latitude: number, longitude: number },
  instagram?: string,
  additionalInfo?: string
): Promise<CompanyCandidate[]> => {
    const searchTerms = [site, name, city, address, instagram].filter(Boolean).join(', ');

    const prompt = `
      # PERSONA: Assistente de Pesquisa OSINT (Open Source Intelligence)
      Sua única missão é encontrar empresas candidatas com base nos dados do usuário e retornar uma lista estruturada.

      **TAREFA:** Encontre até 3 empresas que correspondam à busca abaixo.

      **TERMOS DE BUSCA PRINCIPAIS:**
      "${searchTerms}"

      **DADOS FORNECIDOS PELO USUÁRIO:**
      - Site: "${site || 'Não fornecido'}"
      - Nome: "${name || 'Não fornecido'}"
      - Informações Adicionais: "${additionalInfo || 'Nenhuma'}"
      
      **REGRAS:**
      1. Se o site foi fornecido, ele é a fonte da verdade.
      2. Se "Informações Adicionais" forem fornecidas, use-as para desambiguação.
      3. Liste apenas empresas reais e existentes.
      
      **FORMATO OBRIGATÓRIO:** JSON Array.
      Schema: { "id": string, "companyName": string, "address": string, "websiteUrl": string, "description": string, "matchType": "EXATO_NA_CIDADE" | "NOME_CORRETO_OUTRA_CIDADE" | "SUGESTAO" }.
    `;

    const config: any = {
        tools: [{googleSearch: {}}, {googleMaps: {}}],
        temperature: 0,
    };

    if (coords) {
         config.toolConfig = {
             retrievalConfig: {
                 latLng: { latitude: coords.latitude, longitude: coords.longitude }
             }
         }
    }

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config,
    });

    return parseJsonFromText(response.text || "[]");
};

export const getFullCompanyInfo = async(candidate: CompanyCandidate, userInstagram?: string): Promise<ValidationData> => {
    // Limpeza do handle do instagram se fornecido
    const cleanInstagram = userInstagram ? userInstagram.replace('@', '').trim() : '';

    const searchTerms = [
        candidate.companyName,
        candidate.address !== 'Não encontrado' ? candidate.address : '',
        candidate.websiteUrl !== 'Não encontrado' ? candidate.websiteUrl : '',
    ].filter(Boolean).join(', ');

    // Se o usuário forneceu Instagram, adicionamos uma busca específica (Dorking) para tentar pegar os meta dados
    // Adiciona busca específica no site do instagram para tentar furar o cache do Google
    const instagramSearchQuery = cleanInstagram 
        ? `site:instagram.com/${cleanInstagram} OR site:instagram.com "${candidate.companyName}"` 
        : `site:instagram.com "${candidate.companyName}" ${candidate.address.split(',')[0]}`;

    const prompt = `
        Aja como um Diretor de Estratégia, especialista em OSINT. Extraia informações detalhadas sobre esta empresa.

        **TERMOS DE BUSCA GERAIS:**
        ${searchTerms}

        **BUSCA INSTAGRAM (Prioritária):**
        ${instagramSearchQuery}

        **EMPRESA:**
        - Nome: ${candidate.companyName}
        - Endereço: ${candidate.address}
        ${cleanInstagram ? `- Instagram Informado pelo Usuário: @${cleanInstagram}` : ''}

        **INSTRUÇÕES CRÍTICAS PARA INSTAGRAM:**
        1. Procure nos snippets do Google Search por termos como "Seguidores", "Posts", "Following".
        2. Tente extrair a BIO do perfil a partir da descrição do resultado da busca (snippet).
        3. O handle (usuário) é a parte mais importante.

        **ESTRUTURA DA RESPOSTA (Use este formato exato):**
        Nome da Empresa: ${candidate.companyName}
        Descrição: [Descrição detalhada do negócio]
        Endereço: [Endereço completo]
        Website: [URL do site]
        Logo URL: [URL da imagem do logo]
        Resumo das Avaliações: [Resumo das avaliações do Google Maps/Facebook]
        Redes Sociais:
        - Instagram: [URL]
        - Facebook: [URL]
        - LinkedIn: [URL]
        Instagram Stats:
        - Handle: @[handle encontrado ou fornecido]
        - Seguidores: [Quantidade encontrada no snippet ou "Não encontrado"]
        - Posts: [Quantidade ou "Não encontrado"]
        - Bio: [Texto da bio encontrado no snippet]
        - URL: [URL completa do perfil]
    `;

     const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: [{googleSearch: {}}],
            temperature: 0.1,
        }
    });

    const sources = extractSources(response);
    const initialData = parseValidationData(response.text || "", sources);

    // TENTATIVA DE ENRIQUECIMENTO VIA API DO INSTAGRAM
    const instaHandle = cleanInstagram || initialData.instagramStats?.handle?.replace('@', '').trim();
    
    if (instaHandle) {
        console.log(`Tentando buscar dados ricos do Instagram para: ${instaHandle}`);
        const richInstaData = await getInstagramData(instaHandle);
        
        if (!('error' in richInstaData)) {
            // Sucesso! Mesclar dados ricos
            initialData.instagramStats = {
                handle: instaHandle,
                followers: richInstaData.followers,
                following: richInstaData.following,
                posts: richInstaData.posts,
                bio: richInstaData.bio,
                profileUrl: richInstaData.profileUrl,
                postTypes: richInstaData.postTypes,
                visualStyle: richInstaData.visualStyle,
                highlights: richInstaData.highlights,
                linkInBio: richInstaData.linkInBio
            };
            
            // Adicionar infos do Instagram na análise geral se ainda não estiverem
            if (richInstaData.visualStyle) {
                initialData.reviewsSummary = (initialData.reviewsSummary || '') + `\n\n[Instagram Insights]: ${richInstaData.visualStyle}`;
            }
        } else {
            console.warn("Falha ao obter dados ricos do Instagram:", richInstaData.error);
        }
    }

    return initialData;
}

export const createConceptFromIdea = async (
    data: { name: string, description: string, segment: string, city: string, country: string, benchmarks: string, investment: string }
): Promise<ValidationData> => {
    const prompt = `
      # PERSONA: Consultor Estratégico de Negócios e Marcas IA
      Transforme esta ideia em um conceito de negócio estruturado.

      **DADOS DO EMPENDEDOR:**
      - Ideia: ${data.name}
      - Descrição: ${data.description}
      - Segmento: ${data.segment}
      - Local: ${data.city}, ${data.country}
      - Investimento: ${data.investment}

      **ESTRUTURA DA RESPOSTA (JSON OBRIGATÓRIO):**
      Schema:
      {
          companyName: string,
          description: string,
          businessBriefing: {
              productServiceIdea: string,
              distributionStrategy: string,
              impactAndPotential: string
          }
      }
    `;

    const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: prompt,
        config: { 
            tools: [{googleSearch: {}}],
            temperature: 0.3,
            maxOutputTokens: 8192,
            responseMimeType: "application/json", 
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    companyName: { type: Type.STRING },
                    description: { type: Type.STRING },
                    businessBriefing: {
                        type: Type.OBJECT,
                        properties: {
                            productServiceIdea: { type: Type.STRING },
                            distributionStrategy: { type: Type.STRING },
                            impactAndPotential: { type: Type.STRING },
                        },
                        required: ['productServiceIdea', 'distributionStrategy', 'impactAndPotential']
                    }
                },
                required: ['companyName', 'description', 'businessBriefing']
            }
        }
    });
    
    const parsed = parseJsonFromText(response.text || "{}");

    return {
      companyName: parsed.companyName,
      description: parsed.description,
      businessBriefing: parsed.businessBriefing,
      initialInvestment: data.investment,
      companyAnalysis: `Briefing de Negócio:\n- Nome: ${parsed.companyName}\n- Conceito: ${parsed.description}\n- Produto: ${parsed.businessBriefing.productServiceIdea}\n- Distribuição: ${parsed.businessBriefing.distributionStrategy}\n- Impacto: ${parsed.businessBriefing.impactAndPotential}`,
      address: `${data.city}, ${data.country}`,
      logoUrl: '',
    };
}

const formatCompanyDataForDossier = (data: ValidationData): string => {
    const socialLinks = data.socialMediaLinks?.map(l => `- ${l.platform}: ${l.url}`).join('\n') || 'Não disponível.';
    
    let instaStats = '';
    if (data.instagramStats) {
        instaStats = `Instagram Stats: 
        - Handle: ${data.instagramStats.handle}
        - Seguidores: ${data.instagramStats.followers}
        - Bio: ${data.instagramStats.bio}
        ${data.instagramStats.postTypes ? `- Tipos de Post: ${data.instagramStats.postTypes}` : ''}
        ${data.instagramStats.visualStyle ? `- Estilo Visual: ${data.instagramStats.visualStyle}` : ''}
        `;
    }

    return `
# Dossiê da Empresa: ${data.companyName}
## Informações
- Nome: ${data.companyName}
- Descrição: ${data.description}
- Endereço: ${data.address || 'Não informado'}
- Website: ${data.websiteUrl || 'Não informado'}
## Presença
- Logo URL: ${data.logoUrl || 'Não informado'}
- Redes Sociais:
${socialLinks}
${instaStats}
## Reputação
- Resumo Avaliações: ${data.reviewsSummary || 'N/A'}
`;
};

export const getCompanyAnalysis = async (companyInfo: ValidationData, onChunk?: (text: string) => void): Promise<{ analysisText: string, sources: Source[] }> => {
    const instagramLink = companyInfo.socialMediaLinks?.find(l => l.platform.toLowerCase().includes('instagram'))?.url;
    
    const searchTerms = [
        companyInfo.companyName,
        companyInfo.websiteUrl,
        companyInfo.address,
        instagramLink ? `Instagram ${companyInfo.companyName}` : null 
    ].filter(Boolean).join(', ');
    
    const companyDossier = formatCompanyDataForDossier(companyInfo);

    const prompt = `
      # PERSONA: Consultor Estratégico de Marcas IA
      Realize um diagnóstico estratégico profundo da marca.

      **FONTE DE DADOS:** 
      ${companyDossier}

      **TERMOS DE BUSCA:**
      ${searchTerms}

      **ESTRUTURA DO DIAGNÓSTICO (Markdown):**
      ## Diagnóstico Rápido
      ## DNA da Marca
      ## Análise de Reputação e Mercado
      ## Análise de Comunicação
      ## Síntese Estratégica
      
      Inclua simulação de pensamento (PENSAMENTO: ...) antes da resposta final.
    `;
    
    const config: any = {
        tools: [{googleSearch: {}}],
        temperature: 0.1
    };

    const responseStream = await ai.models.generateContentStream({
        model: "gemini-3-pro-preview",
        contents: prompt,
        config: config
    });

    let fullText = '';
    let finalResponse: GenerateContentResponse | undefined;

    for await (const chunk of responseStream) {
        finalResponse = chunk;
        if (chunk.text) {
            fullText += chunk.text;
            if (onChunk) {
                onChunk(fullText);
            }
        }
    }

    if (!finalResponse) {
        throw new Error("A resposta da IA estava vazia.");
    }
    
    const sources = extractSources(finalResponse);
    const analysisText = fullText.split('\n').filter(line => !line.startsWith('PENSAMENTO:')).join('\n').trim();
    return { analysisText, sources };
}

export const analyzeLogo = async (base64ImageData: string): Promise<LogoAnalysis> => {
    const prompt = `
        Analise o logotipo fornecido.
        Retorne um JSON com:
        1. logoDescription (Conceito e mensagem)
        2. colorPalette (primary, secondary, neutral) com name e hex.
    `;

    const colorItemSchema = {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            hex: { type: Type.STRING }
        },
        required: ['name', 'hex']
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ inlineData: { data: base64ImageData, mimeType: 'image/png' } }, { text: prompt }] },
        config: {
            temperature: 0.2,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    logoDescription: { type: Type.STRING },
                    colorPalette: {
                        type: Type.OBJECT,
                        properties: {
                            primary: { type: Type.ARRAY, items: colorItemSchema },
                            secondary: { type: Type.ARRAY, items: colorItemSchema },
                            neutral: { type: Type.ARRAY, items: colorItemSchema },
                        },
                         required: ['primary', 'secondary', 'neutral']
                    },
                },
                required: ['logoDescription', 'colorPalette']
            }
        },
    });

    return parseJsonFromText(response.text || "{}");
}

const companyValueSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
    },
    required: ['name', 'description'],
};

const competitorSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        link: { type: Type.STRING },
    },
    required: ['name', 'link'],
};

const part1Schema = {
    type: Type.OBJECT,
    properties: {
        part1: {
            type: Type.OBJECT,
            properties: {
                productStrategy: {
                    type: Type.OBJECT,
                    properties: {
                        category: { type: Type.STRING },
                        description: { type: Type.STRING },
                        portfolioStructure: { type: Type.STRING }
                    },
                    required: ['category', 'description', 'portfolioStructure']
                },
                purpose: { type: Type.STRING },
                mission: { type: Type.STRING },
                vision: { type: Type.STRING },
                values: { type: Type.ARRAY, items: companyValueSchema },
                archetypes: {
                    type: Type.OBJECT,
                    properties: {
                        primary: { type: Type.STRING },
                        secondary: { type: Type.STRING },
                        imagePrompt: { type: Type.STRING, description: "Prompt para gerar uma imagem conceitual representando o arquétipo da marca." }
                    },
                    required: ['primary', 'imagePrompt']
                },
                audienceAndPositioning: {
                    type: Type.OBJECT,
                    properties: {
                        targetAudience: { type: Type.STRING },
                        competitors: { type: Type.ARRAY, items: competitorSchema },
                        differentiators: { type: Type.ARRAY, items: { type: Type.STRING } },
                        positioningStatement: { type: Type.STRING }
                    },
                    required: ['targetAudience', 'competitors', 'differentiators', 'positioningStatement']
                }
            },
            required: ['productStrategy', 'purpose', 'mission', 'vision', 'values', 'archetypes', 'audienceAndPositioning']
        }
    },
    required: ['part1']
};


export const generateBrandboardPart1 = async (companyInfo: ValidationData, onChunk: (text: string) => void, onProgress?: (message: string) => void) => {
    onProgress?.('Etapa 1 de 4: Gerando o núcleo da marca...');
    const prompt = `
      # PERSONA: Consultor Estratégico de Marcas IA
      Defina "O Núcleo da Marca" (Estratégia, Propósito, Arquétipos).

      **IMPORTANTE SOBRE ARQUÉTIPOS:**
      Além de definir os arquétipos primário e secundário, crie um 'imagePrompt' detalhado para gerar uma imagem artística/simbólica que represente visualmente a personalidade desse arquétipo.

      --- DIAGNÓSTICO ---
      ${companyInfo.companyAnalysis || companyInfo.description}
      --- FIM ---
      
      Simule o pensamento antes do JSON.
    `;
    const stream = await ai.models.generateContentStream({
        model: "gemini-3-pro-preview",
        contents: prompt,
        config: {
            temperature: 0.2,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
            responseSchema: part1Schema,
        }
    });

    let fullText = '';
    for await (const chunk of stream) {
        if (chunk.text) {
            fullText += chunk.text;
            onChunk(fullText);
        }
    }
    return parseJsonFromText(fullText);
};

const traitSchema = {
    type: Type.OBJECT,
    properties: {
        trait: { type: Type.STRING },
        description: { type: Type.STRING },
    },
    required: ['trait', 'description'],
};
const contentPillarSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
    },
    required: ['name', 'description'],
};
const part2Schema = {
    type: Type.OBJECT,
    properties: {
        part2: {
            type: Type.OBJECT,
            properties: {
                voicePersonality: { type: Type.STRING },
                toneOfVoiceApplication: {
                    type: Type.OBJECT,
                    properties: {
                        sales: { type: Type.STRING },
                        support: { type: Type.STRING },
                        content: { type: Type.STRING },
                    },
                    required: ['sales', 'support', 'content'],
                },
                practicalGuidelines: {
                    type: Type.OBJECT,
                    properties: {
                        weAre: { type: Type.ARRAY, items: traitSchema },
                        weAreNot: { type: Type.ARRAY, items: traitSchema },
                    },
                    required: ['weAre', 'weAreNot'],
                },
                slogan: { type: Type.STRING },
                keyMessages: {
                    type: Type.OBJECT,
                    properties: {
                        product: { type: Type.STRING },
                        benefit: { type: Type.STRING },
                        brand: { type: Type.STRING },
                    },
                    required: ['product', 'benefit', 'brand'],
                },
                contentPillars: {
                    type: Type.ARRAY,
                    items: contentPillarSchema,
                },
            },
            required: ['voicePersonality', 'toneOfVoiceApplication', 'practicalGuidelines', 'slogan', 'keyMessages', 'contentPillars']
        }
    },
    required: ['part2']
};

export const generateBrandboardPart2 = async (companyInfo: ValidationData, context: any, onChunk: (text: string) => void, onProgress?: (message: string) => void) => {
    onProgress?.('Etapa 2 de 4: Construindo a identidade verbal...');
    const prompt = `
      # PERSONA: Consultor Estratégico de Marcas IA
      Construa a "Identidade Verbal" (Voz, Tom, Slogan, Mensagens).

      --- CONTEXTO ---
      ${JSON.stringify(context.part1)}
      --- FIM ---
      
      Simule o pensamento antes do JSON.
    `;
    const stream = await ai.models.generateContentStream({
        model: "gemini-3-pro-preview",
        contents: prompt,
        config: {
            temperature: 0.2,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
            responseSchema: part2Schema,
        }
    });

    let fullText = '';
    for await (const chunk of stream) {
        if (chunk.text) {
            fullText += chunk.text;
            onChunk(fullText);
        }
    }
    return parseJsonFromText(fullText);
};

const colorSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        hex: { type: Type.STRING },
    },
    required: ['name', 'hex'],
};
const fontSchema = {
    type: Type.OBJECT,
    properties: {
        font: { type: Type.STRING },
        usage: { type: Type.STRING },
    },
    required: ['font', 'usage'],
};
const part3Schema = {
    type: Type.OBJECT,
    properties: {
        part3: {
            type: Type.OBJECT,
            properties: {
                logo: {
                    type: Type.OBJECT,
                    properties: {
                        description: { type: Type.STRING },
                        prompt: { type: Type.STRING },
                    },
                    required: ['description', 'prompt'],
                },
                colorPalette: {
                    type: Type.OBJECT,
                    properties: {
                        primary: { type: Type.ARRAY, items: colorSchema },
                        secondary: { type: Type.ARRAY, items: colorSchema },
                    },
                    required: ['primary', 'secondary'],
                },
                typography: {
                    type: Type.OBJECT,
                    properties: {
                        primary: { ...fontSchema },
                        secondary: { ...fontSchema },
                        hierarchy: {
                            type: Type.OBJECT,
                            properties: {
                                h1: { type: Type.STRING },
                                h2: { type: Type.STRING },
                                body: { type: Type.STRING },
                            },
                            required: ['h1', 'h2', 'body'],
                        }
                    },
                    required: ['primary', 'secondary', 'hierarchy'],
                },
                photographyStyle: {
                    type: Type.OBJECT,
                    properties: {
                        description: { type: Type.STRING },
                        imagePrompts: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: ['description', 'imagePrompts'],
                },
            },
            required: ['logo', 'colorPalette', 'typography', 'photographyStyle']
        }
    },
    required: ['part3']
};

export const generateBrandboardPart3 = async (companyInfo: ValidationData, context: any, onChunk: (text: string) => void, onProgress?: (message: string) => void) => {
    onProgress?.('Etapa 3 de 4: Criando a identidade visual...');
    const prompt = `
      # PERSONA: Consultor de Design IA
      Crie a "Identidade Visual" (Logo, Cores, Tipografia, Fotografia).

      --- CONTEXTO ---
      ${JSON.stringify(context)}
      --- FIM ---
      
      Simule o pensamento antes do JSON.
    `;
    const stream = await ai.models.generateContentStream({
        model: "gemini-3-pro-preview",
        contents: prompt,
        config: {
            temperature: 0.2,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
            responseSchema: part3Schema,
        }
    });
    
    let fullText = '';
    for await (const chunk of stream) {
        if (chunk.text) {
            fullText += chunk.text;
            onChunk(fullText);
        }
    }
    return parseJsonFromText(fullText);
};

const personaSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        story: { type: Type.STRING },
        pains: { type: Type.STRING },
        goals: { type: Type.STRING },
        informationSources: { type: Type.STRING },
        howWeHelp: { type: Type.STRING },
        imagePrompt: { type: Type.STRING, description: "Prompt para gerar um retrato realista desta persona." }
    },
    required: ['name', 'story', 'pains', 'goals', 'informationSources', 'howWeHelp', 'imagePrompt'],
};
const journeyStageSchema = {
    type: Type.OBJECT,
    properties: {
        description: { type: Type.STRING },
        goal: { type: Type.STRING },
    },
    required: ['description', 'goal']
};
const channelSchema = {
    type: Type.OBJECT,
    properties: {
        channel: { type: Type.STRING },
        mainPurpose: { type: Type.STRING },
        audience: { type: Type.STRING },
        successMetrics: { type: Type.STRING },
    },
    required: ['channel', 'mainPurpose', 'audience', 'successMetrics'],
};
const part4Schema = {
    type: Type.OBJECT,
    properties: {
        part4: {
            type: Type.OBJECT,
            properties: {
                personas: { type: Type.ARRAY, items: personaSchema },
                customerJourney: {
                    type: Type.OBJECT,
                    properties: {
                        discovery: journeyStageSchema,
                        consideration: journeyStageSchema,
                        decision: journeyStageSchema,
                        loyalty: journeyStageSchema,
                    },
                    required: ['discovery', 'consideration', 'decision', 'loyalty'],
                },
                channelMatrix: { type: Type.ARRAY, items: channelSchema },
            },
            required: ['personas', 'customerJourney', 'channelMatrix'],
        }
    },
    required: ['part4']
};


export const generateBrandboardPart4 = async (companyInfo: ValidationData, context: any, onChunk: (text: string) => void, onProgress?: (message: string) => void) => {
    onProgress?.('Etapa 4 de 4: Mapeando a estratégia de canal...');
    const prompt = `
      # PERSONA: Estrategista de Marketing IA
      Crie a "Estratégia de Canal" (Personas, Jornada, Canais).
      Para as PERSONAS, inclua um 'imagePrompt' para gerar o retrato de cada uma.

      --- CONTEXTO ---
      ${JSON.stringify(context)}
      --- FIM ---
      
      Simule o pensamento antes do JSON.
    `;
    const stream = await ai.models.generateContentStream({
        model: "gemini-3-pro-preview",
        contents: prompt,
        config: {
            temperature: 0.2,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
            responseSchema: part4Schema,
        }
    });
    
    let fullText = '';
    for await (const chunk of stream) {
        if (chunk.text) {
            fullText += chunk.text;
            onChunk(fullText);
        }
    }
    return parseJsonFromText(fullText);
};


export const generateImage = async (prompt: string, type: 'logo' | 'moodboard' | 'persona' | 'archetype' = 'moodboard'): Promise<string> => {
    let finalPrompt = prompt;
    let aspectRatio = "1:1";

    if (type === 'logo') {
        finalPrompt = `Logotipo vetorial minimalista, fundo branco, design limpo, alta resolução. ${prompt}`;
    } else if (type === 'moodboard') {
        finalPrompt = `Fotografia cinematográfica, profissional, altíssima qualidade, estilo editorial. ${prompt}`;
    } else if (type === 'persona') {
        finalPrompt = `Retrato fotográfico realista de uma pessoa, rosto bem iluminado, estilo profissional, fotografia de estúdio. ${prompt}`;
    } else if (type === 'archetype') {
         finalPrompt = `Representação visual artística e simbólica do arquétipo, alta qualidade, estilo conceitual e inspirador. ${prompt}`;
    }

    // Using gemini-2.5-flash-image which is more stable and has higher quotas than Imagen models
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { text: finalPrompt },
          ],
        },
        config: {
            imageConfig: {
                aspectRatio: aspectRatio === "1:1" ? "1:1" : "1:1",
            },
        },
    });
    
    // Extract image from response parts
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return part.inlineData.data;
        }
    }

    throw new Error('A geração de imagem falhou ou não retornou dados.');
};

export const editImage = async (base64ImageData: string, mimeType: string, prompt: string): Promise<string> => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64ImageData,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      // Note: responseModalities is not needed for nano banana
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return part.inlineData.data;
        }
    }
    throw new Error('A edição de imagem falhou em produzir um resultado.');
};

export const enhanceLogo = async (base64ImageData: string, mimeType: string): Promise<string> => {
    const prompt = "Isolate the logo in the image. Crop tightly around the logo, fix any perspective distortion (make it flat), improve sharpness and contrast, and set the background to pure white. The result should look like a high-quality digital logo asset.";
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64ImageData,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return part.inlineData.data;
        }
    }
    throw new Error('Falha ao otimizar o logotipo.');
};

export const regenerateFieldText = async (
    companyInfo: ValidationData,
    fullBrandboardData: Partial<BrandboardData>,
    fieldKey: string, 
    currentValue: string,
    comment?: string
): Promise<string> => {
    const prompt = `
      # PERSONA: Consultor Estratégico de Marcas IA
      Refine o texto do campo "${fieldKey}".

      **TEXTO ATUAL:**
      "${currentValue}"

      ${comment ? `**INSTRUÇÕES:** "${comment}"` : '**AVISO:** Melhore a clareza e o tom.'}

      **RESPOSTA:** Apenas o novo texto.
    `;
    const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: prompt
    });
    return (response.text || "").trim();
};