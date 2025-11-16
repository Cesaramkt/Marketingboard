import React, { useRef, useState, useEffect } from 'react';
import type { BrandboardData, ValidationData } from '../types';

declare var html2canvas: any;
declare var jspdf: any;

interface BrandboardDisplayProps {
  brandboardData: BrandboardData;
  validationData: ValidationData;
  generatedLogo: string | null;
  photographyImages: string[];
  isEditable?: boolean;
}

const EditableText: React.FC<{ value: string; onUpdate: (newValue: string) => void; className?: string; as?: 'p' | 'h4' | 'li' | 'span' }> = ({ value, onUpdate, className, as: Component = 'p' }) => {
    return (
        <Component
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => onUpdate(e.currentTarget.textContent || '')}
            className={`focus:outline-none focus:bg-violet-50 focus:ring-2 focus:ring-purple-400 rounded-sm px-1 -mx-1 ${className}`}
        >
            {value}
        </Component>
    );
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

export const BrandboardDisplay: React.FC<BrandboardDisplayProps> = ({ 
    brandboardData, 
    validationData, 
    generatedLogo, 
    photographyImages,
    isEditable = false
}) => {
  const [data, setData] = useState(brandboardData);
  const [logo, setLogo] = useState<string | null>(generatedLogo);
  const [photos, setPhotos] = useState(photographyImages);

  useEffect(() => {
    setData(brandboardData);
    setLogo(validationData.generatedLogo || generatedLogo);
    setPhotos(photographyImages);
  }, [brandboardData, generatedLogo, photographyImages, validationData]);

  const printRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadPdf = async () => {
    const element = printRef.current;
    if (!element) return;
    
    alert("A geração do PDF foi iniciada. Por favor, aguarde um momento.");

    const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true,
        logging: false,
    });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jspdf.jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(imgData);
    const ratio = imgProps.width / imgProps.height;
    
    let imgHeight = pdfWidth / ratio;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;
    }
    
    pdf.save('marketingboard.pdf');
  };

  const handleLogoUploadClick = () => {
    if (isEditable) {
      logoInputRef.current?.click();
    }
  };
  
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogo(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateNestedField = (path: string, value: any) => {
    setData(prev => {
        const newData = JSON.parse(JSON.stringify(prev));
        const keys = path.split('.');
        let current = newData;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) current[keys[i]] = {}; // Create nested objects if they don't exist
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
        return newData;
    });
  };

  const updateNestedList = (path: string, index: number, value: any) => {
      setData(prev => {
          const newData = JSON.parse(JSON.stringify(prev));
          const keys = path.split('.');
          let current = newData;
          for (let i = 0; i < keys.length; i++) {
              if (!current[keys[i]]) current[keys[i]] = []; // Create nested array if it doesn't exist
              current = current[keys[i]];
          }
          current[index] = value;
          return newData;
      });
  };

  const updateColor = (type: 'primary' | 'secondary' | 'neutral' | 'highlights', index: number, hex: string) => {
      setData(prev => {
          const newPalette = JSON.parse(JSON.stringify(prev.part3.colorPalette));
          newPalette[type][index].hex = hex;
          return { ...prev, part3: { ...prev.part3, colorPalette: newPalette }};
      })
  };

  const { part1, part2, part3, part4 } = data;
  
  const initialLogo = validationData.generatedLogo || logo || validationData.logoUrl;

  return (
    <div className="mt-4 font-['Georgia',_serif]">
      {isEditable && (
        <div className="text-center mb-8 bg-purple-50 p-4 rounded-xl border border-purple-200 flex flex-col sm:flex-row justify-center items-center gap-4">
            <div>
                <h3 className="text-xl font-bold text-purple-800">Seu Marketingboard está pronto!</h3>
                <p className="text-purple-600 mt-1">Clique em qualquer texto, cor ou no logo para editar. Quando terminar, salve como PDF.</p>
            </div>
            <button
                onClick={handleDownloadPdf}
                className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105"
            >
                Salvar em PDF
            </button>
        </div>
      )}
      <div ref={printRef} className="bg-white text-[#333] p-8 md:p-12 mx-auto max-w-4xl shadow-2xl">
          <header className="text-center mb-12 border-b pb-4">
              <h1 className="text-5xl font-bold tracking-widest uppercase">{validationData.companyName}</h1>
              <p className="text-lg mt-2 text-gray-500 tracking-wider">MARKETING BOARD</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {/* Left Column */}
              <div className="md:col-span-2 space-y-10">
                  <section>
                      <h2 className="section-title">LOGO PRINCIPAL</h2>
                      <div className={`p-4 bg-gray-50 border rounded-md flex justify-center items-center h-48 ${isEditable ? 'cursor-pointer hover:bg-gray-100' : ''}`} onClick={handleLogoUploadClick}>
                          {isEditable && <input type="file" ref={logoInputRef} onChange={handleLogoFileChange} className="hidden" accept="image/*"/>}
                          {initialLogo ? <img src={initialLogo} alt="Logotipo Principal" className="max-h-full max-w-full object-contain" /> : <p className="text-gray-400">Clique para carregar o logo</p>}
                      </div>
                  </section>
                  <section>
                      <h2 className="section-title">PALETA DE CORES</h2>
                      <div className="flex flex-wrap gap-4">
                          {[
                            ...ensureArray(part3?.colorPalette?.primary), 
                            ...ensureArray(part3?.colorPalette?.secondary), 
                            ...ensureArray(part3?.colorPalette?.neutral), 
                            ...ensureArray(part3?.colorPalette?.highlights)
                          ].map((color, i) => {
                              const pLen = ensureArray(part3?.colorPalette?.primary).length;
                              const sLen = ensureArray(part3?.colorPalette?.secondary).length;
                              const nLen = ensureArray(part3?.colorPalette?.neutral).length;
                              
                              const type = i < pLen ? 'primary' : (i < pLen + sLen ? 'secondary' : (i < pLen + sLen + nLen ? 'neutral' : 'highlights'));
                              const indexInType = i < pLen ? i : (i < pLen + sLen ? i - pLen : (i < pLen + sLen + nLen ? i - pLen - sLen : i - pLen - sLen - nLen));
                              
                              const colorInputRef = useRef<HTMLInputElement>(null);
                              return (
                                  <div key={i} className="text-center group">
                                      <div className={`w-20 h-20 rounded-full border-4 border-gray-200 shadow-md ${isEditable ? 'cursor-pointer' : ''}`} style={{backgroundColor: color.hex}} onClick={() => isEditable && colorInputRef.current?.click()}></div>
                                      {isEditable && <input ref={colorInputRef} type="color" value={color.hex} onChange={(e) => updateColor(type, indexInType, e.target.value)} className="w-0 h-0 opacity-0"/>}
                                      <p className="mt-2 font-semibold text-sm">{color.name}</p>
                                      <p className="text-xs text-gray-500 uppercase">{color.hex}</p>
                                  </div>
                              );
                          })}
                      </div>
                  </section>
                  <section>
                      <h2 className="section-title">TIPOGRAFIA</h2>
                      <div className="space-y-4">
                          <div>
                              <p className="font-sans text-4xl" style={{fontFamily: `'${part3?.typography?.primary?.font}', sans-serif`}}>{part3?.typography?.primary?.font ? 'Aa Bb Cc' : 'Título não definido'}</p>
                              <p className="mt-1 font-semibold">{part3?.typography?.primary?.font}</p>
                              <p className="text-sm text-gray-500">{part3?.typography?.primary?.usage}</p>
                          </div>
                           <div>
                              <p className="font-serif text-lg" style={{fontFamily: `'${part3?.typography?.secondary?.font}', serif`}}>{part3?.typography?.secondary?.font ? 'O rápido cavalo marrom salta sobre o cão preguiçoso.' : 'Fonte de corpo não definida'}</p>
                              <p className="mt-1 font-semibold">{part3?.typography?.secondary?.font}</p>
                               <p className="text-sm text-gray-500">{part3?.typography?.secondary?.usage}</p>
                          </div>
                      </div>
                  </section>
                  <section>
                       <h2 className="section-title">ESTILO FOTOGRÁFICO</h2>
                       <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                           {photos.map((img, i) => <img key={i} src={img} alt={`Imagem de estilo ${i+1}`} className="w-full h-full object-cover rounded-md" />)}
                       </div>
                  </section>
              </div>

              {/* Right Column */}
              <div className="space-y-10">
                    <section>
                      <h2 className="section-title">PROPÓSITO</h2>
                      <EditableText value={part1?.purpose || ''} onUpdate={(v) => updateNestedField('part1.purpose', v)} className="text-sm text-gray-600 leading-relaxed" />
                  </section>
                  <section>
                      <h2 className="section-title">MISSÃO</h2>
                      <EditableText value={part1?.mission || ''} onUpdate={(v) => updateNestedField('part1.mission', v)} className="text-sm text-gray-600 leading-relaxed" />
                  </section>
                   <section>
                      <h2 className="section-title">VISÃO</h2>
                      <EditableText value={part1?.vision || ''} onUpdate={(v) => updateNestedField('part1.vision', v)} className="text-sm text-gray-600 leading-relaxed" />
                  </section>
                  <section>
                      <h2 className="section-title">VALORES</h2>
                      <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                          {ensureArray(part1?.values).map((val: any, i) => {
                              if (typeof val === 'object' && val !== null && (val.name || val.value) && val.description) {
                                  const keyToUse = val.name ? 'name' : 'value';
                                  const nameOrValue = val[keyToUse];
                                  return (
                                      <li key={i}>
                                          <strong>
                                              <EditableText 
                                                  as="span" 
                                                  value={nameOrValue} 
                                                  onUpdate={(v) => updateNestedList('part1.values', i, { ...val, [keyToUse]: v })} 
                                              />:
                                          </strong>
                                          {' '}
                                          <EditableText 
                                              as="span" 
                                              value={val.description} 
                                              onUpdate={(v) => updateNestedList('part1.values', i, { ...val, description: v })} 
                                          />
                                      </li>
                                  );
                              }
                              // Fallback for old string values or other objects
                              return (
                                  <EditableText 
                                      key={i} 
                                      as="li" 
                                      value={String(val)}
                                      onUpdate={(v) => updateNestedList('part1.values', i, v)} 
                                  />
                              );
                          })}
                      </ul>
                  </section>
                  <section>
                      <h2 className="section-title">ARQUÉTIPOS</h2>
                      <div className="text-sm text-gray-600 leading-relaxed">
                          <p>
                              <span className="font-semibold">Primário: </span>
                              <EditableText value={part1?.archetypes?.primary || ''} onUpdate={(v) => updateNestedField('part1.archetypes.primary', v)} as="span" className="inline"/>
                          </p>
                          {part1?.archetypes?.secondary && (
                            <p>
                                <span className="font-semibold">Secundário: </span>
                                <EditableText value={part1?.archetypes?.secondary || ''} onUpdate={(v) => updateNestedField('part1.archetypes.secondary', v)} as="span" className="inline"/>
                            </p>
                          )}
                      </div>
                  </section>
              </div>
          </div>
          
          <section className="mt-10 pt-6 border-t">
              <h2 className="section-title">ANÁLISE DE PÚBLICO E POSICIONAMENTO</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-gray-600 leading-relaxed">
                  <div>
                      <h4 className="font-semibold text-base text-gray-800 mb-2">Público-Alvo Principal</h4>
                      <EditableText value={part1?.audienceAndPositioning?.targetAudience || ''} onUpdate={(v) => updateNestedField('part1.audienceAndPositioning.targetAudience', v)} />
                  </div>
                  <div>
                      <h4 className="font-semibold text-base text-gray-800 mb-2">Diferenciais Competitivos</h4>
                      <ul className="list-disc list-inside space-y-1">
                          {ensureArray(part1?.audienceAndPositioning?.differentiators).map((item, i) => (
                              <EditableText as="li" key={i} value={item} onUpdate={(v) => updateNestedList('part1.audienceAndPositioning.differentiators', i, v)} />
                          ))}
                      </ul>
                  </div>
                  <div className="md:col-span-2">
                      <h4 className="font-semibold text-base text-gray-800 mb-2">Concorrentes Principais</h4>
                      <ul className="list-disc list-inside space-y-1">
                          {ensureArray(part1?.audienceAndPositioning?.competitors).map((item, i) => (
                              <EditableText as="li" key={i} value={item} onUpdate={(v) => updateNestedList('part1.audienceAndPositioning.competitors', i, v)} />
                          ))}
                      </ul>
                  </div>
                  <div className="md:col-span-2">
                      <h4 className="font-semibold text-base text-gray-800 mb-2">Declaração de Posicionamento</h4>
                      <div className="italic bg-gray-50 p-3 rounded-md border-l-4 border-purple-300">
                          <EditableText value={part1?.audienceAndPositioning?.positioningStatement || ''} onUpdate={(v) => updateNestedField('part1.audienceAndPositioning.positioningStatement', v)} />
                      </div>
                  </div>
              </div>
          </section>

          <section className="mt-10 pt-6 border-t">
            <h2 className="section-title">IDENTIDADE VERBAL</h2>
             <div className="text-center mb-8">
                <h3 className="text-3xl font-bold italic">
                    "<EditableText value={part2?.slogan || ''} onUpdate={(v) => updateNestedField('part2.slogan', v)} as="span"/>"
                </h3>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-gray-600 leading-relaxed">
                <div>
                    <h4 className="font-semibold text-base text-gray-800 mb-2">Personalidade da Voz</h4>
                    <EditableText value={part2?.voicePersonality || ''} onUpdate={(v) => updateNestedField('part2.voicePersonality', v)} />
                </div>
                <div>
                    <h4 className="font-semibold text-base text-gray-800 mb-2">Mensagens-Chave</h4>
                    <p><span className="font-medium">Produto: </span><EditableText as="span" value={part2?.keyMessages?.product || ''} onUpdate={(v) => updateNestedField('part2.keyMessages.product', v)}/></p>
                    <p><span className="font-medium">Benefício: </span><EditableText as="span" value={part2?.keyMessages?.benefit || ''} onUpdate={(v) => updateNestedField('part2.keyMessages.benefit', v)}/></p>
                    <p><span className="font-medium">Marca: </span><EditableText as="span" value={part2?.keyMessages?.brand || ''} onUpdate={(v) => updateNestedField('part2.keyMessages.brand', v)}/></p>
                </div>
                <div>
                    <h4 className="font-semibold text-base text-gray-800 mb-2">Pilares de Conteúdo</h4>
                     <ul className="list-disc list-inside space-y-1">
                        {ensureArray(part2?.contentPillars).map((item, i) => (
                          <li key={i}>
                              <strong>
                                  <EditableText 
                                      as="span" 
                                      value={item.name} 
                                      onUpdate={(v) => updateNestedList('part2.contentPillars', i, { ...item, name: v })} 
                                  />:
                              </strong>
                              {' '}
                              <EditableText 
                                  as="span" 
                                  value={item.description || ''} 
                                  onUpdate={(v) => updateNestedList('part2.contentPillars', i, { ...item, description: v })} 
                              />
                          </li>
                        ))}
                    </ul>
                </div>
             </div>
          </section>

          <section className="mt-10 pt-6 border-t">
              <h2 className="section-title">ESTRATÉGIA DE CANAL</h2>
              <h3 className="font-semibold text-lg text-gray-800 mb-4">Personas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {ensureArray(part4?.personas).map((persona, i) => (
                    <div key={i} className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm text-gray-600 space-y-2">
                        <h4 className="font-bold text-base text-purple-700">
                            <EditableText as="span" value={persona.name} onUpdate={(v) => updateNestedField(`part4.personas.${i}.name`, v)} />
                        </h4>
                        <p><span className="font-medium">História: </span><EditableText as="span" value={persona.story} onUpdate={(v) => updateNestedField(`part4.personas.${i}.story`, v)} /></p>
                        <p><span className="font-medium">Dores: </span><EditableText as="span" value={persona.pains} onUpdate={(v) => updateNestedField(`part4.personas.${i}.pains`, v)} /></p>
                        <p><span className="font-medium">Objetivos: </span><EditableText as="span" value={persona.goals} onUpdate={(v) => updateNestedField(`part4.personas.${i}.goals`, v)} /></p>
                        <p><span className="font-medium">Como Ajudamos: </span><EditableText as="span" value={persona.howWeHelp} onUpdate={(v) => updateNestedField(`part4.personas.${i}.howWeHelp`, v)} /></p>
                    </div>
                ))}
              </div>
              
              <h3 className="font-semibold text-lg text-gray-800 mb-4">Jornada do Cliente</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm mb-8">
                {['discovery', 'consideration', 'decision', 'loyalty'].map((stageKey) => {
                    const stageData = part4?.customerJourney?.[stageKey as keyof typeof part4.customerJourney];
                    const titles: Record<string, string> = {discovery: 'Descoberta', consideration: 'Consideração', decision: 'Decisão', loyalty: 'Fidelização'};
                    if(!stageData) return null;
                    return (
                        <div key={stageKey} className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                            <h4 className="font-bold text-purple-800 uppercase text-xs tracking-wider">{titles[stageKey]}</h4>
                            <p className="mt-1 text-gray-700"><EditableText as="span" value={stageData.goal} onUpdate={(v) => updateNestedField(`part4.customerJourney.${stageKey}.goal`, v)}/></p>
                        </div>
                    );
                })}
              </div>

              <h3 className="font-semibold text-lg text-gray-800 mb-4">Matriz de Canais</h3>
               <div className="space-y-4 text-sm text-gray-600">
                    {ensureArray(part4?.channelMatrix).map((channel, i) => (
                        <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                           <div className="font-bold text-gray-800"><EditableText as="span" value={channel.channel} onUpdate={(v) => updateNestedField(`part4.channelMatrix.${i}.channel`, v)} /></div>
                           <div className="md:col-span-2"><span className="font-medium md:hidden">Propósito: </span><EditableText as="span" value={channel.mainPurpose} onUpdate={(v) => updateNestedField(`part4.channelMatrix.${i}.mainPurpose`, v)} /></div>
                           <div><span className="font-medium md:hidden">Métricas: </span><EditableText as="span" value={channel.successMetrics} onUpdate={(v) => updateNestedField(`part4.channelMatrix.${i}.successMetrics`, v)} /></div>
                        </div>
                    ))}
              </div>
          </section>

          <footer className="text-center mt-12 pt-4 border-t">
              <p className="text-sm text-gray-400 tracking-widest uppercase">WWW.{validationData.companyName.toLowerCase().replace(/\s+/g, '')}.COM</p>
          </footer>
      </div>
      <style>{`
          .section-title {
              font-size: 0.8rem;
              font-weight: bold;
              color: #9ca3af;
              letter-spacing: 0.2em;
              text-transform: uppercase;
              margin-bottom: 1rem;
              padding-bottom: 0.25rem;
              border-bottom: 1px solid #e5e7eb;
          }
      `}</style>
    </div>
  );
};