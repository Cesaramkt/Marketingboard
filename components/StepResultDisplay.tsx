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

const EditableField: React.FC<{
  as?: 'p' | 'h4' | 'li' | 'span' | 'strong' | 'div';
  value: string;
  onUpdate: (newValue: string) => void;
  className?: string;
}> = ({ as: Component = 'p', value, onUpdate, className = '' }) => {
  const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
    const newValue = e.currentTarget.textContent || '';
    if (newValue !== value) {
      onUpdate(newValue);
    }
  };

  return (
    <Component
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      dangerouslySetInnerHTML={{ __html: value }}
      className={`focus:outline-none focus:bg-gray-100 dark:focus:bg-slate-700/50 focus:ring-2 focus:ring-purple-400 rounded-sm px-1 -mx-1 ${className}`}
    />
  );
};

const TOPIC_CONFIG: Record<string, Record<string, { label: string; description: string }>> = {
    part1: {
        productStrategy: { label: "Estratégia de Produtos & Serviços", description: "A definição clara do que vendemos, nossa categoria e como nossa oferta é estruturada." },
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
    1: ['productStrategy', 'purpose', 'mission', 'vision', 'values', 'archetypes', 'audienceAndPositioning'],
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
            <div key={topicKey} className={`relative mb-8 p-6 rounded-xl transition-all duration-300 ${
                isApproved 
                ? 'bg-green-50/50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20' 
                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700'
            } border shadow-sm`}>
                {isRefining && (
                    <div className="absolute inset-0 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
                        <div className="flex flex-col items-center">
                            <SpinnerIcon className="h-6 w-6 text-purple-400" />
                            <p className="text-sm text-purple-600 dark:text-purple-300 mt-2 font-medium">Ajustando com base na sua aprovação...</p>
                        </div>
                    </div>
                )}
                <h2 className="text-xl font-semibold text-purple-600 dark:text-purple-400">{topicInfo.label}</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">{topicInfo.description}</p>
                <div className="prose prose-slate dark:prose-invert max-w-none text-gray-700 dark:text-slate-300 leading-relaxed mb-4">
                    {contentRenderer()}
                </div>
                <div className="mt-4 bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg border border-gray-200 dark:border-slate-600">
                     <textarea
                        placeholder="Gostou, mas quer ajustar? Deixe um comentário para a IA..."
                        value={comments[topicKey] || ''}
                        onChange={(e) => handleCommentChange(topicKey, e.target.value)}
                        className="w-full text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 p-2 rounded-md border border-gray-300 dark:border-slate-500 focus:ring-2 focus:ring-purple-500"
                        rows={2}
                        disabled={isRegenerating}
                    />
                    <div className="flex items-center justify-end gap-3 mt-2">
                         <button
                            onClick={() => handleRegenerate(`part${stepNumber}.${topicKey}`, topicKey, editableData[topicKey])}
                            disabled={isRegenerating || !hasComment}
                            title={!hasComment ? "Deixe um comentário para ativar a reescrita" : "Reescrever usando seu comentário como guia"}
                            className="flex items-center gap-2 text-sm bg-violet-50 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 font-semibold py-2 px-4 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isRegenerating ? <><SpinnerIcon className="h-4 w-4" />Reescrevendo...</> : 'Reescrever com IA'}
                        </button>
                        <button
                            onClick={() => handleApprove(topicKey)}
                            className={`flex items-center gap-2 text-sm font-semibold py-2 px-4 rounded-lg transition-colors ${
                                isApproved
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-slate-100'
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
                    {renderTopic('productStrategy', () => (
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-semibold">Categoria de Serviço/Produto:</h4>
                                <EditableField value={editableData.productStrategy?.category} onUpdate={v => updateEditableData('productStrategy.category', v)} />
                            </div>
                            <div>
                                <h4 className="font-semibold">Estrutura do Portfólio:</h4>
                                <p className="text-xs text-gray-500 dark:text-slate-500 mb-1">Como a oferta é organizada (Catálogo amplo, Serviços pacotes, etc.)</p>
                                <EditableField value={editableData.productStrategy?.portfolioStructure} onUpdate={v => updateEditableData('productStrategy.portfolioStructure', v)} />
                            </div>
                            <div>
                                <h4 className="font-semibold">Descrição Detalhada da Oferta:</h4>
                                <div className="bg-gray-50 dark:bg-slate-700/30 p-3 rounded border-l-4 border-purple-500">
                                    <EditableField value={editableData.productStrategy?.description} onUpdate={v => updateEditableData('productStrategy.description', v)} />
                                </div>
                            </div>
                        </div>
                    ))}
                    {renderTopic('purpose', () => <EditableField value={editableData.purpose} onUpdate={v => updateEditableData('purpose', v)} />)}
                    {renderTopic('mission', () => <EditableField value={editableData.mission} onUpdate={v => updateEditableData('mission', v)} />)}
                    {renderTopic('vision', () => <EditableField value={editableData.vision} onUpdate={v => updateEditableData('vision', v)} />)}
                    {renderTopic('values', () => (
                      <ul className="list-disc pl-5 space-y-1">
                        {ensureArray(editableData.values).map((v: any, i) => (
                          <li key={i}>
                            <strong><EditableField as="span" value={v.name || v.value} onUpdate={val => updateEditableData(`values.${i}.name`, val)} />:</strong>
                            {' '}<EditableField as="span" value={v.description} onUpdate={val => updateEditableData(`values.${i}.description`, val)} />
                          </li>
                        ))}
                      </ul>
                    ))}
                    {renderTopic('archetypes', () => (<>
                        <p><strong>Arquétipo Primário:</strong> <EditableField as="span" value={editableData.archetypes?.primary} onUpdate={v => updateEditableData('archetypes.primary', v)} /></p>
                        {editableData.archetypes?.secondary && <p><strong>Arquétipo Secundário:</strong> <EditableField as="span" value={editableData.archetypes.secondary} onUpdate={v => updateEditableData('archetypes.secondary', v)} /></p>}
                    </>))}
                    {renderTopic('audienceAndPositioning', () => (<div className="space-y-4">
                        <div>
                            <h4 className="font-semibold">Público-Alvo Principal:</h4>
                            <p className="text-xs text-gray-500 dark:text-slate-500 mb-1">Quem é o cliente ideal? (Demografia, Dores, Necessidades, Desejos)</p>
                            <EditableField value={editableData.audienceAndPositioning?.targetAudience} onUpdate={v => updateEditableData('audienceAndPositioning.targetAudience', v)} />
                        </div>
                        <div>
                            <h4 className="font-semibold">Concorrentes (Principais 3):</h4>
                            <p className="text-xs text-gray-500 dark:text-slate-500 mb-1">Quem são? O que eles fazem bem? Onde eles falham?</p>
                            <ul className="list-disc pl-5 space-y-1">{ensureArray(editableData.audienceAndPositioning?.competitors).map((c, i) => (
                              <li key={i}>
                                  <EditableField as="span" value={c.name} onUpdate={v => updateEditableData(`audienceAndPositioning.competitors.${i}.name`, v)} />
                                  {c.link && <a href={c.link} target="_blank" rel="noopener noreferrer" className="text-purple-600 dark:text-purple-400 hover:underline ml-2 text-xs">[link]</a>}
                              </li>
                            ))}</ul>
                        </div>
                        <div>
                            <h4 className="font-semibold">Diferenciais Competitivos (Proposta de Valor Única):</h4>
                            <p className="text-xs text-gray-500 dark:text-slate-500 mb-1">O que nos torna diferentes? Por que um cliente deveria nos escolher em vez do concorrente?</p>
                            <ul className="list-disc pl-5 space-y-1">{ensureArray(editableData.audienceAndPositioning?.differentiators).map((d, i) => 
                              <EditableField as="li" key={i} value={d} onUpdate={v => updateEditableData(`audienceAndPositioning.differentiators.${i}`, v)} />
                            )}</ul>
                        </div>
                        <div>
                            <h4 className="font-semibold">Declaração de Posicionamento (Resumo):</h4>
                            <p className="text-xs text-gray-500 dark:text-slate-500 mb-1">(Ex: "Para microempreendedores de e-commerce, a 'Embala Rápido' é a fornecedora de caixas que oferece a entrega mais veloz, porque temos estoque local e um sistema de logística próprio.")</p>
                            <div className="italic">"<EditableField as="span" value={editableData.audienceAndPositioning?.positioningStatement} onUpdate={v => updateEditableData('audienceAndPositioning.positioningStatement', v)} />"</div>
                        </div>
                    </div>))}
                </>);
            case 2:
                 return (<>
                    {renderTopic('voicePersonality', () => <EditableField value={editableData.voicePersonality} onUpdate={v => updateEditableData('voicePersonality', v)} />)}
                    {renderTopic('toneOfVoiceApplication', () => (<>
                        <p><strong>Em um post de venda:</strong> <EditableField as="span" value={editableData.toneOfVoiceApplication?.sales} onUpdate={v => updateEditableData('toneOfVoiceApplication.sales', v)} /></p>
                        <p><strong>No Suporte ao Cliente:</strong> <EditableField as="span" value={editableData.toneOfVoiceApplication?.support} onUpdate={v => updateEditableData('toneOfVoiceApplication.support', v)} /></p>
                        <p><strong>Em um post de blog (Conteúdo):</strong> <EditableField as="span" value={editableData.toneOfVoiceApplication?.content} onUpdate={v => updateEditableData('toneOfVoiceApplication.content', v)} /></p>
                    </>))}
                    {renderTopic('practicalGuidelines', () => (<div className="grid grid-cols-2 gap-4">
                        <div>
                            <h4 className="font-semibold">Somos:</h4>
                            <ul className="list-disc pl-5 space-y-2">{ensureArray(editableData.practicalGuidelines?.weAre).map((item, i) => (
                                <li key={i}>
                                    <strong><EditableField as="span" value={item.trait} onUpdate={v => updateEditableData(`practicalGuidelines.weAre.${i}.trait`, v)} />:</strong>
                                    {' '}<EditableField as="span" value={item.description} onUpdate={v => updateEditableData(`practicalGuidelines.weAre.${i}.description`, v)} />
                                </li>
                            ))}</ul>
                        </div>
                        <div>
                            <h4 className="font-semibold">Não Somos:</h4>
                            <ul className="list-disc pl-5 space-y-2">{ensureArray(editableData.practicalGuidelines?.weAreNot).map((item, i) => (
                                <li key={i}>
                                    <strong><EditableField as="span" value={item.trait} onUpdate={v => updateEditableData(`practicalGuidelines.weAreNot.${i}.trait`, v)} />:</strong>
                                    {' '}<EditableField as="span" value={item.description} onUpdate={v => updateEditableData(`practicalGuidelines.weAreNot.${i}.description`, v)} />
                                </li>
                            ))}</ul>
                        </div>
                    </div>))}
                    {renderTopic('slogan', () => <div className="text-2xl font-bold italic text-center">"<EditableField as="span" value={editableData.slogan} onUpdate={v => updateEditableData('slogan', v)} />"</div>)}
                    {renderTopic('keyMessages', () => (<>
                        <p><strong>Sobre o Produto/Serviço:</strong> <EditableField as="span" value={editableData.keyMessages?.product} onUpdate={v => updateEditableData('keyMessages.product', v)} /></p>
                        <p><strong>Sobre o Benefício/Transformação:</strong> <EditableField as="span" value={editableData.keyMessages?.benefit} onUpdate={v => updateEditableData('keyMessages.benefit', v)} /></p>
                        <p><strong>Sobre a Marca/Experiência:</strong> <EditableField as="span" value={editableData.keyMessages?.brand} onUpdate={v => updateEditableData('keyMessages.brand', v)} /></p>
                    </>))}
                    {renderTopic('contentPillars', () => (
                        <ul className="list-disc pl-5">
                            {ensureArray(editableData.contentPillars).map((p, i) => (
                                <li key={i}>
                                    <strong><EditableField as="span" value={p.name} onUpdate={v => updateEditableData(`contentPillars.${i}.name`, v)} />:</strong>
                                    {' '}<EditableField as="span" value={p.description || ''} onUpdate={v => updateEditableData(`contentPillars.${i}.description`, v)} />
                                </li>
                            ))}
                        </ul>
                    ))}
                </>);
            case 3:
                 return (<>
                    {renderTopic('logo', () => (
                      <>
                        <EditableField value={editableData.logo?.description} onUpdate={v => updateEditableData('logo.description', v)} />
                        
                        <div className="my-6 p-4 bg-gray-100 dark:bg-slate-900/50 rounded-lg shadow-inner text-center border border-gray-200 dark:border-slate-700">
                            <h3 className="text-lg font-semibold text-purple-600 dark:text-purple-400 mb-4">Logotipo Principal</h3>
                            {isGeneratingLogo ? (
                                <div className="flex justify-center items-center h-32"><SpinnerIcon className="h-8 w-8 text-purple-400"/></div>
                            ) : generatedLogo ? (
                                <button onClick={() => setIsLogoModalVisible(true)} title="Clique para ampliar">
                                    <img src={`data:image/png;base64,${generatedLogo}`} alt="Logotipo Gerado" className="max-h-32 mx-auto cursor-pointer hover:opacity-80 transition-opacity bg-white/10 rounded p-1" />
                                </button>
                            ) : validationData.uploadedLogoAnalysis ? (
                                <img src={validationData.generatedLogo} alt="Logotipo da Empresa" className="max-h-24 bg-white p-2 rounded-md mx-auto shadow"/>
                            ) : validationData.logoUrl ? (
                                <img src={validationData.logoUrl} alt="Logotipo da Empresa" className="max-h-24 bg-white p-2 rounded-md mx-auto shadow"/>
                            ) : (
                                <p className="text-gray-500 dark:text-slate-500">O logo gerado aparecerá aqui.</p>
                            )}
                             {!validationData.uploadedLogoAnalysis && (
                                <button onClick={handleGenerateLogo} disabled={isGeneratingLogo} className="mt-4 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2 px-5 rounded-lg shadow-sm transition-all duration-300 transform hover:scale-105 disabled:bg-gray-500">
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
                            ].map((color: {name: string, hex: string}, i) => (
                                <div key={i} className="text-center group">
                                    <div className="w-20 h-20 rounded-full border-4 border-gray-300 dark:border-slate-600 shadow-md" style={{backgroundColor: color.hex}}></div>
                                    <p className="mt-2 font-semibold text-sm">{color.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-slate-500 uppercase">{color.hex}</p>
                                </div>
                            ))}
                        </div>
                    ))}
                    {renderTopic('typography', () => (
                        <div className="space-y-6">
                            {editableData.typography?.primary?.font && (
                                <div>
                                    <p className="text-4xl" style={{fontFamily: `'${editableData.typography.primary.font}', sans-serif`}}>{editableData.typography.primary.font}</p>
                                    <p className="mt-1 font-semibold">{editableData.typography.primary.usage}</p>
                                </div>
                            )}
                            {editableData.typography?.secondary?.font && (
                                 <div>
                                    <p className="text-lg" style={{fontFamily: `'${editableData.typography.secondary.font}', serif`}}>{editableData.typography.secondary?.font ? (brandboardData.part2?.slogan || 'O rápido cavalo marrom salta sobre o cão preguiçoso.') : 'Fonte de corpo não definida'}</p>
                                    <p className="mt-1 font-semibold">{editableData.typography.secondary.font}</p>
                                     <p className="text-sm text-gray-500 dark:text-slate-500">{editableData.typography.secondary.usage}</p>
                                </div>
                            )}
                            {editableData.typography?.hierarchy && (
                                <div>
                                    <h4 className="font-semibold mt-4 text-gray-500 dark:text-slate-400">Hierarquia Sugerida:</h4>
                                    <p><strong>H1 (Título Principal):</strong> {editableData.typography.hierarchy.h1}</p>
                                    <p><strong>H2 (Subtítulo):</strong> {editableData.typography.hierarchy.h2}</p>
                                    <p><strong>Corpo de Texto:</strong> {editableData.typography.hierarchy.body}</p>
                                </div>
                            )}
                        </div>
                    ))}
                    {renderTopic('photographyStyle', () => <EditableField value={editableData.photographyStyle?.description} onUpdate={v => updateEditableData('photographyStyle.description', v)} />)}
                </>);
            case 4:
                return (
                    <>
                    {renderTopic('personas', () => 
                        ensureArray(editableData.personas).map((p: any, i) => (
                            <div key={i} className="mb-4 border-b border-gray-200 dark:border-slate-700 pb-4 last:border-b-0">
                                <h4 className="font-bold text-lg"><EditableField as="span" value={p.name} onUpdate={v => updateEditableData(`personas.${i}.name`, v)} /></h4>
                                <p><strong>História:</strong> <EditableField as="span" value={p.story} onUpdate={v => updateEditableData(`personas.${i}.story`, v)} /></p>
                                <p><strong>Dores/Desafios:</strong> <EditableField as="span" value={p.pains} onUpdate={v => updateEditableData(`personas.${i}.pains`, v)} /></p>
                                <p><strong>Objetivos/Sonhos:</strong> <EditableField as="span" value={p.goals} onUpdate={v => updateEditableData(`personas.${i}.goals`, v)} /></p>
                                <p><strong>Onde busca informação:</strong> <EditableField as="span" value={p.informationSources} onUpdate={v => updateEditableData(`personas.${i}.informationSources`, v)} /></p>
                                <p><strong>Como nossa marca a ajuda:</strong> <EditableField as="span" value={p.howWeHelp} onUpdate={v => updateEditableData(`personas.${i}.howWeHelp`, v)} /></p>
                            </div>
                        ))
                    )}
                     {renderTopic('customerJourney', () => (
                        <div className="space-y-3">
                            <div><h4 className="font-semibold">Descoberta (Topo do Funil)</h4><p><strong>O que acontece:</strong> <EditableField as="span" value={editableData.customerJourney?.discovery.description} onUpdate={v => updateEditableData('customerJourney.discovery.description', v)} /> <br/> <strong>Nosso objetivo:</strong> <EditableField as="span" value={editableData.customerJourney?.discovery.goal} onUpdate={v => updateEditableData('customerJourney.discovery.goal', v)} /></p></div>
                            <div><h4 className="font-semibold">Consideração (Meio do Funil)</h4><p><strong>O que acontece:</strong> <EditableField as="span" value={editableData.customerJourney?.consideration.description} onUpdate={v => updateEditableData('customerJourney.consideration.description', v)} /> <br/> <strong>Nosso objetivo:</strong> <EditableField as="span" value={editableData.customerJourney?.consideration.goal} onUpdate={v => updateEditableData('customerJourney.consideration.goal', v)} /></p></div>
                            <div><h4 className="font-semibold">Decisão (Fundo do Funil)</h4><p><strong>O que acontece:</strong> <EditableField as="span" value={editableData.customerJourney?.decision.description} onUpdate={v => updateEditableData('customerJourney.decision.description', v)} /> <br/> <strong>Nosso objetivo:</strong> <EditableField as="span" value={editableData.customerJourney?.decision.goal} onUpdate={v => updateEditableData('customerJourney.decision.goal', v)} /></p></div>
                            <div><h4 className="font-semibold">Fidelização (Pós-Venda)</h4><p><strong>O que acontece:</strong> <EditableField as="span" value={editableData.customerJourney?.loyalty.description} onUpdate={v => updateEditableData('customerJourney.loyalty.description', v)} /> <br/> <strong>Nosso objetivo:</strong> <EditableField as="span" value={editableData.customerJourney?.loyalty.goal} onUpdate={v => updateEditableData('customerJourney.loyalty.goal', v)} /></p></div>
                        </div>
                    ))}
                    {renderTopic('channelMatrix', () => (
                        <div className="space-y-4">
                            {ensureArray(editableData.channelMatrix).map((c: any, i) => (
                                <div key={i} className="p-3 bg-gray-50 dark:bg-slate-900/50 rounded border border-gray-200 dark:border-slate-700">
                                    <h4 className="font-bold"><EditableField as="span" value={c.channel} onUpdate={v => updateEditableData(`channelMatrix.${i}.channel`, v)} /></h4>
                                    <p><strong>Propósito Principal:</strong> <EditableField as="span" value={c.mainPurpose} onUpdate={v => updateEditableData(`channelMatrix.${i}.mainPurpose`, v)} /></p>
                                    <p><strong>Público:</strong> <EditableField as="span" value={c.audience} onUpdate={v => updateEditableData(`channelMatrix.${i}.audience`, v)} /></p>
                                    <p><strong>Métricas de Sucesso:</strong> <EditableField as="span" value={c.successMetrics} onUpdate={v => updateEditableData(`channelMatrix.${i}.successMetrics`, v)} /></p>
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
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2 font-['Playfair_Display',_serif]">{title}</h1>
                    {stepNumber === 1 && <p className="text-lg text-gray-700 dark:text-slate-300 mt-2">Esta é a nossa fundação. É o "porquê" por trás do "o quê".</p>}
                    <p className="text-gray-600 dark:text-slate-400 max-w-2xl mx-auto mt-2">Aprove cada tópico para continuar. Se precisar de ajustes, clique no texto para editar, ou deixe um comentário e peça para a IA reescrever.</p>
                </div>

                <div className="mb-8">
                    {renderStepContent()}
                </div>
                
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sticky bottom-6 z-20">
                    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-3 rounded-xl border border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row justify-center items-center gap-4 w-full sm:w-auto shadow-lg">
                        <button
                            onClick={onBack}
                            className="bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 text-gray-800 dark:text-slate-100 font-semibold py-2 px-6 rounded-lg shadow-sm transition-all duration-300 w-full sm:w-auto"
                        >
                            Voltar
                        </button>
                        {!allApproved && (
                            <button
                                onClick={handleApproveAll}
                                className="bg-green-50 text-green-700 dark:bg-green-500/20 dark:hover:bg-green-500/30 dark:text-green-300 hover:bg-green-100 font-semibold py-2 px-6 rounded-lg shadow-sm transition-all duration-300 w-full sm:w-auto"
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
            </div>
        </>
    );
};