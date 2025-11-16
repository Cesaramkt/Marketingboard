import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import type { ValidationData, BrandboardData, Source, LogoAnalysis, CompanyCandidate } from '../types';

const ai = new GoogleGenAI({apiKey: process.env.API_KEY!});

const parseJsonFromText = (text: string) => {
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

// DEPRECATED in favor of findCompanyCandidates for a better validation flow.
// This function remains for reference or potential fallback but should not be used in the primary flow.
const parseValidationData = (text: string, sources?: Source[]): ValidationData => {
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

    const reviewsSummaryMatch = text.match(/^(?:-\s*)?Resumo das Avaliações:\s*([\s\S]*?)(?=^\s*(?:-\s*)?Redes Sociais:|AVISO_LOCALIZACAO:|$)/im);
    if (reviewsSummaryMatch && reviewsSummaryMatch[1].trim()) data.reviewsSummary = reviewsSummaryMatch[1].trim();
    
    const socialMediaBlockMatch = text.match(/^(?:-\s*)?Redes Sociais:\s*([\s\S]*?)(?=^\s*(?:-\s*)?AVISO_LOCALIZACAO:|$)/im);
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
        sources: sources,
        locationWarning: data.locationWarning,
    };
}


export const findCompanyCandidates = async (
  name: string,
  city: string,
  address?: string,
  site?: string,
  coords?: { latitude: number, longitude: number }
): Promise<CompanyCandidate[]> => {
    const prompt = `
      # PERSONA: Assistente de Pesquisa OSINT (Open Source Intelligence)
      Sua única missão é encontrar empresas candidatas com base nos dados do usuário e retornar uma lista estruturada. Você é metódico, preciso e entende a importância da localização. Sua prioridade é evitar um resultado vazio.

      **TAREFA:** Encontre até 3 empresas que correspondam à busca abaixo, seguindo a hierarquia de regras.

      **DADOS FORNECIDOS PELO USUÁRIO:**
      - Nome da Empresa: "${name}"
      - Cidade (Fonte da Verdade): "${city}"
      - Endereço (Opcional): "${address || 'Não fornecido'}"
      - Site (Opcional): "${site || 'Não fornecido'}"
      
      **REGRAS CRÍTICAS DE BUSCA E CLASSIFICAÇÃO (SIGA ESTA ORDEM):**
      1.  **PRIORIDADE 1 - CORRESPONDÊNCIA NA CIDADE:** A busca principal DEVE focar em encontrar a empresa "${name}" na cidade de "${city}". Se encontrar uma correspondência exata ou muito provável, ela deve ser o primeiro item da lista com o 'matchType' "EXATO_NA_CIDADE".
      2.  **PRIORIDADE 2 - CORRESPONDÊNCIA FORA DA CIDADE:** Se a busca na cidade principal for inconclusiva, procure pela empresa "${name}" em outras localidades. Se encontrar, adicione-as à lista com o 'matchType' "NOME_CORRETO_OUTRA_CIDADE".
      3.  **PRIORIDADE 3 - SUGESTÕES INTELIGENTES (ÚLTIMO RECURSO):** Se as buscas anteriores falharem, encontre empresas com nomes *semelhantes* ou no mesmo *segmento de negócio* dentro da cidade de "${city}". Marque-as com o 'matchType' "SUGESTAO". O objetivo é sempre fornecer uma alternativa relevante ao usuário.
      4.  **LÓGICA DE PREENCHIMENTO:** Para cada candidato, preencha todos os campos do schema JSON. Se uma informação não for encontrada, use "Não encontrado".
      5.  **SEM RESULTADOS (CASO EXTREMO):** Somente se, e somente se, após seguir as 3 prioridades acima você não encontrar absolutamente NADA, retorne um array JSON vazio: [].
      6.  **FOCO NOS FATOS:** Não invente descrições. Extraia uma descrição concisa (1 frase) do site oficial ou perfil do Google Meu Negócio.
      
      **FORMATO OBRIGATÓRIO:** Sua resposta DEVE ser um array JSON válido e NADA MAIS. Formate a resposta dentro de um bloco de código markdown JSON (\`\`\`json ... \`\`\`). O schema para cada objeto no array deve ser: { "id": string, "companyName": string, "address": string, "websiteUrl": string, "description": string, "matchType": "EXATO_NA_CIDADE" | "NOME_CORRETO_OUTRA_CIDADE" | "SUGESTAO" }.
    `;

    const config: any = {
        tools: [{googleSearch: {}}, {googleMaps: {}}],
        temperature: 0, // Baixa temperatura para respostas factuais
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

    return parseJsonFromText(response.text);
};


export const getFullCompanyInfo = async(candidate: CompanyCandidate): Promise<ValidationData> => {
    const prompt = `
        Aja como um Diretor de Estratégia, especialista em OSINT. O usuário selecionou a empresa correta. Sua missão agora é aprofundar a pesquisa e extrair informações detalhadas sobre esta empresa específica.

        **EMPRESA CONFIRMADA PELO USUÁRIO:**
        - Nome: ${candidate.companyName}
        - Endereço: ${candidate.address}
        - Website: ${candidate.websiteUrl}

        **TAREFA:** Conduza uma busca detalhada usando as ferramentas disponíveis para extrair as seguintes informações. Foque em fontes oficiais (site da empresa, perfil do Google Meu Negócio, redes sociais oficiais).

        **ESTRUTURA DA RESPOSTA (Use este formato exato):**
        Nome da Empresa: ${candidate.companyName}
        Descrição: ${candidate.description}
        Endereço: ${candidate.address}
        Website: ${candidate.websiteUrl}
        Logo URL: [URL direta e funcional para a imagem do logotipo]
        Resumo das Avaliações: [Resumo de 1-2 frases do sentimento geral das avaliações dos clientes, seguido por um ou dois exemplos de avaliação real entre aspas que capturem a essência do feedback.]
        Redes Sociais:
        - Instagram: [URL completa do perfil]
        - Facebook: [URL completa do perfil]
    `;

     const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: [{googleSearch: {}}, {googleMaps: {}}],
            temperature: 0.1,
        }
    });

    const sources = extractSources(response);
    return parseValidationData(response.text, sources);
}


export const createConceptFromIdea = async (
    ideaName: string,
    ideaDescription: string,
    segment: string,
    benchmarks: string
): Promise<ValidationData> => {
    const prompt = `
      # PERSONA: Consultor Estratégico de Marcas IA
      Sua função é transformar dados e insights em uma estrutura de marketing clara, lógica e acionável. Você valoriza a clareza sobre a complexidade e a estratégia sobre a tática. Sua comunicação é direta, profissional e focada em gerar resultados para o negócio.

      **TAREFA:** Um empreendedor forneceu uma ideia de negócio. Sua missão é transformar essa ideia bruta em um conceito de marca inicial que seja inspirador e comercialmente viável. Foque em criar um nome e uma descrição claros, diretos e focados no valor para o cliente.

      **DADOS DO EMPENDEDOR:**
      - Nome da Ideia/Marca: ${ideaName}
      - Descrição da Ideia: ${ideaDescription}
      - Segmento de Mercado: ${segment}
      - Concorrentes/Inspirações: ${benchmarks}

      **SUA RESPOSTA DEVE CONTER:**
      1.  **Nome da Empresa:** Um nome profissional e cativante, baseado na ideia.
      2.  **Descrição:** Uma descrição de uma frase, clara e poderosa, explicando o que a empresa faz, para quem, e qual o benefício.

      Sua resposta DEVE ser um objeto JSON válido, e NADA MAIS, sem markdown.
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: { 
            temperature: 0.2,
            maxOutputTokens: 8192,
            responseMimeType: "application/json", 
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    companyName: { type: Type.STRING, description: "Nome da Empresa Sugerido" },
                    description: { type: Type.STRING, description: "Descrição da empresa em uma frase." },
                },
                required: ['companyName', 'description']
            }
        }
    });
    
    const parsed = parseJsonFromText(response.text);

    return {
      companyName: parsed.companyName,
      description: parsed.description,
      address: '',
      logoUrl: '',
      companyAnalysis: `O usuário solicitou a criação de uma marca do zero a partir de uma ideia. O conceito inicial gerado pela IA é: Nome="${parsed.companyName}", Descrição="${parsed.description}". A IA deve atuar como um diretor de criação para desenvolver todos os elementos da marca a partir destes pontos, usando as informações originais do usuário como inspiração (Segmento: ${segment}, Benchmarks: ${benchmarks}).`
    };
}


export const getCompanyAnalysis = async (companyInfo: ValidationData, onChunk?: (text: string) => void): Promise<{ analysisText: string, sources: Source[] }> => {
    const socialMediaLinks = companyInfo.socialMediaLinks?.map(l => `- ${l.platform}: ${l.url}`).join('\n') || 'Não fornecido';
    
    const prompt = `
      # PERSONA: Consultor Estratégico de Marcas IA
      Sua função é transformar dados e insights em uma estrutura de marketing clara, lógica e acionável. Você valoriza a clareza sobre a complexidade e a estratégia sobre a tática. Sua comunicação é direta, profissional e focada em gerar resultados para o negócio.

      **TAREFA:** Conduza uma pesquisa aprofundada (OSINT) sobre a empresa-alvo e traduza os dados brutos em um diagnóstico estratégico claro e acionável. O objetivo é criar uma base sólida e factual para as próximas decisões de marketing.

      **FONTE DA VERDADE (NÃO MUDE ESTA EMPRESA):**
      - Nome: ${companyInfo.companyName}
      - Website Principal: ${companyInfo.websiteUrl || 'Não fornecido'}
      - Endereço: ${companyInfo.address || 'Não fornecido'}
      - Redes Sociais Conhecidas:
      ${socialMediaLinks}

      **PROCESSO DE ANÁLISE PROFUNDA (SEJA METÓDICO):**
      1.  **PONTO DE PARTIDA:** Comece sua pesquisa USANDO O WEBSITE e as redes sociais fornecidas.
      2.  **Análise de Conteúdo:** Leia os textos do site, posts de redes sociais. Qual é a mensagem principal? Qual o tom de voz?
      3.  **Análise Visual:** Analise as imagens publicadas. Que tipo de fotografia usam? Qual a estética?
      4.  **Análise de Avaliações (Voz do Cliente):** Identifique os **elogios recorrentes** (o que eles amam?) e as **críticas recorrentes** (onde estão as falhas?).

      **PROCESSO DE PENSAMENTO ESTRUTURADO (SIMULAÇÃO):**
      Antes de gerar a resposta final, você DEVE simular seu processo de pensamento. Apresente cada etapa em uma nova linha, formatada EXATAMENTE como: \`THINKING: [Descrição da etapa]\`. Gere de 3 a 5 etapas.
      Exemplos:
      THINKING: Iniciando varredura OSINT no website e redes sociais fornecidas.
      THINKING: Sintetizando avaliações de clientes para identificar padrões de elogios e críticas.
      THINKING: Analisando o tom de voz e o estilo visual para definir a personalidade da comunicação.
      THINKING: Compilando os insights em um diagnóstico estratégico estruturado.

      **ESTRUTURA DO SEU DIAGNÓSTICO (sua resposta DEVE seguir esta estrutura):**
      Sintetize suas descobertas em um relatório conciso, usando TÍTULOS EM MARKDOWN (##). Explique o porquê de cada ponto.

      ## Diagnóstico Rápido
      Um parágrafo de resumo que identifica o principal ponto forte e o principal gargalo ou oportunidade de melhoria.

      ## DNA da Marca (O que eles dizem ser)
      - **Propósito Declarado:** Qual é a missão ou propósito que a empresa comunica?
      - **Solução Oferecida:** O que a empresa vende e qual problema ela diz resolver?

      ## Percepção do Mercado (O que os clientes dizem que eles são)
      - **Elogios Recorrentes:** Liste em tópicos os pontos positivos mais citados.
      - **Críticas Recorrentes:** Liste em tópicos as queixas mais comuns.
      - **Palavras-chave do Cliente:** Quais palavras os clientes mais usam para descrever a experiência?

      ## Análise de Comunicação
      - **Personalidade da Marca (Tom de Voz):** Como a empresa se comunica? É formal, divertida, técnica?
      - **Estilo Visual:** Descreva a estética das imagens e do design.

      ## Síntese Estratégica
      - **Público-Alvo Real:** Com base em tudo, descreva para quem a empresa realmente está vendendo.
      - **Proposta de Valor Real:** Qual é o verdadeiro diferencial da empresa na prática?
      - **Aviso Profissional:** Uma recomendação final e direta para o empreendedor.
    `;
    
    const responseStream = await ai.models.generateContentStream({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: {
            tools: [{googleSearch: {}}],
            temperature: 0.1
        }
    });

    let fullText = '';
    let finalResponse: GenerateContentResponse | undefined;

    for await (const chunk of responseStream) {
        finalResponse = chunk; // Keep the latest chunk as it's the most complete representation
        const chunkText = chunk.text;
        if (chunkText) {
            fullText += chunkText;
            if (onChunk) {
                onChunk(fullText);
            }
        }
    }

    if (!finalResponse) {
        throw new Error("A resposta da IA estava vazia ou a transmissão falhou.");
    }
    
    const sources = extractSources(finalResponse);
    return { analysisText: fullText, sources };
}

export const analyzeLogo = async (base64ImageData: string): Promise<LogoAnalysis> => {
    const prompt = `
        # PERSONA: Consultor Estratégico de Marcas IA
        Sua função é transformar dados e insights em uma estrutura de marketing clara, lógica e acionável. Você entende que um logo não é apenas um desenho, é um ativo estratégico.

        **TAREFA:** Analise a imagem do logotipo fornecida com um olhar crítico e de marketing. Sua tarefa não é julgar se é "bonito", mas decodificar o que ele comunica.

        **O QUE VOCÊ DEVE FAZER:**
        1.  **Conceito do Logo:** Descreva a mensagem e o conceito por trás do design. O que ele transmite sobre a marca? (Ex: confiança, modernidade, tradição).
        2.  **Psicologia das Cores:** Extraia a paleta de cores principal e explique brevemente o que cada cor comunica no contexto do negócio.
        
        Sua resposta DEVE ser um objeto JSON válido, e NADA MAIS.
    `;

    const colorItemSchema = {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING, description: "Nome descritivo da cor (ex: Azul Profundo)." },
            hex: { type: Type.STRING, description: "Código hexadecimal da cor (ex: #000080)." }
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
                    logoDescription: { type: Type.STRING, description: "Descrição conceitual do logotipo analisado." },
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

    return parseJsonFromText(response.text);
}

const companyValueSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "O nome do valor (ex: 'Qualidade')." },
        description: { type: Type.STRING, description: "Uma breve descrição de como a empresa vive esse valor." },
    },
    required: ['name', 'description'],
};

const part1Schema = {
    type: Type.OBJECT,
    properties: {
        part1: {
            type: Type.OBJECT,
            properties: {
                purpose: { type: Type.STRING, description: "O 'porquê' da empresa. Sua razão de existir além do lucro." },
                mission: { type: Type.STRING, description: "O que a empresa faz, para quem, e como. Declaração de missão." },
                vision: { type: Type.STRING, description: "O objetivo de longo prazo da empresa. Onde ela se vê no futuro." },
                values: { 
                    type: Type.ARRAY, 
                    description: "Os princípios guia inegociáveis. De 3 a 5 valores.",
                    items: companyValueSchema 
                },
                archetypes: {
                    type: Type.OBJECT,
                    properties: {
                        primary: { type: Type.STRING, description: "O arquétipo dominante da personalidade da marca (ex: 'O Criador', 'O Sábio')." },
                        secondary: { type: Type.STRING, description: "Um arquétipo de apoio que adiciona nuance." }
                    },
                    required: ['primary']
                },
                audienceAndPositioning: {
                    type: Type.OBJECT,
                    properties: {
                        targetAudience: { type: Type.STRING, description: "Descrição detalhada do cliente ideal." },
                        competitors: { 
                            type: Type.ARRAY, 
                            description: "Lista dos 3 principais concorrentes.",
                            items: { type: Type.STRING } 
                        },
                        differentiators: { 
                            type: Type.ARRAY, 
                            description: "Lista dos principais diferenciais que tornam a marca única.",
                            items: { type: Type.STRING } 
                        },
                        positioningStatement: { type: Type.STRING, description: "Uma frase que define o lugar da marca no mercado." }
                    },
                    required: ['targetAudience', 'competitors', 'differentiators', 'positioningStatement']
                }
            },
            required: ['purpose', 'mission', 'vision', 'values', 'archetypes', 'audienceAndPositioning']
        }
    },
    required: ['part1']
};


export const generateBrandboardPart1 = async (companyInfo: ValidationData, onChunk: (text: string) => void, onProgress?: (message: string) => void) => {
    onProgress?.('Etapa 1 de 4: Gerando o núcleo da marca...');
    const prompt = `
      # PERSONA: Consultor Estratégico de Marcas IA
      Sua função é transformar dados e insights em uma estrutura de marketing clara, lógica e acionável. Você valoriza a clareza sobre a complexidade e a estratégia sobre a tática.

      **TAREFA:** Com base no diagnóstico inicial da empresa, sua missão é definir "O Núcleo da Marca (Quem Somos)". Esta é a fundação estratégica. CRIE e DEFINA o conteúdo para cada campo do schema JSON fornecido. Sua resposta DEVE preencher TODOS os campos obrigatórios com conteúdo estratégico, coeso e bem fundamentado.

      ${companyInfo.companyAnalysis?.includes('criação de uma marca do zero') 
        ? `**MODO CRIAÇÃO:** Esta é uma marca nova. Use o nome e a descrição como inspiração para CRIAR um propósito, missão, visão, valores, arquétipos e um posicionamento de mercado convincente, preenchendo o schema JSON.`
        : `**MODO ESTRATEGISTA:** Atue como um diretor de estratégia. INTERPRETE profundamente o diagnóstico e, com base nele, CRIE e DEFINA o conteúdo para cada campo do schema JSON. Use o diagnóstico como sua fonte de inspiração e base para criar uma estratégia de marca completa.`
      }
      
      **PROCESSO DE PENSAMENTO ESTRUTURADO (SIMULAÇÃO):**
      Antes de gerar a resposta final em JSON, você DEVE simular seu processo de pensamento. Apresente cada etapa em uma nova linha, formatada EXATAMENTE como: \`THINKING: [Descrição da etapa]\`. Gere de 3 a 5 etapas.
      Exemplos:
      THINKING: Analisando o diagnóstico para extrair o propósito central da marca.
      THINKING: Definindo arquétipos que se conectem com o público-alvo identificado.
      THINKING: Cruzando os diferenciais com as dores do cliente para criar a declaração de posicionamento.
      THINKING: Estruturando os valores da empresa de forma clara e memorável.
      THINKING: Compilando todas as informações no formato JSON solicitado.

      **REGRAS CRÍTICAS:**
      1.  **FORMATO:** Sua resposta DEVE ser um objeto JSON válido que corresponda exatamente ao schema fornecido, e NADA MAIS.

      --- DIAGNÓSTICO DA EMPRESA (FONTE DA VERDADE) ---
      ${companyInfo.companyAnalysis || companyInfo.description}
      --- FIM DO DIAGNÓSTICO ---
    `;
    const stream = await ai.models.generateContentStream({
        model: "gemini-2.5-pro",
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
        trait: { type: Type.STRING, description: "A característica da marca (ex: 'Inovadores')." },
        description: { type: Type.STRING, description: "Descrição de como a característica se manifesta." },
    },
    required: ['trait', 'description'],
};
const contentPillarSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "O nome do pilar de conteúdo." },
        description: { type: Type.STRING, description: "Descrição do que é abordado neste pilar." },
    },
    required: ['name', 'description'],
};
const part2Schema = {
    type: Type.OBJECT,
    properties: {
        part2: {
            type: Type.OBJECT,
            properties: {
                voicePersonality: { type: Type.STRING, description: "Adjetivos que descrevem a voz da marca." },
                toneOfVoiceApplication: {
                    type: Type.OBJECT,
                    properties: {
                        sales: { type: Type.STRING, description: "Tom de voz para vendas." },
                        support: { type: Type.STRING, description: "Tom de voz para suporte." },
                        content: { type: Type.STRING, description: "Tom de voz para conteúdo." },
                    },
                    required: ['sales', 'support', 'content'],
                },
                practicalGuidelines: {
                    type: Type.OBJECT,
                    properties: {
                        weAre: { type: Type.ARRAY, description: "Lista de traços que a marca É.", items: traitSchema },
                        weAreNot: { type: Type.ARRAY, description: "Lista de traços que a marca NÃO É.", items: traitSchema },
                    },
                    required: ['weAre', 'weAreNot'],
                },
                slogan: { type: Type.STRING, description: "Slogan ou tagline da marca." },
                keyMessages: {
                    type: Type.OBJECT,
                    properties: {
                        product: { type: Type.STRING, description: "Mensagem-chave sobre o produto/serviço." },
                        benefit: { type: Type.STRING, description: "Mensagem-chave sobre o benefício/transformação." },
                        brand: { type: Type.STRING, description: "Mensagem-chave sobre a experiência da marca." },
                    },
                    required: ['product', 'benefit', 'brand'],
                },
                contentPillars: {
                    type: Type.ARRAY,
                    description: "Os 3 principais temas sobre os quais a marca fala.",
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
      Sua função é transformar a estratégia da marca em um sistema de comunicação verbal que seja consistente, escalável e eficaz para vendas.

      **TAREFA:** Sua missão é construir a "Identidade Verbal (Como Falamos)". Com base na estratégia da Parte 1, CRIE e DEFINA como a marca deve soar para o mundo. Você deve preencher TODOS os campos obrigatórios do schema JSON com conteúdo criativo e alinhado à estratégia, usando a Parte 1 como sua principal fonte de inspiração.

      **PROCESSO DE PENSAMENTO ESTRUTURADO (SIMULAÇÃO):**
      Antes de gerar a resposta final em JSON, você DEVE simular seu processo de pensamento. Apresente cada etapa em uma nova linha, formatada EXATAMENTE como: \`THINKING: [Descrição da etapa]\`. Gere de 3 a 5 etapas.
      Exemplos:
      THINKING: Traduzindo os arquétipos da marca em uma personalidade de voz descritiva.
      THINKING: Definindo tons de voz específicos para cenários de Vendas, Suporte e Conteúdo.
      THINKING: Criando um slogan que encapsula a declaração de posicionamento.
      THINKING: Derivando pilares de conteúdo a partir dos valores e da missão da marca.
      THINKING: Compilando as diretrizes verbais no formato JSON solicitado.

      **REGRAS CRÍTICAS:**
      1.  **FORMATO:** Sua resposta DEVE ser um objeto JSON válido que corresponda exatamente ao schema fornecido, e NADA MAIS.

      --- ANÁLISE DA EMPRESA (FONTE DA VERDADE) ---
      ${companyInfo.companyAnalysis || companyInfo.description}
      --- FIM DA ANÁLISE ---

      --- NÚCLEO DA MARCA APROVADO (PARTE 1) ---
      ${JSON.stringify(context.part1)}
      --- FIM DO NÚCLEO ---

      Traduza a estratégia da Parte 1 em diretrizes verbais claras. O tom de voz deve refletir os arquétipos.
    `;
    const stream = await ai.models.generateContentStream({
        model: "gemini-2.5-pro",
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
        name: { type: Type.STRING, description: "Nome descritivo da cor." },
        hex: { type: Type.STRING, description: "Código hexadecimal da cor (ex: #FFFFFF)." },
    },
    required: ['name', 'hex'],
};
const fontSchema = {
    type: Type.OBJECT,
    properties: {
        font: { type: Type.STRING, description: "Nome da fonte (ex: 'Poppins')." },
        usage: { type: Type.STRING, description: "Onde usar esta fonte (ex: Títulos, Corpo de texto)." },
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
                        description: { type: Type.STRING, description: "Descrição conceitual do logotipo." },
                        prompt: { type: Type.STRING, description: "Prompt para geração de imagem de IA. Deixe uma string vazia se não for aplicável." },
                    },
                    required: ['description', 'prompt'],
                },
                colorPalette: {
                    type: Type.OBJECT,
                    properties: {
                        primary: { type: Type.ARRAY, items: colorSchema, description: "Cores principais da marca." },
                        secondary: { type: Type.ARRAY, items: colorSchema, description: "Cores secundárias de apoio." },
                        neutral: { type: Type.ARRAY, items: colorSchema, description: "Cores neutras (tons de cinza, etc.)." },
                        highlights: { type: Type.ARRAY, items: colorSchema, description: "Cores de destaque para CTAs." },
                    },
                    required: ['primary', 'secondary', 'neutral', 'highlights'],
                },
                typography: {
                    type: Type.OBJECT,
                    properties: {
                        primary: { ...fontSchema, description: "Fonte principal, geralmente para títulos." },
                        secondary: { ...fontSchema, description: "Fonte secundária, geralmente para corpo de texto." },
                        hierarchy: {
                            type: Type.OBJECT,
                            properties: {
                                h1: { type: Type.STRING, description: "Estilo do Título Principal (H1)." },
                                h2: { type: Type.STRING, description: "Estilo do Subtítulo (H2)." },
                                body: { type: Type.STRING, description: "Estilo do Corpo de Texto." },
                            },
                            required: ['h1', 'h2', 'body'],
                        }
                    },
                    required: ['primary', 'secondary', 'hierarchy'],
                },
                photographyStyle: {
                    type: Type.OBJECT,
                    properties: {
                        description: { type: Type.STRING, description: "Descrição do estilo fotográfico da marca." },
                        imagePrompts: { type: Type.ARRAY, description: "Exatamente 3 prompts para gerar imagens de exemplo.", items: { type: Type.STRING } },
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
    let logoInstruction: string;
    if (companyInfo.uploadedLogoAnalysis) {
        logoInstruction = `O usuário enviou um logotipo. Use a análise do logotipo fornecida como a fonte da verdade para a identidade visual. A descrição do logo DEVE ser a da análise. A paleta de cores DEVE ser a da análise. O 'prompt' do logo deve ser uma string vazia.`;
    } else if (companyInfo.logoUrl) {
        logoInstruction = `A empresa já possui um logotipo online. Descreva-o objetivamente na descrição, explicando seu conceito. O 'prompt' do logo deve ser uma string vazia. Crie uma paleta de cores coesa baseada neste logo e na identidade da marca.`;
    } else {
        logoInstruction = `A empresa precisa de um logotipo. Crie uma descrição conceitual e um 'prompt' detalhado para gerar uma imagem de IA. Crie uma paleta de cores do zero, alinhada com a estratégia e arquétipos da marca.`;
    }

    const prompt = `
      # PERSONA: Consultor Estratégico de Marcas IA
      Você entende que o design não é arte, é comunicação visual a serviço da estratégia. A identidade visual precisa ser consistente e funcional para o negócio.

      **TAREFA:** Sua missão é CRIAR e DEFINIR um universo visual coeso para a "Identidade Visual (Como Nos Mostramos)", traduzindo a estratégia (Parte 1) e a voz (Parte 2) em elementos visuais. Você deve preencher TODOS os campos obrigatórios do schema JSON.

      **PROCESSO DE PENSAMENTO ESTRUTURADO (SIMULAÇÃO):**
      Antes de gerar a resposta final em JSON, você DEVE simular seu processo de pensamento. Apresente cada etapa em uma nova linha, formatada EXATAMENTE como: \`THINKING: [Descrição da etapa]\`. Gere de 3 a 5 etapas.
      Exemplos:
      THINKING: Elaborando o conceito do logotipo com base na instrução específica e nos arquétipos.
      THINKING: Construindo uma paleta de cores funcional que reflete a personalidade da marca.
      THINKING: Selecionando uma combinação de fontes (tipografia) que seja legível e alinhada à identidade.
      THINKING: Definindo um estilo fotográfico e criando 3 prompts de imagem para exemplificar.
      THINKING: Compilando os elementos visuais no formato JSON solicitado.

      **REGRAS CRÍTICAS:**
      1.  **FOTOGRAFIA:** Você DEVE gerar 3 prompts de imagem distintos e criativos no campo 'imagePrompts'.
      2.  **FORMATO:** Sua resposta DEVE ser um objeto JSON válido que corresponda exatamente ao schema fornecido, e NADA MAIS.

      --- CONTEXTO DA MARCA (PARTES 1 E 2 APROVADAS) ---
      ${JSON.stringify(context)}
      --- FIM DO CONTEXTO ---

      ${companyInfo.uploadedLogoAnalysis ? `--- ANÁLISE DO LOGOTIPO ENVIADO (FONTE DA VERDADE VISUAL) ---
      ${JSON.stringify(companyInfo.uploadedLogoAnalysis)}
      --- FIM DA ANÁLISE DO LOGOTIPO ---` : ''}

      **Instrução Específica para o Logo:** ${logoInstruction}
      
      Pense como um gestor de marca: a paleta de cores deve ser funcional? A tipografia é legível? O estilo de fotografia atrai o público-alvo correto?
    `;
    const stream = await ai.models.generateContentStream({
        model: "gemini-2.5-pro",
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
        name: { type: Type.STRING, description: "Nome fictício da persona." },
        story: { type: Type.STRING, description: "Breve história ou biografia da persona." },
        pains: { type: Type.STRING, description: "As dores e desafios que a persona enfrenta." },
        goals: { type: Type.STRING, description: "Os objetivos e sonhos da persona." },
        informationSources: { type: Type.STRING, description: "Onde a persona busca informação." },
        howWeHelp: { type: Type.STRING, description: "Como a marca ajuda a persona a superar suas dores e alcançar seus objetivos." },
    },
    required: ['name', 'story', 'pains', 'goals', 'informationSources', 'howWeHelp'],
};
const journeyStageSchema = {
    type: Type.OBJECT,
    properties: {
        description: { type: Type.STRING, description: "O que o cliente faz ou pensa nesta fase." },
        goal: { type: Type.STRING, description: "Nosso objetivo de marketing para esta fase." },
    },
    required: ['description', 'goal']
};
const channelSchema = {
    type: Type.OBJECT,
    properties: {
        channel: { type: Type.STRING, description: "O canal de comunicação (ex: Instagram, E-mail Marketing)." },
        mainPurpose: { type: Type.STRING, description: "O principal propósito do canal." },
        audience: { type: Type.STRING, description: "Com quem falamos neste canal." },
        successMetrics: { type: Type.STRING, description: "Como medimos o sucesso neste canal." },
    },
    required: ['channel', 'mainPurpose', 'audience', 'successMetrics'],
};
const part4Schema = {
    type: Type.OBJECT,
    properties: {
        part4: {
            type: Type.OBJECT,
            properties: {
                personas: { type: Type.ARRAY, description: "Exatamente 2 personas detalhadas.", items: personaSchema },
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
                channelMatrix: { type: Type.ARRAY, description: "Mínimo de 3 canais de comunicação.", items: channelSchema },
            },
            required: ['personas', 'customerJourney', 'channelMatrix'],
        }
    },
    required: ['part4']
};


export const generateBrandboardPart4 = async (companyInfo: ValidationData, context: any, onChunk: (text: string) => void, onProgress?: (message: string) => void) => {
    onProgress?.('Etapa 4 de 4: Mapeando a estratégia de canal...');
    const prompt = `
      # PERSONA: Consultor Estratégico de Marcas IA
      Sua função é conectar a estratégia da marca a um plano de ação focado em resultados de negócio. O objetivo não é estar em todos os lugares, mas nos lugares certos.

      **TAREFA:** Sua missão final é CRIAR e DEFINIR a "Estratégia de Canal (Onde Atuamos)". Com base em todo o brandboard, desenvolva um plano de marketing e vendas de alto nível, preenchendo TODOS os campos obrigatórios do schema JSON com personas detalhadas e estratégias de canal realistas.

      **PROCESSO DE PENSAMENTO ESTRUTURADO (SIMULAÇÃO):**
      Antes de gerar a resposta final em JSON, você DEVE simular seu processo de pensamento. Apresente cada etapa em uma nova linha, formatada EXATAMENTE como: \`THINKING: [Descrição da etapa]\`. Gere de 3 a 5 etapas.
      Exemplos:
      THINKING: Desenvolvendo duas personas detalhadas a partir da definição de público-alvo.
      THINKING: Mapeando a jornada do cliente, da descoberta à fidelização, com objetivos claros para cada etapa.
      THINKING: Selecionando os canais de comunicação mais eficazes para alcançar as personas.
      THINKING: Definindo métricas de sucesso realistas para cada canal na matriz.
      THINKING: Compilando o plano de canais no formato JSON solicitado.

      **REGRAS CRÍTICAS:**
      1.  **PERSONAS E CANAIS:** Você DEVE criar exatamente 2 personas detalhadas e sugerir um mínimo de 3 canais de comunicação realistas.
      2.  **FORMATO:** Sua resposta DEVE ser um objeto JSON válido que corresponda exatamente ao schema fornecido, e NADA MAIS.

      --- BRANDBOARD COMPLETO (PARTES 1, 2, 3 APROVADAS) ---
      ${JSON.stringify(context)}
      --- FIM DO BRANDBOARD ---

      Sua função é traduzir o brandboard em um plano prático.
    `;
    const stream = await ai.models.generateContentStream({
        model: "gemini-2.5-pro",
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


export const generateImage = async (prompt: string, type: 'logo' | 'moodboard' = 'moodboard'): Promise<string> => {
    let finalPrompt = prompt;
    if (type === 'logo') {
        finalPrompt = `Logotipo vetorial minimalista, fundo branco, design limpo, alta resolução, 4k. ${prompt}`;
    } else {
        finalPrompt = `Fotografia cinematográfica, altíssima qualidade. ${prompt}`;
    }
    
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: finalPrompt,
        config: {
          outputMimeType: 'image/png',
          numberOfImages: 1,
          aspectRatio: '1:1',
        }
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
        return response.generatedImages[0].image.imageBytes;
    }
    throw new Error('A geração de imagem falhou.');
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
      config: {
          responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return part.inlineData.data;
        }
    }
    throw new Error('A edição de imagem falhou em produzir um resultado.');
};

export const regenerateFieldText = async (
    companyInfo: ValidationData,
    fullBrandboardData: Partial<BrandboardData>,
    fieldKey: string, 
    currentValue: string,
    comment?: string
): Promise<string> => {
    const prompt = `
      # PERSONA: Consultor Estratégico de Marcas IA (em modo colaborativo)
      Você está em uma sessão de consultoria com um empreendedor, ajustando o brandboard em tempo real. Sua atitude é de parceria, buscando a melhor solução juntos.

      **TAREFA:** O empreendedor pediu para você refinar um campo específico do brandboard. Sua missão é usar todo o contexto da marca para aprimorar o texto solicitado, garantindo coerência e impacto.

      --- CONTEXTO COMPLETO DA MARCA (ATÉ O MOMENTO) ---
      Análise Inicial da Empresa: ${companyInfo.companyAnalysis || companyInfo.description}
      Brandboard (com edições do usuário): ${JSON.stringify(fullBrandboardData)}
      --- FIM DO CONTEXTO ---

      **CAMPO A SER REFINADO:** "${fieldKey}"

      **TEXTO ATUAL (BASE DO USUÁRIO):**
      "${currentValue}"

      ${comment ? `**INSTRUÇÕES DO EMPENDEDOR (sua diretriz principal):**
      "${comment}"` : '**AVISO:** O usuário não deixou comentário. Sua tarefa é refinar o texto para que fique mais profissional e alinhado com a estratégia, mantendo a intenção original.'}

      **SUA RESPOSTA:**
      Sua resposta deve ser APENAS o novo texto aprimorado para o campo "${fieldKey}". Seja conciso e mantenha a consistência. Não adicione aspas, explicações ou qualquer outra formatação. Apenas o texto puro. Se o campo for um objeto JSON ou array, retorne o JSON correspondente.
    `;
    const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt
    });
    return response.text.trim();
};

export const refineSubsequentFields = async (
    fullBrandboardData: Partial<BrandboardData>,
    approvedFieldKey: string,
    approvedFieldValue: any,
    fieldsToRefine: Record<string, any>
): Promise<Record<string, any>> => {
    const prompt = `
      # PERSONA: Consultor Estratégico de Marcas IA (em modo proativo)
      Você está construindo o brandboard. O empreendedor acabou de aprovar uma parte importante, e agora você precisa garantir que as próximas seções estejam perfeitamente alinhadas com essa decisão para manter a integridade estratégica.

      **TAREFA:** O usuário APROVOU o campo "${approvedFieldKey}". O conteúdo aprovado é:
      --- CONTEÚDO APROVADO ---
      ${JSON.stringify(approvedFieldValue, null, 2)}
      --- FIM DO CONTEÚDO APROVADO ---

      Agora, sua missão é revisar os campos SEGUINTES do brandboard para garantir que eles reflitam essa nova informação aprovada. Analise cada campo e, se necessário, reescreva-o para criar uma narrativa de marca 100% coesa e consistente.

      --- CONTEXTO GERAL DA MARCA (incluindo a aprovação recente) ---
      ${JSON.stringify(fullBrandboardData, null, 2)}
      --- FIM DO CONTEXTO GERAL ---

      --- CAMPOS PARA REVISAR E REFINAR (valores atuais) ---
      ${JSON.stringify(fieldsToRefine, null, 2)}
      --- FIM DOS CAMPOS PARA REVISAR ---

      **SUA RESPOSTA:**
      Sua resposta DEVE ser um objeto JSON válido, e NADA MAIS, começando com \`\`\`json e terminando com \`\`\`.
      Este objeto deve conter APENAS as chaves dos campos que você alterou. Se um campo já estiver alinhado e não precisar de mudanças, NÃO o inclua na sua resposta.
      O formato do valor de cada chave deve corresponder ao formato original (string, array, objeto, etc.).
    `;

    const stream = await ai.models.generateContentStream({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: {
            temperature: 0.2,
            maxOutputTokens: 8192,
        }
    });

    let fullText = '';
    for await (const chunk of stream) {
        if(chunk.text) {
          fullText += chunk.text;
        }
    }

    return parseJsonFromText(fullText);
};