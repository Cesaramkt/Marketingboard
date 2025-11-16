import React, { useState, useEffect } from 'react';
import type { ValidationData, BrandboardData } from '../types';
import { regenerateFieldText, generateImage, refineSubsequentFields } from '../services/geminiService';

interface StepResultDisplayProps {
  title: string;
  stepData: any;
  stepNumber: number;
  validationData: ValidationData;
  brandboardData: Partial<BrandboardData>;
  onConfirm: (updatedData: any, generatedLogo?: string | null) => void;
  onBack: () => void;
}

const SpinnerIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
)

const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);


// FIX: Corrected the type for TOPIC_CONFIG to match its nested structure.
const TOPIC_CONFIG: Record<string, Record<string, { label: string; description: string }>> = {
    part1: {
        purpose: { label: "Propósito (O Porquê)", description: "Por que esta empresa existe (além de ganhar dinheiro)? Qual problema maior ela se propõe a resolver no mundo?" },
        mission: { label: "Missão (O Que Fazemos)", description: "O que fazemos, para quem fazemos e como fazemos, de forma clara e objetiva." },
        vision: { label: "Visão (Onde Queremos Chegar)", description: "Qual é o nosso objetivo de longo prazo? Onde nos vemos em 5 ou 10 anos?" },
        values: { label: "Valores (Nossos Princípios Guia)", description: "Quais são as 3 a 5 regras inegociáveis do nosso comportamento? Como tratamos nossos clientes, nossa equipe e nosso trabalho?" },
        archetypes: { label: "Arquétipos de Marca", description: "Se a nossa marca fosse uma pessoa, qual seria sua personalidade dominante?" },
        audienceAndPositioning: { label: "Análise de Público e Posicionamento", description: "Esta seção define nosso lugar no mercado e para quem estamos falando." },
    },
    part2: {
        voicePersonality: { label: "Personalidade da Voz", description: "Quais adjetivos descrevem nossa voz? (Ex: 'Confiante', 'Didática', 'Acolhedora', 'Divertida')" },
        toneOfVoiceApplication: { label: "Tom de Voz (A Aplicação da Voz)", description: "A voz é a nossa personalidade (constante); o tom é o nosso humor (varia com o contexto)." },
        practicalGuidelines: { label: "Diretrizes Práticas (Somos / Não Somos)", description: "Um guia rápido para quem escreve em nome da marca." },
        slogan: { label: "Slogan / Tagline", description: "A frase curta que resume nossa promessa." },
        keyMessages: { label: "Mensagens-Chave", description: "As 3 ideias principais que queremos que nosso público sempre se lembre sobre nós." },
        contentPillars: { label: "Pilares de Conteúdo", description: "Sobre o que falamos? Quais são os 3 grandes temas que dominamos?" },
    },
    part3: {
        logo: { label: "Logotipo", description: "O símbolo principal da nossa marca." },
        colorPalette: { label: "Paleta de Cores", description: "Nossas cores proprietárias." },
        typography: { label: "Tipografia (Fontes)", description: "Como nossas palavras aparecem." },
        photographyStyle: { label: "Estilo Fotográfico", description: "O tipo de imagem que usamos." },
    },
    part4: {
        personas: { label: "Definição de Personas (Público Detalhado)", description: "Um mergulho profundo no nosso cliente ideal." },
        customerJourney: { label: "Jornada do Cliente Simplificada", description: "Como o cliente nos descobre e se relaciona conosco." },
        channelMatrix: { label: "Matriz de Canais de Comunicação", description: "Quais canais usamos e por quê?" },
    }
};


const APPROVABLE_TOPICS: Record<number, string[]> = {
    1: ['purpose', 'mission', 'vision', 'values', 'archetypes', 'audienceAndPositioning'],
    2: ['voicePersonality', 'toneOfVoiceApplication', 'practicalGuidelines', 'slogan', 'keyMessages', 'contentPillars'],
    3: ['logo', 'colorPalette', 'typography', 'photographyStyle'],
    4: ['personas', 'customerJourney', 'channelMatrix'],
};

const ensureArray = <T,>(value: T | T[] | undefined | null): T[] => {
    if (Array.isArray(value)) {
        return value;
    }
    if (value) {
        return [value];
    }
    return [];
};


export const StepResultDisplay: React.FC<StepResultDisplayProps> = ({ title, stepData, stepNumber, validationData, brandboardData, onConfirm, onBack }) => {
    const [editableData, setEditableData] = useState(stepData);
    const [regeneratingField, setRegeneratingField] = useState<string | null>(null);
    const [refiningTopics, setRefiningTopics] = useState<string[]>([]);
    const [generatedLogo, setGeneratedLogo] = useState<string | null>(null);
    const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
    const [isLogoModalVisible, setIsLogoModalVisible] = useState(false);
    
    const [approvals, setApprovals] = useState<Record<string, boolean>>({});
    const [comments, setComments] = useState<Record<string, string>>({});

    useEffect(() => {
        setEditableData(stepData);
        setApprovals({});
        setComments({});
    }, [stepData]);
    
    const currentApprovableTopics = APPROVABLE_TOPICS[stepNumber] || [];
    const allApproved = currentApprovableTopics.every(topic => !!approvals[topic] || !editableData[topic]); 

    const updateEditableData = (path: string, value: any) => {
        setEditableData(prevData => {
            const dataCopy = JSON.parse(JSON.stringify(prevData));
            const keys = path.split('.');
            let current = dataCopy;
            for (let i = 0; i < keys.length - 1; i++) {
                if (current[keys[i]] === undefined) current[keys[i]] = {};
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return dataCopy;
        });
    };
    
    const handleCommentChange = (topicKey: string, text: string) => {
        setComments(prev => ({ ...prev, [topicKey]: text }));
    };

    const handleApprove = async (topicKey: string) => {
        const isCurrentlyApproved = !!approvals[topicKey];
        const newApprovals = { ...approvals, [topicKey]: !isCurrentlyApproved };
        setApprovals(newApprovals);
    
        // Se estamos APROVANDO um tópico (e não desaprovando)
        if (!isCurrentlyApproved) {
            const currentStepKey = `part${stepNumber}`;
            // Criar um contexto que inclui o dado que está sendo editado agora
            const fullContext = { ...brandboardData, [currentStepKey]: editableData };
    
            const approvableTopics = APPROVABLE_TOPICS[stepNumber] || [];
            const approvedTopicIndex = approvableTopics.indexOf(topicKey);
    
            if (approvedTopicIndex === -1) return;
    
            const subsequentUnapprovedTopics = approvableTopics
                .slice(approvedTopicIndex + 1)
                .filter(key => !newApprovals[key] && editableData[key] !== undefined);
    
            if (subsequentUnapprovedTopics.length > 0) {
                setRefiningTopics(subsequentUnapprovedTopics);
                try {
                    const approvedValue = editableData[topicKey];
                    const fieldsToRefine = subsequentUnapprovedTopics.reduce((acc, key) => {
                        acc[key] = editableData[key];
                        return acc;
                    }, {} as Record<string, any>);
    
                    const updatedFields = await refineSubsequentFields(
                        fullContext,
                        topicKey,
                        approvedValue,
                        fieldsToRefine
                    );
                    
                    // Atualiza o estado com os dados refinados
                    Object.entries(updatedFields).forEach(([key, value]) => {
                        updateEditableData(key, value);
                    });
    
                } catch (error) {
                    console.error("Failed to auto-refine subsequent topics:", error);
                    // Não incomoda o usuário com um alerta para uma tarefa em segundo plano
                } finally {
                    setRefiningTopics([]);
                }
            }
        }
    };
    
    const handleApproveAll = () => {
        const newApprovals: Record<string, boolean> = {};
        currentApprovableTopics.forEach(topicKey => {
            if (editableData[topicKey] !== undefined) {
                newApprovals[topicKey] = true;
            }
        });
        setApprovals(newApprovals);
    };

    const handleConfirmClick = () => {
        const unapprovedTopics = currentApprovableTopics.filter(topic => !!editableData[topic] && !approvals[topic]);
        if (unapprovedTopics.length > 0) {
            const unapprovedLabels = unapprovedTopics.map(t => TOPIC_CONFIG[`part${stepNumber}`]?.[t]?.label || t).join(', ');
            alert(`Por favor, aprove os seguintes tópicos antes de avançar: ${unapprovedLabels}`);
            return;
        }
        onConfirm(editableData, generatedLogo);
    };


    const handleRegenerate = async (fieldPath: string, topicKey: string, currentValue: any) => {
        setRegeneratingField(topicKey);
        const userComment = comments[topicKey];
        try {
            const currentStepKey = `part${stepNumber}`;
            const fullContext = {
                ...brandboardData,
                [currentStepKey]: editableData,
            };

            const newText = await regenerateFieldText(
                validationData,
                fullContext,
                fieldPath,
                JSON.stringify(currentValue),
                userComment
            );
            
            try {
                const parsed = JSON.parse(newText);
                updateEditableData(topicKey, parsed);
            } catch (e) {
                updateEditableData(topicKey, newText);
            }

        } catch (error) {
            console.error("Failed to regenerate text:", error);
            alert("Não foi possível gerar um novo texto. Tente novamente.");
        } finally {
            setRegeneratingField(null);
            setApprovals(prev => ({...prev, [topicKey]: true}));
        }
    };

    const handleGenerateLogo = async () => {
        setIsGeneratingLogo(true);
        try {
            const prompt = editableData?.logo?.prompt || `Logotipo para uma empresa chamada "${validationData.companyName}". Conceito: ${editableData.logo.description}.`;
            const logo = await generateImage(prompt, 'logo');
            setGeneratedLogo(logo);
        } catch (error) {
            console.error("Failed to generate logo:", error);
            alert("Falha ao gerar o logotipo.");
        } finally {
            setIsGeneratingLogo(false);
        }
    };
    
    const renderTopic = (topicKey: string, contentRenderer: () => React.ReactNode) => {
        if (!editableData || editableData[topicKey] === undefined) return null;

        const topicInfo = TOPIC_CONFIG[`part${stepNumber}`]?.[topicKey] || { label: topicKey, description: ''};
        const isApproved = !!approvals[topicKey];
        const isRegenerating = regeneratingField === topicKey;
        const isRefining = refiningTopics.includes(topicKey);
        const hasComment = !!(comments[topicKey] || '').trim();

        return (
            <div key={topicKey} className={`relative mb-8 p-4 rounded-xl transition-all duration-300 ${isApproved ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'} border`}>
                {isRefining && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
                        <div className="flex flex-col items-center">
                            <SpinnerIcon className="h-6 w-6 text-purple-500" />
                            <p className="text-sm text-purple-600 mt-2 font-medium">Ajustando com base na sua aprovação...</p>
                        </div>
                    </div>
                )}
                <h2 className="text-xl font-semibold text-purple-700">{topicInfo.label}</h2>
                <p className="text-sm text-gray-500 mb-3">{topicInfo.description}</p>
                <div className="prose max-w-none text-gray-800 leading-relaxed mb-4">
                    {contentRenderer()}
                </div>
                <div className="mt-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                     <textarea
                        placeholder="Gostou, mas quer ajustar? Deixe um comentário para a IA..."
                        value={comments[topicKey] || ''}
                        onChange={(e) => handleCommentChange(topicKey, e.target.value)}
                        className="w-full text-sm bg-white p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-purple-400"
                        rows={2}
                        disabled={isRegenerating}
                    />
                    <div className="flex items-center justify-end gap-3 mt-2">
                         <button
                            onClick={() => handleRegenerate(`part${stepNumber}.${topicKey}`, topicKey, editableData[topicKey])}
                            disabled={isRegenerating || !hasComment}
                            title={!hasComment ? "Deixe um comentário para ativar a reescrita" : "Reescrever usando seu comentário como guia"}
                            className="flex items-center gap-2 text-sm bg-violet-100 text-violet-700 font-semibold py-2 px-4 rounded-lg hover:bg-violet-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isRegenerating ? <><SpinnerIcon className="h-4 w-4" />Reescrevendo...</> : 'Reescrever com IA'}
                        </button>
                        <button
                            onClick={() => handleApprove(topicKey)}
                            className={`flex items-center gap-2 text-sm font-semibold py-2 px-4 rounded-lg transition-colors ${
                                isApproved
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                            }`}
                        >
                             {isApproved ? <><CheckCircleIcon className="h-5 w-5" /> Aprovado</> : 'Aprovar'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };
    
    const renderStepContent = () => {
        if (!editableData) return <p>Carregando dados da etapa...</p>;
        switch (stepNumber) {
            case 1:
                return (<>
                    {renderTopic('purpose', () => <p>{editableData.purpose || '...'}</p>)}
                    {renderTopic('mission', () => <p>{editableData.mission || '...'}</p>)}
                    {renderTopic('vision', () => <p>{editableData.vision || '...'}</p>)}
                    {renderTopic('values', () => (
                      <ul className="list-disc pl-5 space-y-1">
                        {ensureArray(editableData.values).map((v: any, i) => (
                          <li key={i}>
                            {typeof v === 'object' && v !== null && (v.name || v.value) && v.description ? (
                              <><strong>{v.name || v.value}:</strong> {v.description}</>
                            ) : (
                              String(v || '...')
                            )}
                          </li>
                        ))}
                      </ul>
                    ))}
                    {renderTopic('archetypes', () => (<>
                        <p><strong>Arquétipo Primário:</strong> {editableData.archetypes?.primary || '...'}</p>
                        {editableData.archetypes?.secondary && <p><strong>Arquétipo Secundário:</strong> {editableData.archetypes.secondary || '...'}</p>}
                    </>))}
                    {renderTopic('audienceAndPositioning', () => (<div className="space-y-4">
                        <div>
                            <h4 className="font-semibold">Público-Alvo Principal:</h4>
                            <p className="text-xs text-gray-500 mb-1">Quem é o cliente ideal? (Demografia, Dores, Necessidades, Desejos)</p>
                            <p>{editableData.audienceAndPositioning?.targetAudience || '...'}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold">Concorrentes (Principais 3):</h4>
                            <p className="text-xs text-gray-500 mb-1">Quem são? O que eles fazem bem? Onde eles falham?</p>
                            <ul className="list-disc pl-5 space-y-1">{ensureArray(editableData.audienceAndPositioning?.competitors).map((c, i) => <li key={i}>{c || '...'}</li>)}</ul>
                        </div>
                        <div>
                            <h4 className="font-semibold">Diferenciais Competitivos (Proposta de Valor Única):</h4>
                            <p className="text-xs text-gray-500 mb-1">O que nos torna diferentes? Por que um cliente deveria nos escolher em vez do concorrente?</p>
                            <ul className="list-disc pl-5 space-y-1">{ensureArray(editableData.audienceAndPositioning?.differentiators).map((d, i) => <li key={i}>{d || '...'}</li>)}</ul>
                        </div>
                        <div>
                            <h4 className="font-semibold">Declaração de Posicionamento (Resumo):</h4>
                            <p className="text-xs text-gray-500 mb-1">(Ex: "Para microempreendedores de e-commerce, a 'Embala Rápido' é a fornecedora de caixas que oferece a entrega mais veloz, porque temos estoque local e um sistema de logística próprio.")</p>
                            <p className="italic">"{editableData.audienceAndPositioning?.positioningStatement || '...'}"</p>
                        </div>
                    </div>))}
                </>);
            case 2:
                 return (<>
                    {renderTopic('voicePersonality', () => <p>{editableData.voicePersonality}</p>)}
                    {renderTopic('toneOfVoiceApplication', () => (<>
                        <p><strong>Em um post de venda:</strong> {editableData.toneOfVoiceApplication?.sales}</p>
                        <p><strong>No Suporte ao Cliente:</strong> {editableData.toneOfVoiceApplication?.support}</p>
                        <p><strong>Em um post de blog (Conteúdo):</strong> {editableData.toneOfVoiceApplication?.content}</p>
                    </>))}
                    {renderTopic('practicalGuidelines', () => (<div className="grid grid-cols-2 gap-4">
                        <div>
                            <h4 className="font-semibold">Somos:</h4>
                            <ul className="list-disc pl-5 space-y-2">{ensureArray(editableData.practicalGuidelines?.weAre).map((item, i) => (
                                <li key={i}>
                                    <strong>{item.trait}:</strong> {item.description}
                                </li>
                            ))}</ul>
                        </div>
                        <div>
                            <h4 className="font-semibold">Não Somos:</h4>
                            <ul className="list-disc pl-5 space-y-2">{ensureArray(editableData.practicalGuidelines?.weAreNot).map((item, i) => (
                                <li key={i}>
                                    <strong>{item.trait}:</strong> {item.description}
                                </li>
                            ))}</ul>
                        </div>
                    </div>))}
                    {renderTopic('slogan', () => <p className="text-2xl font-bold italic text-center">"{editableData.slogan}"</p>)}
                    {renderTopic('keyMessages', () => (<>
                        <p><strong>Sobre o Produto/Serviço:</strong> {editableData.keyMessages?.product}</p>
                        <p><strong>Sobre o Benefício/Transformação:</strong> {editableData.keyMessages?.benefit}</p>
                        <p><strong>Sobre a Marca/Experiência:</strong> {editableData.keyMessages?.brand}</p>
                    </>))}
                    {renderTopic('contentPillars', () => (
                        <ul className="list-disc pl-5">
                            {ensureArray(editableData.contentPillars).map((p, i) => (
                                <li key={i}>
                                    <strong>{p.name}:</strong> {p.description || ''}
                                </li>
                            ))}
                        </ul>
                    ))}
                </>);
            case 3:
                 return (<>
                    {renderTopic('logo', () => (
                      <>
                        <p>{editableData.logo?.description}</p>
                        <div className="my-6 p-4 bg-white rounded-lg shadow-inner text-center border border-gray-200">
                            <h3 className="text-lg font-semibold text-purple-600 mb-4">Logotipo Principal</h3>
                            {isGeneratingLogo ? (
                                <div className="flex justify-center items-center h-32"><SpinnerIcon className="h-8 w-8 text-purple-500"/></div>
                            ) : generatedLogo ? (
                                <button onClick={() => setIsLogoModalVisible(true)} title="Clique para ampliar">
                                    <img src={`data:image/png;base64,${generatedLogo}`} alt="Logotipo Gerado" className="max-h-32 mx-auto cursor-pointer hover:opacity-80 transition-opacity" />
                                </button>
                            ) : validationData.uploadedLogoAnalysis ? (
                                <img src={validationData.generatedLogo} alt="Logotipo da Empresa" className="max-h-24 bg-white p-2 rounded-md mx-auto shadow"/>
                            ) : validationData.logoUrl ? (
                                <img src={validationData.logoUrl} alt="Logotipo da Empresa" className="max-h-24 bg-white p-2 rounded-md mx-auto shadow"/>
                            ) : (
                                <p className="text-gray-500">O logo gerado aparecerá aqui.</p>
                            )}
                             {!validationData.uploadedLogoAnalysis && (
                                <button onClick={handleGenerateLogo} disabled={isGeneratingLogo} className="mt-4 bg-violet-500 hover:bg-violet-600 text-white font-semibold py-2 px-5 rounded-lg shadow-sm transition-all duration-300 transform hover:scale-105 disabled:bg-gray-400">
                                    {isGeneratingLogo ? "Gerando..." : (generatedLogo || validationData.logoUrl) ? "Gerar Outra Opção" : "Gerar Logo com IA"}
                                </button>
                             )}
                        </div>
                      </>
                    ))}
                    {renderTopic('colorPalette', () => (
                        <div className="flex flex-wrap gap-4 justify-center">
                            {[
                                ...ensureArray(editableData.colorPalette?.primary),
                                ...ensureArray(editableData.colorPalette?.secondary),
                                ...ensureArray(editableData.colorPalette?.neutral),
                                ...ensureArray(editableData.colorPalette?.highlights)
                            ].map((color: {name: string, hex: string}, i) => (
                                <div key={i} className="text-center group">
                                    <div className="w-20 h-20 rounded-full border-4 border-gray-200 shadow-md" style={{backgroundColor: color.hex}}></div>
                                    <p className="mt-2 font-semibold text-sm">{color.name}</p>
                                    <p className="text-xs text-gray-500 uppercase">{color.hex}</p>
                                </div>
                            ))}
                        </div>
                    ))}
                    {renderTopic('typography', () => (
                        <div className="space-y-6">
                            {editableData.typography?.primary?.font && (
                                <div>
                                    <p className="text-4xl" style={{fontFamily: `'${editableData.typography.primary.font}', sans-serif`}}>Aa Bb Cc</p>
                                    <p className="mt-1 font-semibold">{editableData.typography.primary.font}</p>
                                    <p className="text-sm text-gray-500">{editableData.typography.primary.usage}</p>
                                </div>
                            )}
                            {editableData.typography?.secondary?.font && (
                                 <div>
                                    <p className="text-lg" style={{fontFamily: `'${editableData.typography.secondary.font}', serif`}}>O rápido cavalo marrom salta sobre o cão preguiçoso.</p>
                                    <p className="mt-1 font-semibold">{editableData.typography.secondary.font}</p>
                                     <p className="text-sm text-gray-500">{editableData.typography.secondary.usage}</p>
                                </div>
                            )}
                            {editableData.typography?.hierarchy && (
                                <div>
                                    <h4 className="font-semibold mt-4 text-gray-600">Hierarquia Sugerida:</h4>
                                    <p><strong>H1 (Título Principal):</strong> {editableData.typography.hierarchy.h1}</p>
                                    <p><strong>H2 (Subtítulo):</strong> {editableData.typography.hierarchy.h2}</p>
                                    <p><strong>Corpo de Texto:</strong> {editableData.typography.hierarchy.body}</p>
                                </div>
                            )}
                        </div>
                    ))}
                    {renderTopic('photographyStyle', () => <p>{editableData.photographyStyle?.description}</p>)}
                </>);
            case 4:
                return (
                    <>
                    {renderTopic('personas', () => 
                        ensureArray(editableData.personas).map((p: any, i) => (
                            <div key={i} className="mb-4 border-b pb-4 last:border-b-0">
                                <h4 className="font-bold text-lg">{p.name}</h4>
                                <p><strong>História:</strong> {p.story}</p>
                                <p><strong>Dores/Desafios:</strong> {p.pains}</p>
                                <p><strong>Objetivos/Sonhos:</strong> {p.goals}</p>
                                <p><strong>Onde busca informação:</strong> {p.informationSources}</p>
                                <p><strong>Como nossa marca a ajuda:</strong> {p.howWeHelp}</p>
                            </div>
                        ))
                    )}
                     {renderTopic('customerJourney', () => (
                        <div className="space-y-3">
                            <div><h4 className="font-semibold">Descoberta (Topo do Funil)</h4><p><strong>O que acontece:</strong> {editableData.customerJourney?.discovery.description} <br/> <strong>Nosso objetivo:</strong> {editableData.customerJourney?.discovery.goal}</p></div>
                            <div><h4 className="font-semibold">Consideração (Meio do Funil)</h4><p><strong>O que acontece:</strong> {editableData.customerJourney?.consideration.description} <br/> <strong>Nosso objetivo:</strong> {editableData.customerJourney?.consideration.goal}</p></div>
                            <div><h4 className="font-semibold">Decisão (Fundo do Funil)</h4><p><strong>O que acontece:</strong> {editableData.customerJourney?.decision.description} <br/> <strong>Nosso objetivo:</strong> {editableData.customerJourney?.decision.goal}</p></div>
                            <div><h4 className="font-semibold">Fidelização (Pós-Venda)</h4><p><strong>O que acontece:</strong> {editableData.customerJourney?.loyalty.description} <br/> <strong>Nosso objetivo:</strong> {editableData.customerJourney?.loyalty.goal}</p></div>
                        </div>
                    ))}
                    {renderTopic('channelMatrix', () => (
                        <div className="space-y-4">
                            {ensureArray(editableData.channelMatrix).map((c: any, i) => (
                                <div key={i} className="p-3 bg-white rounded border">
                                    <h4 className="font-bold">{c.channel}</h4>
                                    <p><strong>Propósito Principal:</strong> {c.mainPurpose}</p>
                                    <p><strong>Público:</strong> {c.audience}</p>
                                    <p><strong>Métricas de Sucesso:</strong> {c.successMetrics}</p>
                                </div>
                            ))}
                        </div>
                    ))}
                    </>
                );
            default:
                return <p>Etapa desconhecida.</p>;
        }
    };

    return (
        <>
            {isLogoModalVisible && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={() => setIsLogoModalVisible(false)}>
                    <img src={`data:image/png;base64,${generatedLogo}`} alt="Logotipo Gerado Ampliado" className="max-w-[90vw] max-h-[90vh] object-contain" />
                </div>
            )}
            <div className="bg-white rounded-2xl p-6 sm:p-10 shadow-xl">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
                    {stepNumber === 1 && <p className="text-lg text-gray-700 mt-2">Esta é a nossa fundação. É o "porquê" por trás do "o quê".</p>}
                    <p className="text-gray-600 max-w-2xl mx-auto mt-2">Aprove cada tópico para continuar. Se precisar de ajustes, deixe um comentário e peça para a IA reescrever.</p>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-8">
                    {renderStepContent()}
                </div>
                
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                    <button
                        onClick={onBack}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-6 rounded-lg shadow-sm transition-all duration-300 w-full sm:w-auto"
                    >
                        Voltar
                    </button>
                    {!allApproved && (
                        <button
                            onClick={handleApproveAll}
                            className="bg-green-100 hover:bg-green-200 text-green-700 font-semibold py-2 px-6 rounded-lg shadow-sm transition-all duration-300 w-full sm:w-auto"
                        >
                            Aprovar Todos
                        </button>
                    )}
                    <button
                        onClick={handleConfirmClick}
                        disabled={!allApproved}
                        className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:scale-100 w-full sm:w-auto"
                    >
                        Confirmar e Avançar
                    </button>
                </div>
            </div>
        </>
    );
};