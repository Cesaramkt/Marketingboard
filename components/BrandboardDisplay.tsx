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
            className={`focus:outline-none focus:bg-gray-100 dark:focus:bg-slate-700 focus:ring-2 focus:ring-purple-400 rounded-sm px-1 -mx-1 ${className}`}
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

const SectionCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={`bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-200 dark:border-slate-700 ${className}`}>
        <h2 className="text-sm font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-4">{title}</h2>
        <div className="prose prose-slate dark:prose-invert max-w-none prose-p:text-gray-700 dark:prose-p:text-slate-300 prose-li:text-gray-700 dark:prose-li:text-slate-300 prose-strong:text-gray-900 dark:prose-strong:text-slate-100">
            {children}
        </div>
    </div>
);

export const BrandboardDisplay: React.FC<BrandboardDisplayProps> = ({ 
    brandboardData, 
    validationData, 
    generatedLogo, 
    photographyImages,
    isEditable = false,
}) => {
  const [data, setData] = useState(brandboardData);
  const [logo, setLogo] = useState<string | null>(generatedLogo);
  const [photos, setPhotos] = useState(photographyImages);
  const [showLogoZoom, setShowLogoZoom] = useState(false);

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
      
      // Temporarily force light mode classes for PDF generation consistency
      element.classList.add('pdf-light-theme');
      element.classList.remove('pdf-dark-theme');
      
      alert("Gerando PDF otimizado. Isso pode levar alguns segundos...");

      try {
          const canvas = await html2canvas(element, { 
              scale: 2,
              useCORS: true,
              logging: false,
              backgroundColor: '#ffffff' 
          });
          
          const imgData = canvas.toDataURL('image/jpeg', 0.75);

          const pdf = new jspdf.jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const imgProps = pdf.getImageProperties(imgData);
          const ratio = imgProps.height / imgProps.width;
          
          let imgHeight = pdfWidth * ratio;
          let heightLeft = imgHeight;
          let position = 0;

          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, '', 'FAST');
          heightLeft -= pdfHeight;

          while (heightLeft > 0) {
            position = - (imgHeight - heightLeft);
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, '', 'FAST');
            heightLeft -= pdfHeight;
          }
          
          const sanitizedCompanyName = validationData.companyName
            .replace(/[^a-z0-9]/gi, '_')
            .replace(/_+/g, '_')
            .toLowerCase();
            
          const fileName = `${sanitizedCompanyName}_marketingboard.pdf`;
          
          pdf.save(fileName);
      } catch (error) {
          console.error("Error generating PDF:", error);
          alert("Ocorreu um erro ao gerar o PDF. Tente novamente.");
      } finally {
          element.classList.remove('pdf-light-theme');
      }
  };
  
  const handleDownloadLogo = (variant: 'white' | 'black' | 'transparent') => {
      if (!logo) return;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 500;
          canvas.height = 500;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          if (variant === 'white') {
              // Default draw (usually has white BG from AI)
              ctx.drawImage(img, 0, 0, 500, 500);
          } else if (variant === 'black') {
             // Fill black first
             ctx.fillStyle = '#000000';
             ctx.fillRect(0, 0, 500, 500);
             
             // Process transparency logic (simplified chroma key for near-white removal)
             const tempCanvas = document.createElement('canvas');
             tempCanvas.width = 500;
             tempCanvas.height = 500;
             const tempCtx = tempCanvas.getContext('2d');
             if(tempCtx) {
                 tempCtx.drawImage(img, 0, 0, 500, 500);
                 const imageData = tempCtx.getImageData(0, 0, 500, 500);
                 const data = imageData.data;
                 for (let i = 0; i < data.length; i += 4) {
                     const r = data[i];
                     const g = data[i + 1];
                     const b = data[i + 2];
                     // If pixel is very light (white background), make it transparent
                     if (r > 240 && g > 240 && b > 240) {
                         data[i + 3] = 0; 
                     }
                 }
                 tempCtx.putImageData(imageData, 0, 0);
                 // Draw processed image onto black background
                 ctx.drawImage(tempCanvas, 0, 0);
             }

          } else if (variant === 'transparent') {
             // Draw image
             ctx.drawImage(img, 0, 0, 500, 500);
             // Remove white background
             const imageData = ctx.getImageData(0, 0, 500, 500);
             const data = imageData.data;
             for (let i = 0; i < data.length; i += 4) {
                 const r = data[i];
                 const g = data[i + 1];
                 const b = data[i + 2];
                 if (r > 240 && g > 240 && b > 240) {
                     data[i + 3] = 0; 
                 }
             }
             ctx.putImageData(imageData, 0, 0);
          }
          
          const link = document.createElement('a');
          link.download = `${validationData.companyName}_logo_${variant}_500x500.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
      };
      img.src = logo;
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
              if (!current[keys[i]]) current[keys[i]] = [];
              current = current[keys[i]];
          }
          current[index] = value;
          return newData;
      });
  };

  const updateColor = (type: 'primary' | 'secondary', index: number, hex: string) => {
      setData(prev => {
          const newPalette = JSON.parse(JSON.stringify(prev.part3.colorPalette));
          newPalette[type][index].hex = hex;
          return { ...prev, part3: { ...prev.part3, colorPalette: newPalette }};
      })
  };

  const { part1, part2, part3, part4 } = data;
  
  const initialLogo = validationData.generatedLogo || logo || validationData.logoUrl;
  const isGeneratedLogo = !validationData.logoUrl || (validationData.generatedLogo === initialLogo);

  return (
    <div className="max-w-7xl mx-auto">
       {/* Logo Zoom Modal */}
       {showLogoZoom && initialLogo && (
            <div className="fixed inset-0 z-[100] bg-black/90 flex justify-center items-center p-4" onClick={() => setShowLogoZoom(false)}>
                <button className="absolute top-4 right-4 text-white hover:text-gray-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <img src={initialLogo} alt="Logo Ampliada" className="max-w-full max-h-[90vh] object-contain" onClick={(e) => e.stopPropagation()} />
            </div>
        )}

      {isEditable && (
        <div className="text-center mb-8 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-4 rounded-xl border border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row justify-center items-center gap-4">
            <div>
                <h3 className="text-xl font-bold text-purple-600 dark:text-purple-400 font-['Playfair_Display',_serif]">Seu Marketingboard está pronto!</h3>
                <p className="text-gray-600 dark:text-slate-400 mt-1">Clique em qualquer texto para editar. Quando terminar, salve o resultado como PDF.</p>
            </div>
            <div className="flex gap-4">
              <button
                  onClick={handleDownloadPdf}
                  className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105"
              >
                  Salvar em PDF
              </button>
            </div>
        </div>
      )}
      <div ref={printRef} className="p-4 sm:p-6 md:p-8">
          <header className="text-center mb-12 py-8 bg-white/80 dark:bg-slate-800/50 rounded-2xl border border-gray-200 dark:border-slate-700">
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900 dark:text-slate-100 font-['Playfair_Display',_serif]">{validationData.companyName}</h1>
              <p className="text-lg mt-2 text-gray-500 dark:text-slate-400 tracking-widest uppercase">Marketing Board</p>
          </header>

          <main className="space-y-8">
            {/* --- VISUAL IDENTITY SECTION --- */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                <div className="md:col-span-2">
                    <SectionCard title="Logo Principal">
                         <div 
                            className={`p-4 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 rounded-md flex flex-col justify-center items-center min-h-48 relative group ${isEditable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/50' : ''}`} 
                            onClick={isEditable ? handleLogoUploadClick : () => setShowLogoZoom(true)}
                        >
                            {isEditable && <input type="file" ref={logoInputRef} onChange={handleLogoFileChange} className="hidden" accept="image/*"/>}
                            
                            {initialLogo ? (
                                <>
                                    <img src={initialLogo} alt="Logotipo Principal" className="max-h-40 max-w-full object-contain mb-2" />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                        <span className="bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                                            {isEditable ? "Clique para alterar" : "Clique para ampliar"}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <p className="text-gray-500 dark:text-slate-500">Clique para carregar o logo</p>
                            )}
                        </div>
                        {isGeneratedLogo && initialLogo && (
                            <div className="mt-3 flex flex-col gap-2">
                                <p className="text-xs text-center text-gray-500 font-medium">Baixar Logo:</p>
                                <div className="grid grid-cols-3 gap-2">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDownloadLogo('white'); }}
                                        className="text-[10px] text-center bg-gray-100 border border-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                                        title="Fundo Branco Original"
                                    >
                                        Branco
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDownloadLogo('black'); }}
                                        className="text-[10px] text-center bg-gray-900 text-white px-2 py-1 rounded hover:bg-black transition-colors"
                                        title="Fundo Preto"
                                    >
                                        Preto
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDownloadLogo('transparent'); }}
                                        className="text-[10px] text-center bg-white border border-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-50 transition-colors bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAQUlEQVQYV2NkYGAwYcAP3uTu/2fADxhxyuJlRFRRWlqKrgzLzs7GXYqioiK4ChgYGRkZkU2B80l2K80S5DQMw8gAAB92GxX7h6G8AAAAAElFTkSuQmCC')]"
                                        title="Fundo Transparente (PNG)"
                                    >
                                        <span className="bg-white/80 px-1 rounded">Transp.</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </SectionCard>
                </div>
                <div className="md:col-span-3">
                     <SectionCard title="Paleta de Cores">
                        <div className="flex flex-wrap gap-4">
                          {[
                            ...ensureArray(part3?.colorPalette?.primary), 
                            ...ensureArray(part3?.colorPalette?.secondary), 
                          ].map((color, i) => {
                              const pLen = ensureArray(part3?.colorPalette?.primary).length;
                              
                              const type = i < pLen ? 'primary' : 'secondary';
                              const indexInType = i < pLen ? i : i - pLen;
                              
                              const colorInputRef = useRef<HTMLInputElement>(null);
                              return (
                                  <div key={i} className="text-center group flex-grow">
                                      <div className={`w-20 h-20 mx-auto rounded-full border-4 border-gray-200 dark:border-slate-700 shadow-md ${isEditable ? 'cursor-pointer' : ''}`} style={{backgroundColor: color.hex}} onClick={() => isEditable && colorInputRef.current?.click()}></div>
                                      {isEditable && <input ref={colorInputRef} type="color" value={color.hex} onChange={(e) => updateColor(type, indexInType, e.target.value)} className="w-0 h-0 opacity-0"/>}
                                      <p className="mt-2 font-semibold text-sm text-gray-900 dark:text-slate-100">{color.name}</p>
                                      <p className="text-xs text-gray-500 dark:text-slate-400 uppercase">{color.hex}</p>
                                  </div>
                              );
                          })}
                        </div>
                     </SectionCard>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <SectionCard title="Tipografia">
                    <div className="space-y-6">
                        <div>
                            <p className="text-4xl text-gray-900 dark:text-slate-100" style={{fontFamily: `'${part3?.typography?.primary?.font}', sans-serif`}}>{part3?.typography?.primary?.font ? 'Aa Bb Cc' : 'Título não definido'}</p>
                            <p className="mt-2 font-semibold text-gray-700 dark:text-slate-100">{part3?.typography?.primary?.font}</p>
                            <p className="text-sm text-gray-500 dark:text-slate-400">{part3?.typography?.primary?.usage}</p>
                        </div>
                        <div>
                            <p className="text-lg text-gray-800 dark:text-slate-200" style={{fontFamily: `'${part3?.typography?.secondary?.font}', serif`}}>{part3?.typography?.secondary?.font ? (part2?.slogan || 'O rápido cavalo marrom salta sobre o cão preguiçoso.') : 'Fonte de corpo não definida'}</p>
                            <p className="mt-2 font-semibold text-gray-700 dark:text-slate-100">{part3?.typography?.secondary?.font}</p>
                            <p className="text-sm text-gray-500 dark:text-slate-400">{part3?.typography?.secondary?.usage}</p>
                        </div>
                    </div>
                </SectionCard>
                <SectionCard title="Estilo Fotográfico">
                    <EditableText value={part3?.photographyStyle?.description || ''} onUpdate={v => updateNestedField('part3.photographyStyle.description', v)} className="mb-4" />
                    <div className="grid grid-cols-3 gap-2">
                        {photos.map((img, i) => <div key={i} className="aspect-square"><img src={img} alt={`Imagem de estilo ${i+1}`} className="w-full h-full object-cover rounded-md" /></div>)}
                    </div>
                </SectionCard>
            </div>

            {/* --- BRAND CORE SECTION --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <SectionCard title="Propósito"><EditableText value={part1?.purpose || ''} onUpdate={(v) => updateNestedField('part1.purpose', v)} /></SectionCard>
                <SectionCard title="Missão"><EditableText value={part1?.mission || ''} onUpdate={(v) => updateNestedField('part1.mission', v)} /></SectionCard>
                <SectionCard title="Visão"><EditableText value={part1?.vision || ''} onUpdate={(v) => updateNestedField('part1.vision', v)} /></SectionCard>
                 <SectionCard title="Valores" className="md:col-span-2">
                     <ul className="space-y-2">
                        {ensureArray(part1?.values).map((val: any, i) => {
                            if (typeof val === 'object' && val !== null && (val.name || val.value) && val.description) {
                                const keyToUse = val.name ? 'name' : 'value';
                                const nameOrValue = val[keyToUse];
                                return (
                                    <li key={i}>
                                        <strong>
                                            <EditableText as="span" value={nameOrValue} onUpdate={(v) => updateNestedList('part1.values', i, { ...val, [keyToUse]: v })} />:
                                        </strong>
                                        {' '}
                                        <EditableText as="span" value={val.description} onUpdate={(v) => updateNestedList('part1.values', i, { ...val, description: v })} />
                                    </li>
                                );
                            }
                            return <EditableText key={i} as="li" value={String(val)} onUpdate={(v) => updateNestedList('part1.values', i, v)} />;
                        })}
                    </ul>
                 </SectionCard>
                 <SectionCard title="Arquétipos">
                    <p><strong>Primário: </strong><EditableText value={part1?.archetypes?.primary || ''} onUpdate={(v) => updateNestedField('part1.archetypes.primary', v)} as="span" className="inline"/></p>
                    {part1?.archetypes?.secondary && <p><strong>Secundário: </strong><EditableText value={part1?.archetypes?.secondary || ''} onUpdate={(v) => updateNestedField('part1.archetypes.secondary', v)} as="span" className="inline"/></p>}
                 </SectionCard>
            </div>

            <SectionCard title="Análise de Público e Posicionamento">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div>
                        <h4 className="font-semibold text-base text-gray-900 dark:text-slate-100 mb-2">Público-Alvo Principal</h4>
                        <EditableText value={part1?.audienceAndPositioning?.targetAudience || ''} onUpdate={(v) => updateNestedField('part1.audienceAndPositioning.targetAudience', v)} />
                    </div>
                    <div>
                        <h4 className="font-semibold text-base text-gray-900 dark:text-slate-100 mb-2">Diferenciais Competitivos</h4>
                        <ul className="list-disc list-inside space-y-1">
                            {ensureArray(part1?.audienceAndPositioning?.differentiators).map((item, i) => (
                                <EditableText as="li" key={i} value={item} onUpdate={(v) => updateNestedList('part1.audienceAndPositioning.differentiators', i, v)} />
                            ))}
                        </ul>
                    </div>
                    <div className="md:col-span-2">
                        <h4 className="font-semibold text-base text-gray-900 dark:text-slate-100 mb-2">Concorrentes Principais</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {ensureArray(part1?.audienceAndPositioning?.competitors).map((item, i) => (
                              <li key={i}>
                                  <EditableText as="span" value={item.name} onUpdate={(v) => updateNestedList('part1.audienceAndPositioning.competitors', i, { ...item, name: v })} />
                                  {item.link && (
                                      <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-purple-600 dark:text-purple-400 hover:underline ml-2 text-xs">[link]</a>
                                  )}
                              </li>
                          ))}
                        </ul>
                    </div>
                    <div className="md:col-span-2">
                        <h4 className="font-semibold text-base text-gray-900 dark:text-slate-100 mb-2">Declaração de Posicionamento</h4>
                        <div className="italic bg-gray-50 dark:bg-slate-900/50 p-3 rounded-md border-l-4 border-purple-500 text-gray-700 dark:text-slate-300">
                            <EditableText value={part1?.audienceAndPositioning?.positioningStatement || ''} onUpdate={(v) => updateNestedField('part1.audienceAndPositioning.positioningStatement', v)} />
                        </div>
                    </div>
                </div>
            </SectionCard>

            <SectionCard title="Identidade Verbal">
                 <div className="text-center mb-8">
                    <h3 className="text-3xl font-bold italic font-['Playfair_Display',_serif] text-gray-900 dark:text-slate-100">
                        "<EditableText value={part2?.slogan || ''} onUpdate={(v) => updateNestedField('part2.slogan', v)} as="span"/>"
                    </h3>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h4 className="font-semibold text-base text-gray-900 dark:text-slate-100 mb-2">Personalidade da Voz</h4>
                        <EditableText value={part2?.voicePersonality || ''} onUpdate={(v) => updateNestedField('part2.voicePersonality', v)} />
                    </div>
                    <div>
                        <h4 className="font-semibold text-base text-gray-900 dark:text-slate-100 mb-2">Mensagens-Chave</h4>
                        <p><strong>Produto: </strong><EditableText as="span" value={part2?.keyMessages?.product || ''} onUpdate={(v) => updateNestedField('part2.keyMessages.product', v)}/></p>
                        <p><strong>Benefício: </strong><EditableText as="span" value={part2?.keyMessages?.benefit || ''} onUpdate={(v) => updateNestedField('part2.keyMessages.benefit', v)}/></p>
                        <p><strong>Marca: </strong><EditableText as="span" value={part2?.keyMessages?.brand || ''} onUpdate={(v) => updateNestedField('part2.keyMessages.brand', v)}/></p>
                    </div>
                    <div className="md:col-span-2">
                        <h4 className="font-semibold text-base text-gray-900 dark:text-slate-100 mb-2">Pilares de Conteúdo</h4>
                         <ul className="list-disc list-inside space-y-1">
                            {ensureArray(part2?.contentPillars).map((item, i) => (
                              <li key={i}>
                                  <strong>
                                      <EditableText as="span" value={item.name} onUpdate={(v) => updateNestedList('part2.contentPillars', i, { ...item, name: v })} />:
                                  </strong>
                                  {' '}
                                  <EditableText as="span" value={item.description || ''} onUpdate={(v) => updateNestedList('part2.contentPillars', i, { ...item, description: v })} />
                              </li>
                            ))}
                        </ul>
                    </div>
                 </div>
            </SectionCard>
            
            <SectionCard title="Estratégia de Canal">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-slate-100 mb-4 font-['Playfair_Display',_serif]">Personas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {ensureArray(part4?.personas).map((persona, i) => (
                    <div key={i} className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 space-y-2">
                        <h4 className="font-bold text-base text-purple-600 dark:text-purple-400">
                            <EditableText as="span" value={persona.name} onUpdate={(v) => updateNestedField(`part4.personas.${i}.name`, v)} />
                        </h4>
                        <p><strong>História: </strong><EditableText as="span" value={persona.story} onUpdate={(v) => updateNestedField(`part4.personas.${i}.story`, v)} /></p>
                        <p><strong>Dores: </strong><EditableText as="span" value={persona.pains} onUpdate={(v) => updateNestedField(`part4.personas.${i}.pains`, v)} /></p>
                        <p><strong>Objetivos: </strong><EditableText as="span" value={persona.goals} onUpdate={(v) => updateNestedField(`part4.personas.${i}.goals`, v)} /></p>
                        <p><strong>Como Ajudamos: </strong><EditableText as="span" value={persona.howWeHelp} onUpdate={(v) => updateNestedField(`part4.personas.${i}.howWeHelp`, v)} /></p>
                    </div>
                ))}
              </div>
              
              <h3 className="font-semibold text-lg text-gray-900 dark:text-slate-100 mb-4 font-['Playfair_Display',_serif]">Jornada do Cliente</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-center mb-8">
                {['discovery', 'consideration', 'decision', 'loyalty'].map((stageKey) => {
                    const stageData = part4?.customerJourney?.[stageKey as keyof typeof part4.customerJourney];
                    const titles: Record<string, string> = {discovery: 'Descoberta', consideration: 'Consideração', decision: 'Decisão', loyalty: 'Fidelização'};
                    if(!stageData) return null;
                    return (
                        <div key={stageKey} className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-500/20">
                            <h4 className="font-bold text-purple-700 dark:text-purple-300 uppercase text-xs tracking-wider">{titles[stageKey]}</h4>
                            <p className="mt-1 text-gray-700 dark:text-slate-300 text-sm"><EditableText as="span" value={stageData.goal} onUpdate={(v) => updateNestedField(`part4.customerJourney.${stageKey}.goal`, v)}/></p>
                        </div>
                    );
                })}
              </div>

              <h3 className="font-semibold text-lg text-gray-900 dark:text-slate-100 mb-4 font-['Playfair_Display',_serif]">Matriz de Canais</h3>
               <div className="space-y-4">
                    {ensureArray(part4?.channelMatrix).map((channel, i) => (
                        <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-x-4 gap-y-1 items-center bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg border border-gray-200 dark:border-slate-700">
                           <div className="font-bold text-gray-900 dark:text-slate-100"><EditableText as="span" value={channel.channel} onUpdate={(v) => updateNestedField(`part4.channelMatrix.${i}.channel`, v)} /></div>
                           <div className="md:col-span-2"><span className="font-medium md:hidden">Propósito: </span><EditableText as="span" value={channel.mainPurpose} onUpdate={(v) => updateNestedField(`part4.channelMatrix.${i}.mainPurpose`, v)} /></div>
                           <div><span className="font-medium md:hidden">Métricas: </span><EditableText as="span" value={channel.successMetrics} onUpdate={(v) => updateNestedField(`part4.channelMatrix.${i}.successMetrics`, v)} /></div>
                        </div>
                    ))}
              </div>
            </SectionCard>
          </main>

          <footer className="text-center mt-12 pt-6 border-t border-gray-200 dark:border-slate-700">
              <p className="text-sm text-gray-500 dark:text-slate-500 tracking-widest uppercase">WWW.{validationData.companyName.toLowerCase().replace(/\s+/g, '')}.COM</p>
          </footer>
      </div>
      <style>{`
          /* Scoped styles for PDF generation - FORCED LIGHT THEME */
          .pdf-light-theme {
            background-color: #ffffff !important;
            color: #333333 !important;
            font-family: 'Georgia', serif;
          }
          .pdf-light-theme h1, .pdf-light-theme h2, .pdf-light-theme h3, .pdf-light-theme h4 {
            color: #111827 !important; /* gray-900 */
          }
           .pdf-light-theme p, .pdf-light-theme li {
            color: #374151 !important; /* gray-700 */
          }
          .pdf-light-theme header, .pdf-light-theme footer {
            border-color: #e5e7eb !important; /* gray-200 */
             background-color: #f9fafb !important; /* gray-50 */
          }
          .pdf-light-theme .prose-p\:text-slate-300, .pdf-light-theme .prose-li\:text-slate-300 {
              color: #374151 !important; /* gray-700 */
          }
          .pdf-light-theme .text-slate-100, .pdf-light-theme .prose-strong\:text-slate-100 {
            color: #111827 !important; /* gray-900 */
          }
          .pdf-light-theme .text-slate-400 {
            color: #6b7280 !important; /* gray-500 */
          }
          .pdf-light-theme .text-purple-400 {
            color: #8b5cf6 !important; /* purple-500 */
          }
          .pdf-light-theme .bg-slate-800\/50, .pdf-light-theme .bg-slate-900\/50 {
             background-color: #f9fafb !important; /* gray-50 */
          }
          .pdf-light-theme .border-slate-700 {
             border-color: #e5e7eb !important; /* gray-200 */
          }
      `}</style>
    </div>
  );
};