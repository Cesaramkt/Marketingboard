import React, { useState, useEffect } from 'react';
import type { ValidationData, BrandboardData } from '../types';
import { regenerateFieldText, generateImage } from '../services/geminiService';
import { TestimonialPanel } from './TestimonialPanel';

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
      className={`focus:outline-none focus:bg-gray-100/50 dark:focus:bg-slate-700/50 focus:ring-1 focus:ring-purple-400 rounded-sm p-1 -m-1 ${className}`}
    />
  );
};

const TOPIC_CONFIG: Record<string, Record<string, { label: string; description: string }>> = {
    part1: {
        productStrategy: { label: "Estratégia de Produtos & Serviços", description: "A definição clara do que vendemos, nossa categoria e como nossa oferta é estruturada." },
        purpose: { label: "Propósito", description: "Por que esta empresa existe (além de ganhar dinheiro)?" },
        mission: { label: "Missão", description: "O que fazemos, para quem fazemos e como fazemos, de forma clara e objetiva." },
        vision: { label: "Visão", description: "Qual é o nosso objetivo de longo prazo? Onde nos vemos em 5 ou 10 anos?" },
        values: { label: "Valores", description: "Quais são as regras inegociáveis do nosso comportamento?" },
        archetypes: { label: "Arquétipos de Marca", description: "Se a nossa marca fosse uma pessoa, qual seria sua personalidade?" },
        audienceAndPositioning: { label: "Público e Posicionamento", description: "Nosso lugar no mercado e para quem estamos falando." },
    },
    part2: {
        voicePersonality: { label: "Personalidade da Voz", description: "Quais adjetivos descrevem nossa voz?" },
        toneOfVoiceApplication: { label: "Tom de Voz", description: "Como nossa voz se adapta a diferentes contextos (vendas, suporte)." },
        practicalGuidelines: { label: "Diretrizes Práticas (Somos / Não Somos)", description: "Um guia rápido para quem escreve em nome da marca." },
        slogan: { label: "Slogan / Tagline", description: "A frase curta que resume nossa promessa." },
        keyMessages: { label: "Mensagens-Chave", description: "As ideias principais que nosso público deve lembrar." },
        contentPillars: { label: "Pilares de Conteúdo", description: "Sobre o que falamos? Quais são os nossos grandes temas?" },
    },
    part3: {
        logo: { label: "Logotipo", description: "O símbolo principal da nossa marca." },
        colorPalette: { label: "Paleta de Cores", description: "Nossas cores proprietárias." },
        typography: { label: "Tipografia", description: "Como nossas palavras aparecem." },
        photographyStyle: { label: "Estilo Fotográfico", description: "O tipo de imagem que usamos." },
    },
    part4: {
        personas: { label: "Personas", description: "Um mergulho profundo no nosso cliente ideal." },
        customerJourney: { label: "Jornada do Cliente", description: "Como o cliente nos descobre e se relaciona conosco." },
        channelMatrix: { label: "Matriz de Canais", description: "Quais canais usamos e por quê?" },
    }
};

const APPROVABLE_TOPICS: Record<number, string[]> = {
    1: ['productStrategy', 'purpose', 'mission', 'vision', 'values', 'archetypes', 'audienceAndPositioning'],
    2: ['voicePersonality', 'toneOfVoiceApplication', 'practicalGuidelines', 'slogan', 'keyMessages', 'contentPillars'],
    3: ['logo', 'colorPalette', 'typography', 'photographyStyle'],
    4: ['personas', 'customerJourney', 'channelMatrix'],
};

const ensureArray = <T,>(value: T | T[] | undefined | null): T[] => Array.isArray(value) ? value : (value ? [value] : []);

export const StepResultDisplay: React.FC<StepResultDisplayProps> = ({ stepData, stepNumber, validationData, brandboardData, onConfirm, onBack }) => {
    const [editableData, setEditableData] = useState(stepData);
    const [comment, setComment] = useState('');
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [generatedLogo, setGeneratedLogo] = useState<string | null>(null);
    const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
    
    const [currentTopicIndex, setCurrentTopicIndex] = useState(0);
    const topicsForStep = APPROVABLE_TOPICS[stepNumber]?.filter(topic => stepData?.[topic] !== undefined) || [];
    const currentTopicKey = topicsForStep[currentTopicIndex];
    const topicInfo = TOPIC_CONFIG[`part${stepNumber}`]?.[currentTopicKey];

    useEffect(() => { 
        setEditableData(stepData); 
        setCurrentTopicIndex(0); // Reset to first topic when step data changes
    }, [stepData]);
    
    useEffect(() => { 
        setComment(''); 
    }, [currentTopicIndex]);

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

    const handleNext = () => {
        if (currentTopicIndex < topicsForStep.length - 1) {
            setCurrentTopicIndex(prev => prev + 1);
        } else {
            onConfirm(editableData, generatedLogo);
        }
    };

    const handleBack = () => {
        if (currentTopicIndex > 0) {
            setCurrentTopicIndex(prev => prev - 1);
        } else {
            onBack();
        }
    };

    const handleRegenerate = async () => {
        setIsRegenerating(true);
        try {
            const newText = await regenerateFieldText(validationData, { ...brandboardData, [`part${stepNumber}`]: editableData }, `part${stepNumber}.${currentTopicKey}`, JSON.stringify(editableData[currentTopicKey]), comment);
            try {
                updateEditableData(currentTopicKey, JSON.parse(newText));
            } catch (e) {
                updateEditableData(currentTopicKey, newText);
            }
        } catch (error) {
            alert("Não foi possível gerar um novo texto. Tente novamente.");
        } finally {
            setIsRegenerating(false);
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

    const renderTopicContent = () => {
        if (!editableData || !currentTopicKey) return null;
        const data = editableData[currentTopicKey];
        if (data === undefined) return <p className="text-gray-500">Nenhum dado gerado para este tópico.</p>;
        
        switch (`part${stepNumber}.${currentTopicKey}`) {
            // --- PART 1 ---
            case 'part1.productStrategy':
                return (
                    <div className="space-y-4">
                        <div><h4 className="font-semibold text-gray-500 dark:text-slate-400">Categoria</h4><EditableField value={data.category || ''} onUpdate={v => updateEditableData('productStrategy.category', v)} /></div>
                        <div><h4 className="font-semibold text-gray-500 dark:text-slate-400">Estrutura do Portfólio</h4><EditableField value={data.portfolioStructure || ''} onUpdate={v => updateEditableData('productStrategy.portfolioStructure', v)} /></div>
                        <div><h4 className="font-semibold text-gray-500 dark:text-slate-400">Descrição Detalhada</h4><EditableField as="div" value={data.description || ''} onUpdate={v => updateEditableData('productStrategy.description', v)} /></div>
                    </div>
                );
            case 'part1.purpose': return <EditableField value={data} onUpdate={v => updateEditableData('purpose', v)} />;
            case 'part1.mission': return <EditableField value={data} onUpdate={v => updateEditableData('mission', v)} />;
            case 'part1.vision': return <EditableField value={data} onUpdate={v => updateEditableData('vision', v)} />;
            case 'part1.values': 
                return <ul className="list-none space-y-3">{ensureArray(data).map((v: any, i) => <li key={i}><strong><EditableField as="span" value={v.name} onUpdate={val => updateEditableData(`values.${i}.name`, val)} />:</strong>{' '}<EditableField as="span" value={v.description} onUpdate={val => updateEditableData(`values.${i}.description`, val)} /></li>)}</ul>;
            case 'part1.archetypes': 
                return (<div><p><strong>Primário:</strong> <EditableField as="span" value={data.primary || ''} onUpdate={v => updateEditableData('archetypes.primary', v)} /></p>{data.secondary && <p><strong>Secundário:</strong> <EditableField as="span" value={data.secondary} onUpdate={v => updateEditableData('archetypes.secondary', v)} /></p>}</div>);
            case 'part1.audienceAndPositioning': 
                return (
                    <div className="space-y-4">
                        <div><h4 className="font-semibold text-gray-500 dark:text-slate-400">Público-Alvo</h4><EditableField as="div" value={data.targetAudience} onUpdate={v => updateEditableData('audienceAndPositioning.targetAudience', v)} /></div>
                        <div><h4 className="font-semibold text-gray-500 dark:text-slate-400">Diferenciais</h4><ul className="list-disc pl-5">{ensureArray(data.differentiators).map((d, i) => <EditableField key={i} as="li" value={d} onUpdate={v => updateEditableData(`audienceAndPositioning.differentiators.${i}`, v)} />)}</ul></div>
                        <div><h4 className="font-semibold text-gray-500 dark:text-slate-400">Concorrentes</h4><ul className="list-disc pl-5">{ensureArray(data.competitors).map((c, i) => <li key={i}><EditableField as="span" value={c.name} onUpdate={v => updateEditableData(`audienceAndPositioning.competitors.${i}.name`, v)} /> {c.link && <a href={c.link} target="_blank" rel="noreferrer" className="text-purple-500 text-sm"> [link]</a>}</li>)}</ul></div>
                        <div><h4 className="font-semibold text-gray-500 dark:text-slate-400">Posicionamento</h4><p className="italic">"<EditableField as="span" value={data.positioningStatement} onUpdate={v => updateEditableData('audienceAndPositioning.positioningStatement', v)} />"</p></div>
                    </div>
                );

            // --- PART 2 ---
            case 'part2.voicePersonality': return <EditableField value={data} onUpdate={v => updateEditableData('voicePersonality', v)} />;
            case 'part2.toneOfVoiceApplication':
                return (<div className="space-y-3"><p><strong>Vendas:</strong> <EditableField as="span" value={data.sales || ''} onUpdate={v => updateEditableData('toneOfVoiceApplication.sales', v)} /></p><p><strong>Suporte:</strong> <EditableField as="span" value={data.support || ''} onUpdate={v => updateEditableData('toneOfVoiceApplication.support', v)} /></p><p><strong>Conteúdo:</strong> <EditableField as="span" value={data.content || ''} onUpdate={v => updateEditableData('toneOfVoiceApplication.content', v)} /></p></div>);
            case 'part2.practicalGuidelines':
                return (<div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><h4 className="font-semibold text-gray-500 dark:text-slate-400">Somos:</h4><ul className="list-none space-y-2">{ensureArray(data.weAre).map((item, i) => <li key={i}><strong><EditableField as="span" value={item.trait} onUpdate={v => updateEditableData(`practicalGuidelines.weAre.${i}.trait`, v)} />:</strong>{' '}<EditableField as="span" value={item.description} onUpdate={v => updateEditableData(`practicalGuidelines.weAre.${i}.description`, v)} /></li>)}</ul></div><div><h4 className="font-semibold text-gray-500 dark:text-slate-400">Não Somos:</h4><ul className="list-none space-y-2">{ensureArray(data.weAreNot).map((item, i) => <li key={i}><strong><EditableField as="span" value={item.trait} onUpdate={v => updateEditableData(`practicalGuidelines.weAreNot.${i}.trait`, v)} />:</strong>{' '}<EditableField as="span" value={item.description} onUpdate={v => updateEditableData(`practicalGuidelines.weAreNot.${i}.description`, v)} /></li>)}</ul></div></div>);
            case 'part2.slogan': return <EditableField as="div" className="text-2xl italic" value={data} onUpdate={v => updateEditableData('slogan', v)} />;
            case 'part2.keyMessages':
                return (<div className="space-y-3"><p><strong>Produto:</strong> <EditableField as="span" value={data.product || ''} onUpdate={v => updateEditableData('keyMessages.product', v)} /></p><p><strong>Benefício:</strong> <EditableField as="span" value={data.benefit || ''} onUpdate={v => updateEditableData('keyMessages.benefit', v)} /></p><p><strong>Marca:</strong> <EditableField as="span" value={data.brand || ''} onUpdate={v => updateEditableData('keyMessages.brand', v)} /></p></div>);
            case 'part2.contentPillars':
                return <ul className="list-none space-y-3">{ensureArray(data).map((p, i) => <li key={i}><strong><EditableField as="span" value={p.name} onUpdate={v => updateEditableData(`contentPillars.${i}.name`, v)} />:</strong>{' '}<EditableField as="span" value={p.description} onUpdate={v => updateEditableData(`contentPillars.${i}.description`, v)} /></li>)}</ul>;

            // --- PART 3 ---
            case 'part3.logo':
                const existingLogoUrl = validationData.generatedLogo || validationData.logoUrl;
                return (<div><EditableField as="div" value={data.description} onUpdate={v => updateEditableData('logo.description', v)} /><div className="my-4 p-4 bg-gray-100/50 dark:bg-slate-800/50 rounded-lg text-center">{isGeneratingLogo ? <SpinnerIcon className="h-8 w-8 text-purple-500 mx-auto" /> : generatedLogo ? <img src={`data:image/png;base64,${generatedLogo}`} className="max-h-24 mx-auto" alt="Logo Gerado"/> : existingLogoUrl ? <img src={existingLogoUrl} className="max-h-24 mx-auto" alt="Logo Existente" /> : <p className="text-sm text-gray-500">O logo gerado aparecerá aqui.</p>}{!validationData.logoUrl && !validationData.uploadedLogoAnalysis && (<button onClick={handleGenerateLogo} disabled={isGeneratingLogo} className="mt-4 text-sm font-semibold text-purple-600 dark:text-purple-400 hover:underline disabled:opacity-50">{isGeneratingLogo ? 'Gerando...' : (generatedLogo || existingLogoUrl) ? 'Gerar Outra Versão' : 'Gerar Logo com IA'}</button>)}</div></div>);
            case 'part3.colorPalette':
                return (<div className="flex flex-wrap gap-4">{[...ensureArray(data.primary), ...ensureArray(data.secondary)].map((color, i) => (<div key={i} className="text-center"><div className="w-16 h-16 rounded-full border-4 border-white dark:border-slate-700 shadow-md" style={{backgroundColor: color.hex}}></div><p className="mt-2 font-semibold text-sm">{color.name}</p><p className="text-xs text-gray-500 uppercase">{color.hex}</p></div>))}</div>);
            case 'part3.typography':
                return (<div className="space-y-6"><div><h4 className="font-semibold text-gray-500 dark:text-slate-400">Fonte Primária</h4><p className="text-3xl" style={{fontFamily: `'${data.primary.font}', sans-serif`}}>{data.primary.font}</p><p className="text-sm">{data.primary.usage}</p></div><div><h4 className="font-semibold text-gray-500 dark:text-slate-400">Fonte Secundária</h4><p className="text-lg" style={{fontFamily: `'${data.secondary.font}', serif`}}>{brandboardData.part2?.slogan || 'The quick brown fox jumps over the lazy dog.'}</p><p className="text-sm">{data.secondary.usage}</p></div></div>);
            case 'part3.photographyStyle':
                return <EditableField as="div" value={data.description} onUpdate={v => updateEditableData('photographyStyle.description', v)} />;

            // --- PART 4 ---
            case 'part4.personas':
                return <div className="space-y-6">{ensureArray(data).map((p, i) => (<div key={i}><h4 className="font-bold"><EditableField as="span" value={p.name} onUpdate={v => updateEditableData(`personas.${i}.name`, v)} /></h4><p><strong>História:</strong> <EditableField as="span" value={p.story} onUpdate={v => updateEditableData(`personas.${i}.story`, v)} /></p><p><strong>Dores:</strong> <EditableField as="span" value={p.pains} onUpdate={v => updateEditableData(`personas.${i}.pains`, v)} /></p><p><strong>Objetivos:</strong> <EditableField as="span" value={p.goals} onUpdate={v => updateEditableData(`personas.${i}.goals`, v)} /></p></div>))}</div>;
            case 'part4.customerJourney':
                return (<div className="space-y-4"><div><h4 className="font-semibold text-gray-500 dark:text-slate-400">Descoberta</h4><p><EditableField as="span" value={data.discovery.description} onUpdate={v => updateEditableData('customerJourney.discovery.description', v)} /></p></div><div><h4 className="font-semibold text-gray-500 dark:text-slate-400">Consideração</h4><p><EditableField as="span" value={data.consideration.description} onUpdate={v => updateEditableData('customerJourney.consideration.description', v)} /></p></div><div><h4 className="font-semibold text-gray-500 dark:text-slate-400">Decisão</h4><p><EditableField as="span" value={data.decision.description} onUpdate={v => updateEditableData('customerJourney.decision.description', v)} /></p></div><div><h4 className="font-semibold text-gray-500 dark:text-slate-400">Fidelização</h4><p><EditableField as="span" value={data.loyalty.description} onUpdate={v => updateEditableData('customerJourney.loyalty.description', v)} /></p></div></div>);
            case 'part4.channelMatrix':
                return (<div className="space-y-4">{ensureArray(data).map((c, i) => (<div key={i} className="p-3 bg-gray-100/50 dark:bg-slate-800/50 rounded"><h4 className="font-bold"><EditableField as="span" value={c.channel} onUpdate={v => updateEditableData(`channelMatrix.${i}.channel`, v)} /></h4><p><strong>Propósito:</strong> <EditableField as="span" value={c.mainPurpose} onUpdate={v => updateEditableData(`channelMatrix.${i}.mainPurpose`, v)} /></p><p><strong>Métricas:</strong> <EditableField as="span" value={c.successMetrics} onUpdate={v => updateEditableData(`channelMatrix.${i}.successMetrics`, v)} /></p></div>))}</div>);

            default: 
                return <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-100 dark:bg-slate-800 p-2 rounded">{JSON.stringify(data, null, 2)}</pre>;
        }
    };

    return (
        <div className="grid md:grid-cols-2 min-h-[calc(100vh-140px)]">
            <div className="flex flex-col justify-between p-8 sm:p-16 bg-white dark:bg-slate-900">
                <div>
                    <button onClick={handleBack} className="flex items-center text-sm text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 mb-8 group">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Voltar
                    </button>
                    {topicInfo && (
                        <div key={currentTopicKey} className="animate-fade-in">
                            <h2 className="text-5xl font-bold text-gray-900 dark:text-slate-100 tracking-tight font-['Playfair_Display',_serif]">{topicInfo.label}</h2>
                            <p className="mt-4 text-gray-600 dark:text-slate-400 max-w-lg">{topicInfo.description}</p>
                            
                            <div className="mt-8 prose prose-lg dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1">
                                {renderTopicContent()}
                            </div>

                            <div className="mt-8">
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Gostou, mas quer ajustar? Deixe um comentário para a IA..."
                                    rows={2}
                                    className="w-full bg-gray-100 dark:bg-slate-800 text-sm p-3 rounded-md border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-purple-500"
                                />
                                <button onClick={handleRegenerate} disabled={isRegenerating || !comment.trim()} className="mt-2 text-sm font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isRegenerating ? 'Reescrevendo...' : 'Reescrever com IA'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-12">
                     <div className="w-full bg-gray-200 dark:bg-slate-700 h-1 rounded-full mb-4">
                        <div className="bg-purple-600 h-1 rounded-full transition-all duration-500" style={{ width: `${((currentTopicIndex + 1) / topicsForStep.length) * 100}%` }}></div>
                     </div>
                     <button onClick={handleNext} className="bg-gray-900 dark:bg-white text-white dark:text-black font-semibold py-3 px-8 rounded-full shadow-md transition-all duration-300 ease-in-out transform hover:scale-105">
                        {currentTopicIndex === topicsForStep.length - 1 ? 'Finalizar e Gerar Próxima Etapa' : 'Aprovar e Continuar'}
                     </button>
                </div>
            </div>
            <TestimonialPanel />
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fadeIn 0.5s ease-out forwards;
                }
            `}</style>
        </div>
    );
};