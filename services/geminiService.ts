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
// ... existing extractSources function ...
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

// ... existing parseValidationData ...
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

// ... existing findCompanyCandidates ...
export const findCompanyCandidates = async (
  name: string,
  city: string,
  address?: string,
  site?: string,
  coords?: { latitude: number, longitude: number },
  instagram?: string,
): Promise<CompanyCandidate[]> => {
    const searchTerms = [name, city, address, site, instagram].filter(Boolean).join(', ');

    const prompt = `
      # PERSONA: Assistente de Pesquisa OSINT (Open Source Intelligence)
      Sua única missão é encontrar empresas candidatas com base nos dados do usuário e retornar uma lista estruturada. Você é metódico, preciso e entende a importância da localização e da presença digital.

      **TAREFA:** Encontre até 3 empresas que correspondam à busca abaixo, seguindo a hierarquia de regras.

      **TERMOS DE BUSCA PRINCIPAIS (Use isso para sua pesquisa):**
      "${searchTerms}"

      **DADOS FORNECIDOS PELO USUÁRIO (Contexto):**
      - Nome da Empresa: "${name}"
      - Cidade (Fonte da Verdade): "${city}"
      - Endereço (Opcional): "${address || 'Não fornecido'}"
      - Site (Opcional): "${site || 'Não fornecido'}"
      - Instagram (Opcional): "${instagram || 'Não fornecido'}"
      
      **REGRAS CRÍTICAS DE BUSCA E CLASSIFICAÇÃO (SIGA ESTA ORDEM):**
      1.  **PRIORIDADE 1 - CORRESPONDÊNCIA NA CIDADE:** A busca principal DEVE focar em encontrar a empresa "${name}" na cidade de "${city}".
      2.  **USO DO INSTAGRAM:** Se o usuário forneceu o Instagram "${instagram || ''}", use-o como uma "chave mestra" para confirmar a identidade da empresa. Pesquise pelo nome de usuário no Google para encontrar informações associadas (como endereço na bio ou site linkado).
      3.  **PRIORIDADE 2 - CORRESPONDÊNCIA FORA DA CIDADE:** Se a busca na cidade principal for inconclusiva, procure pela empresa "${name}" em outras localidades.
      4.  **PRIORIDADE 3 - SUGESTÕES INTELIGENTES:** Se as buscas anteriores falharem, encontre empresas com nomes semelhantes ou no mesmo segmento na cidade.
      5.  **LÓGICA DE PREENCHIMENTO:** Para cada candidato, preencha todos os campos do schema JSON. Se o endereço exato não estiver disponível, coloque a cidade.
      6.  **DESCRIÇÃO:** Extraia uma descrição concisa (1 frase) do site oficial, perfil do Google ou **Bio do Instagram**.
      
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

// ... existing getFullCompanyInfo ...
export const getFullCompanyInfo = async(candidate: CompanyCandidate): Promise<ValidationData> => {
    const searchTerms = [
        candidate.companyName,
        candidate.address !== 'Não encontrado' ? candidate.address : '',
        candidate.websiteUrl !== 'Não encontrado' ? candidate.websiteUrl : '',
        "Instagram",
        "Facebook"
    ].filter(Boolean).join(', ');

    const prompt = `
        Aja como um Diretor de Estratégia, especialista em OSINT. O usuário selecionou a empresa correta. Sua missão agora é aprofundar a pesquisa e extrair informações detalhadas sobre esta empresa específica.

        **TERMOS DE BUSCA PRINCIPAIS (Use-os para encontrar a empresa):**
        ${searchTerms}

        **EMPRESA CONFIRMADA PELO USUÁRIO (Contexto):**
        - Nome: ${candidate.companyName}
        - Endereço: ${candidate.address}
        - Website: ${candidate.websiteUrl}

        **TAREFA:** Conduza uma busca detalhada usando as ferramentas disponíveis para extrair as seguintes informações. 
        
        **ATENÇÃO AO INSTAGRAM:** Pesquise ativamente pelo perfil do Instagram da empresa se o usuário não forneceu. Se encontrar, extraia a URL. Muitas vezes a "descrição" real da empresa está na Bio do Instagram.

        **ESTRUTURA DA RESPOSTA (Use este formato exato):**
        Nome da Empresa: ${candidate.companyName}
        Descrição: [Descrição detalhada. Se o site for fraco, use a Bio do Instagram ou LinkedIn como base.]
        Endereço: [Endereço completo e verificado]
        Website: [URL do site oficial]
        Logo URL: [URL direta e funcional para a imagem do logotipo, preferencialmente de alta qualidade]
        Resumo das Avaliações: [Resumo de 1-2 frases do sentimento geral das avaliações dos clientes, seguido por um ou dois exemplos de avaliação real entre aspas.]
        Redes Sociais:
        - Instagram: [URL completa do perfil, se encontrado]
        - Facebook: [URL completa do perfil, se encontrado]
        - LinkedIn: [URL completa do perfil, se encontrado]
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
    data: { name: string, description: string, segment: string, city: string, country: string, benchmarks: string, investment: string }
): Promise<ValidationData> => {
    const prompt = `
      # PERSONA: Consultor Estratégico de Negócios e Marcas IA
      Sua função é transformar uma ideia bruta em um conceito de negócio ESTRUTURADO, REALISTA e INSPIRADOR. Você deve ser profissional, consciente e racional.

      **TAREFA:** Analise a ideia de negócio, o contexto de mercado e o NÍVEL DE INVESTIMENTO para desenvolver um briefing completo.

      **DADOS DO EMPENDEDOR:**
      - Nome da Ideia/Marca: ${data.name}
      - Descrição da Ideia: ${data.description}
      - Segmento de Mercado: ${data.segment}
      - Localização: ${data.city}, ${data.country}
      - Concorrentes/Inspirações: ${data.benchmarks}
      - **INVESTIMENTO INICIAL: ${data.investment} (FATOR CRÍTICO)**

      **PROCESSO DE ANÁLISE (Use Google Search):**
      1.  **Análise de Viabilidade Financeira:** Considere o investimento. Um valor baixo (ex: até R$5.000) implica um modelo de negócio enxuto (online-first, sem estoque físico, serviços digitais). Um valor alto permite estruturas mais complexas (loja física, equipe, etc.). Seja realista na sua proposta.
      2.  **Análise de Mercado:** Pesquise negócios similares no segmento e localização. Identifique tendências, concorrentes e oportunidades DENTRO DA REALIDADE FINANCEIRA.
      3.  **Desenvolvimento do Conceito:** Com base na análise, refine a ideia. A estratégia de distribuição DEVE ser compatível com o investimento.

      **EQUILÍBRIO ESTRATÉGICO:**
      Seja racional, mas não pessimista. Reconheça que um bom marketing pode acelerar o crescimento. O briefing deve equilibrar as restrições atuais com o potencial de crescimento futuro. Por exemplo: "Comece com um e-commerce focado em dropshipping (baixo investimento), mas construa uma marca forte para, no futuro, internalizar o estoque e abrir uma loja conceito."

      **ESTRUTURA DA RESPOSTA (JSON OBRIGATÓRIO):**
      Sua resposta DEVE ser um objeto JSON válido, e NADA MAIS. Preencha todos os campos com textos detalhados e profissionais.

      O JSON deve conter:
      - **companyName:** Um nome profissional e cativante para a marca.
      - **description:** Uma descrição de uma frase, poderosa e clara.
      - **businessBriefing:** Um objeto com os seguintes campos:
        - **productServiceIdea:** (Mínimo 2 parágrafos) Detalhe a proposta de valor. Que problema resolve? Como funciona? Qual o diferencial?
        - **distributionStrategy:** (Mínimo 2 parágrafos) Como o produto/serviço chegará ao cliente? Seja realista considerando o investimento.
        - **impactAndPotential:** (Mínimo 2 parágrafos) Qual o impacto esperado e o potencial de crescimento, considerando o equilíbrio entre realismo e ambição?
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
    
    const parsed = parseJsonFromText(response.text);

    return {
      companyName: parsed.companyName,
      description: parsed.description,
      businessBriefing: parsed.businessBriefing,
      initialInvestment: data.investment,
      companyAnalysis: `O usuário solicitou a criação de uma marca do zero com investimento de ${data.investment}. A IA desenvolveu o seguinte conceito de negócio:
      - Nome: ${parsed.companyName}
      - Conceito: ${parsed.description}
      - Ideia de Produto/Serviço: ${parsed.businessBriefing.productServiceIdea}
      - Estratégia de Distribuição: ${parsed.businessBriefing.distributionStrategy}
      - Impacto e Potencial: ${parsed.businessBriefing.impactAndPotential}
      A IA deve usar este briefing como base para todo o marketingboard.`,
      address: `${data.city}, ${data.country}`,
      logoUrl: '',
    };
}


// ... existing functions from here ...
const formatCompanyDataForDossier = (data: ValidationData): string => {
    const socialLinks = data.socialMediaLinks?.map(l => `- ${l.platform}: ${l.url}`).join('\n') || 'Não disponível.';
    const content = `
# Dossiê da Empresa: ${data.companyName}

## Informações de Validação
- **Nome:** ${data.companyName}
- **Descrição:** ${data.description}
- **Endereço:** ${data.address || 'Não informado'}
- **Website:** ${data.websiteUrl || 'Não informado'}

## Presença Online
- **URL do Logo:** ${data.logoUrl || 'Não informado'}
- **Redes Sociais:**
${socialLinks}

## Reputação (se disponível)
- **Resumo das Avaliações:** ${data.reviewsSummary || 'Nenhum resumo de avaliações encontrado.'}

## Análise do Logo (se disponível)
- **Descrição do Logo:** ${data.uploadedLogoAnalysis?.logoDescription || 'Nenhuma análise de logo disponível.'}
- **Paleta de Cores do Logo:** ${data.uploadedLogoAnalysis?.colorPalette?.primary.map(c => `${c.name} (${c.hex})`).join(', ') || 'N/A'}

Este documento é a fonte primária de verdade para a empresa "${data.companyName}".
`;
    return content.trim();
};

export const getCompanyAnalysis = async (companyInfo: ValidationData, onChunk?: (text: string) => void): Promise<{ analysisText: string, sources: Source[] }> => {
    const instagramLink = companyInfo.socialMediaLinks?.find(l => l.platform.toLowerCase().includes('instagram'))?.url;
    
    const searchTerms = [
        companyInfo.companyName,
        companyInfo.websiteUrl,
        companyInfo.address,
        instagramLink ? `Instagram ${companyInfo.companyName}` : null // Força busca no IG
    ].filter(Boolean).join(', ');
    
    const companyDossier = formatCompanyDataForDossier(companyInfo);

    const prompt = `
      # PERSONA: Consultor Estratégico de Marcas IA
      Sua função é transformar dados e insights em uma estrutura de marketing clara, lógica e acionável.

      **TAREFA:** Conduza uma pesquisa aprofundada sobre a empresa-alvo e traduza os dados brutos em um diagnóstico estratégico claro e acionável.

      **FONTE DE DADOS PRIMÁRIA (OBRIGATÓRIO):** 
      --- INÍCIO DO DOSSIÊ DA EMPRESA ---
      ${companyDossier}
      --- FIM DO DOSSIÊ DA EMPRESA ---

      **TERMOS DE BUSCA ADICIONAIS:**
      ${searchTerms}

      **PROCESSO DE ANÁLISE PROFUNDA (SEJA METÓDICO):**
      1.  **Análise de Reputação (Google Reviews):** Pesquise as avaliações no Google Meu Negócio. Resuma o sentimento, nota média e principais elogios/críticas.
      2.  **RASPAGEM SEMÂNTICA DO INSTAGRAM (CRÍTICO):** 
          *   Se houver um link do Instagram (${instagramLink || 'pesquise por um'}), USE A BUSCA DO GOOGLE para encontrar o conteúdo do perfil (Bio, legendas de posts recentes indexados, destaques).
          *   Analise a **Bio**: Como eles se descrevem em 150 caracteres? Isso revela o posicionamento imediato.
          *   Analise o **Conteúdo**: O que eles postam? Fotos de produto, bastidores, memes, conteúdo educativo?
          *   Analise a **Linguagem**: Eles usam emojis? O tom é sério ou descontraído?
      3.  **Análise do Site:** Mensagem principal e proposta de valor.
      4.  **Análise Visual:** Cores, estilo fotográfico e design observados no Instagram e Site.

      **PROCESSO DE PENSAMENTO ESTRUTURADO (SIMULAÇÃO):**
      Gere de 3 a 5 linhas de pensamento (PENSAMENTO: ...) antes da resposta final.
      Exemplo:
      PENSAMENTO: Acessando dados públicos do Instagram via busca para ler a Bio e entender a "vibe" da marca.
      PENSAMENTO: Cruzando a promessa da Bio do Instagram com as reclamações no Google Reviews para ver se há coerência.

      **ESTRUTURA DO SEU DIAGNÓSTICO (sua resposta DEVE seguir esta estrutura):**
      Use TÍTULOS EM MARKDOWN (##).

      ## Diagnóstico Rápido
      Um parágrafo de resumo que identifica o principal ponto forte e o principal gargalo.

      ## DNA da Marca (O que eles dizem ser)
      - Propósito Declarado: Baseado na Bio do Instagram e Site.
      - Solução Oferecida: O que vendem?

      ## Análise de Reputação e Mercado (O que os clientes dizem que eles são)
      - Pontuação Média (Google): Nota e quantidade.
      - Resumo das Avaliações: Sentimento geral.
      - Palavras-chave de Reputação: Termos recorrentes.
      - Elogios e Críticas: Listas de tópicos.

      ## Análise de Comunicação (Foco no Digital)
      - **Análise do Perfil (Instagram/Social):** Descreva o que foi encontrado na "raspagem" do perfil. A Bio é clara? O feed é vitrine ou conteúdo? 
      - **Tom de Voz:** Como falam nas legendas?
      - **Estilo Visual:** Estética observada.

      ## Síntese Estratégica
      - **Público-Alvo Real:** Para quem estão vendendo?
      - **Proposta de Valor Real:** O diferencial na prática.
      - **Aviso Profissional:** Recomendação final.
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
    const analysisText = fullText.split('\n').filter(line => !line.startsWith('PENSAMENTO:')).join('\n').trim();
    return { analysisText, sources };
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

const competitorSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "O nome do concorrente." },
        link: { type: Type.STRING, description: "Um link relevante (site, Google Maps, etc.)." },
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
                    description: "Definição estratégica do que a empresa vende.",
                    properties: {
                        category: { type: Type.STRING, description: "A categoria macro do serviço ou produto (ex: 'Moda Feminina', 'Consultoria Tributária')." },
                        description: { type: Type.STRING, description: "Descrição detalhada da oferta. Se for e-commerce, descreva o mix de produtos. Se for serviço, descreva a metodologia ou entrega." },
                        portfolioStructure: { type: Type.STRING, description: "Como a oferta é organizada (ex: 'Catálogo com 5k SKUs focado em cauda longa' ou 'Serviço único de alto valor agregado')." }
                    },
                    required: ['category', 'description', 'portfolioStructure']
                },
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
                            description: "Lista dos 3 principais concorrentes, cada um com nome e link.",
                            items: competitorSchema
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
            required: ['productStrategy', 'purpose', 'mission', 'vision', 'values', 'archetypes', 'audienceAndPositioning']
        }
    },
    required: ['part1']
};


export const generateBrandboardPart1 = async (companyInfo: ValidationData, onChunk: (text: string) => void, onProgress?: (message: string) => void) => {
    onProgress?.('Etapa 1 de 4: Gerando o núcleo da marca...');
    const prompt = `
      # PERSONA: Consultor Estratégico de Marcas IA
      Sua função é transformar dados e insights em uma estrutura de marketing clara, lógica e acionável. Você valoriza a clareza sobre a complexidade e a estratégia sobre a tática.

      **TAREFA:** Com base no diagnóstico inicial da empresa, sua missão é definir "O Núcleo da Marca (Quem Somos)". Esta é a fundação estratégica. CRIE e DEFINA o conteúdo para cada campo do schema JSON fornecido.

      **ATENÇÃO ESPECIAL: ESTRATÉGIA DE PRODUTO (productStrategy)**
      Você deve categorizar e descrever o que a empresa vende de forma inteligente.
      - Se for um E-commerce com milhares de itens: Não liste produtos. Descreva as categorias, a abrangência do mix e a lógica do catálogo.
      - Se for uma Empresa de Serviços: Descreva a metodologia, o tipo de entrega e a especialização.
      - O objetivo é que qualquer pessoa que leia entenda O QUE é vendido e COMO é vendido, seja 1 serviço ou 5000 produtos.

      ${companyInfo.companyAnalysis?.includes('criação de uma marca do zero') 
        ? `**MODO CRIAÇÃO:** Esta é uma marca nova. Use o nome e a descrição como inspiração para CRIAR um propósito, missão, visão, valores, arquétipos e um posicionamento de mercado convincente.`
        : `**MODO ESTRATEGISTA:** Atue como um diretor de estratégia. INTERPRETE profundamente o diagnóstico e, com base nele, CRIE e DEFINA o conteúdo para cada campo do schema JSON.`
      }
      
      **PROCESSO DE PENSAMENTO ESTRUTURADO (SIMULAÇÃO):**
      Antes de gerar a resposta final em JSON, você DEVE simular seu processo de pensamento. Apresente cada etapa em uma nova linha, formatada EXATAMENTE como: \`PENSAMENTO: [Descrição da etapa]\`.
      
      **INSTRUÇÃO ESPECÍFICA PARA CONCORRENTES:** Ao preencher o campo 'competitors', siga a lógica de proximidade geográfica e modelo de negócio (cidade > estado > nacional). Forneça links.

      **REGRAS CRÍTICAS:**
      1.  **FORMATO:** Sua resposta DEVE ser um objeto JSON válido que corresponda exatamente ao schema fornecido, e NADA MAIS.

      --- DIAGNÓSTICO DA EMPRESA (FONTE DA VERDADE) ---
      ${companyInfo.companyAnalysis || companyInfo.description}
      --- FIM DO DIAGNÓSTICO ---
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
      Antes de gerar a resposta final em JSON, você DEVE simular seu processo de pensamento. Apresente cada etapa em uma nova linha, formatada EXATAMENTE como: \`PENSAMENTO: [Descrição da etapa]\`. Gere de 3 a 5 etapas.
      Exemplos:
      PENSAMENTO: Traduzindo os arquétipos da marca em uma personalidade de voz descritiva.
      PENSAMENTO: Definindo tons de voz específicos para cenários de Vendas, Suporte e Conteúdo.
      PENSAMENTO: Criando um slogan que encapsula a declaração de posicionamento.
      PENSAMENTO: Derivando pilares de conteúdo a partir dos valores e da missão da marca.
      PENSAMENTO: Compilando as diretrizes verbais no formato JSON solicitado.

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
                        primary: { type: Type.ARRAY, items: colorSchema, description: "Exatamente 2 cores principais da marca." },
                        secondary: { type: Type.ARRAY, items: colorSchema, description: "Exatamente 3 cores secundárias de apoio." },
                    },
                    required: ['primary', 'secondary'],
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
        logoInstruction = `O usuário enviou um logotipo. Use a análise do logotipo fornecida como a fonte da verdade para a identidade visual. A descrição do logo DEVE ser a da análise. A paleta de cores DEVE ser inspirada na análise. O 'prompt' do logo deve ser uma string vazia.`;
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
      Antes de gerar a resposta final em JSON, você DEVE simular seu processo de pensamento. Apresente cada etapa em uma nova linha, formatada EXATAMENTE como: \`PENSAMENTO: [Descrição da etapa]\`. Gere de 3 a 5 etapas.
      Exemplos:
      PENSAMENTO: Elaborando o conceito do logotipo com base na instrução específica e nos arquétipos.
      PENSAMENTO: Construindo uma paleta de cores funcional com 2 cores primárias e 3 secundárias que reflita a personalidade da marca.
      PENSAMENTO: Selecionando uma combinação de fontes (tipografia) que seja legível e alinhada à identidade.
      PENSAMENTO: Definindo um estilo fotográfico e criando 3 prompts de imagem para exemplificar.
      PENSAMENTO: Compilando os elementos visuais no formato JSON solicitado.

      **REGRAS CRÍTICAS:**
      1.  **PALETA DE CORES:** Você DEVE gerar uma paleta com exatamente 2 cores primárias e 3 cores secundárias.
      2.  **FOTOGRAFIA:** Você DEVE gerar 3 prompts de imagem distintos e criativos no campo 'imagePrompts'.
      3.  **FORMATO:** Sua resposta DEVE ser um objeto JSON válido que corresponda exatamente ao schema fornecido, e NADA MAIS.

      --- CONTEXTO DA MARCA (PARTES 1 E 2 APROVADAS) ---
      ${JSON.stringify(context)}
      --- FIM DO CONTEXTO ---

      ${companyInfo.uploadedLogoAnalysis ? `--- ANÁLISE DO LOGOTIPO ENVIADO (FONTE DA VERDADE VISUAL) ---
      ${JSON.stringify(companyInfo.uploadedLogoAnalysis)}
      --- FIM DA ANÁLISE DO LOGOTIPO ---` : ''}

      **Instrução Específica para o Logo:** ${logoInstruction}
      
      Pense como um gestor de marca: a paleta de cores é funcional? A tipografia é legível? O estilo de fotografia atrai o público-alvo correto?
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
      Antes de gerar a resposta final em JSON, você DEVE simular seu processo de pensamento. Apresente cada etapa em uma nova linha, formatada EXATAMENTE como: \`PENSAMENTO: [Descrição da etapa]\`. Gere de 3 a 5 etapas.
      Exemplos:
      PENSAMENTO: Desenvolvendo duas personas detalhadas a partir da definição de público-alvo.
      PENSAMENTO: Mapeando a jornada do cliente, da descoberta à fidelização, com objetivos claros para cada etapa.
      PENSAMENTO: Selecionando os canais de comunicação mais eficazes para alcançar as personas.
      PENSAMENTO: Definindo métricas de sucesso realistas para cada canal na matriz.
      PENSAMENTO: Compilando o plano de canais no formato JSON solicitado.

      **REGRAS CRÍTICAS:**
      1.  **PERSONAS E CANAIS:** Você DEVE criar exatamente 2 personas detalhadas e sugerir um mínimo de 3 canais de comunicação realistas.
      2.  **FORMATO:** Sua resposta DEVE ser um objeto JSON válido que corresponda exatamente ao schema fornecido, e NADA MAIS.

      --- BRANDBOARD COMPLETO (PARTES 1, 2, 3 APROVADAS) ---
      ${JSON.stringify(context)}
      --- FIM DO BRANDBOARD ---

      Sua função é traduzir o brandboard em um plano prático.
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
      config: {
          responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates[0].content.parts) {
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
        model: "gemini-3-pro-preview",
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
        model: "gemini-3-pro-preview",
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