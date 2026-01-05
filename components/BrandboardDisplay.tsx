import React, { useRef, useState, useEffect } from 'react';
import type { BrandboardData, ValidationData } from '../types';

declare var html2canvas: any;
declare var jspdf: any;

interface BrandboardDisplayProps {
  brandboardData: BrandboardData;
  validationData: ValidationData;
  generatedLogo: string | null;
  photographyImages: string[];
  archetypeImage: string | null;
  personaImages: string[];
  isEditable?: boolean;
}

const EditableText: React.FC<{ value: string; onUpdate: (newValue: string) => void; className?: string; as?: 'p' | 'h4' | 'li' | 'span' }> = ({ value, onUpdate, className, as: Component = 'p' }) => {
    return (
        <Component
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => onUpdate(e.currentTarget.textContent || '')}
            className={`focus:outline-none focus:bg-gray-100 dark:focus:bg-slate-700/50 focus:ring-2 focus:ring-purple-400 rounded-sm px-1 -mx-1 ${className}`}
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

const EditorialSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mb-20">
        <h2 className="text-5xl md:text-6xl font-light text-gray-400 dark:text-slate-600 tracking-tighter mb-10 border-b border-gray-100 dark:border-slate-800 pb-4">{title}</h2>
        <div className="space-y-12">
            {children}
        </div>
    </section>
);

const SubSection: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={className}>
        <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-200 tracking-tight mb-4 uppercase text-sm font-display tracking-widest">{title}</h3>
        <div className="prose prose-lg prose-slate dark:prose-invert max-w-none prose-p:text-gray-600 dark:prose-p:text-slate-400 prose-li:text-gray-600 dark:prose-li:text-slate-400 prose-strong:text-gray-800 dark:prose-strong:text-slate-200">
            {children}
        </div>
    </div>
);

const LogoVariantCard: React.FC<{ 
    title: string; 
    imageSrc: string | null; 
    variant: 'original' | 'dark' | 'light' | 'gray';
    onDownload: () => void; 
    isLoading?: boolean;
    onUpload?: () => void;
}> = ({ title, imageSrc, variant, onDownload, isLoading, onUpload }) => {
    
    let bgClass = 'bg-gray-200 dark:bg-slate-700'; 

    if (variant === 'light') {
        bgClass = 'bg-slate-800 dark:bg-slate-900'; 
    } else if (variant === 'dark') {
        bgClass = 'bg-gray-100 dark:bg-slate-200';
    }

    return (
        <div className={`flex flex-col items-center rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-slate-600 ${bgClass} p-4 transition-transform hover:scale-[1.02]`}>
            <p className={`text-xs uppercase tracking-wider font-semibold mb-3 ${variant === 'light' ? 'text-slate-300' : 'text-gray-500 dark:text-slate-500'}`}>{title}</p>
            <div className="h-32 w-full flex items-center justify-center mb-4 relative group">
                 {isLoading ? (
                     <div className="animate-spin h-8 w-8 border-4 border-purple-500 rounded-full border-t-transparent"></div>
                 ) : imageSrc ? (
                    <>
                        <img src={imageSrc} alt={title} className="max-h-full max-w-full object-contain drop-shadow-sm" />
                        {onUpload && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={onUpload}>
                                <span className="bg-black/70 text-white text-xs px-2 py-1 rounded">Alterar</span>
                            </div>
                        )}
                    </>
                 ) : (
                    <span className="text-gray-400 text-xs">Sem imagem</span>
                 )}
            </div>
            {imageSrc && !isLoading && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onDownload(); }}
                    className="w-full bg-slate-800 dark:bg-slate-900 text-white text-xs font-bold py-2 px-4 rounded-md hover:bg-black dark:hover:bg-black transition-colors"
                >
                    Baixar
                </button>
            )}
        </div>
    )
}

export const BrandboardDisplay: React.FC<BrandboardDisplayProps> = ({ 
    brandboardData, 
    validationData, 
    generatedLogo, 
    photographyImages,
    archetypeImage,
    personaImages,
    isEditable = false,
}) => {
  const [data, setData] = useState(brandboardData);
  const [logo, setLogo] = useState<string | null>(generatedLogo);
  const [logoVariations, setLogoVariations] = useState<{
      original: string | null;
      grayscale: string | null;
      black: string | null;
      white: string | null;
  }>({ original: null, grayscale: null, black: null, white: null });
  
  const [photos, setPhotos] = useState(photographyImages);
  const [archImage, setArchImage] = useState(archetypeImage);
  const [pImages, setPImages] = useState(personaImages);
  const [isProcessingLogos, setIsProcessingLogos] = useState(false);
  
  const formattedDate = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());

  useEffect(() => {
    setData(brandboardData);
    setLogo(validationData.generatedLogo || generatedLogo);
    setPhotos(photographyImages);
    setArchImage(archetypeImage);
    setPImages(personaImages);
  }, [brandboardData, generatedLogo, photographyImages, validationData, archetypeImage, personaImages]);

  // Generate variations whenever logo changes
  useEffect(() => {
      const baseLogo = validationData.generatedLogo || logo || validationData.logoUrl;
      
      // Check if it's an external URL (simplified check)
      const isExternal = baseLogo && (base64 => !base64.startsWith('data:'));

      if (!baseLogo) {
          setLogoVariations({ original: null, grayscale: null, black: null, white: null });
          return;
      }

      if (isExternal) {
          // If external, we can't process easily due to CORS without a proxy, so we skip variations or just show original
          setLogoVariations({ original: baseLogo, grayscale: null, black: null, white: null });
          return;
      }

      setIsProcessingLogos(true);
      
      const process = async () => {
          try {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = baseLogo;
            await new Promise((resolve, reject) => { 
                img.onload = resolve; 
                img.onerror = () => {
                    console.error("Failed to load image for processing.");
                    reject(new Error("Image load failed"));
                };
            });

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return;

            canvas.width = 500;
            canvas.height = 500;

            // Keep aspect ratio
            const scale = Math.min(500 / img.width, 500 / img.height);
            const x = (500 / 2) - (img.width / 2) * scale;
            const y = (500 / 2) - (img.height / 2) * scale;
            
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
            
            const imageData = ctx.getImageData(0, 0, 500, 500);
            const imgData = imageData.data;

            const isWhite = (r: number, g: number, b: number) => r > 240 && g > 240 && b > 240;

            const originalData = new ImageData(new Uint8ClampedArray(imgData), 500, 500);
            const grayData = new ImageData(new Uint8ClampedArray(imgData), 500, 500);
            const blackData = new ImageData(new Uint8ClampedArray(imgData), 500, 500);
            const whiteData = new ImageData(new Uint8ClampedArray(imgData), 500, 500);

            for (let i = 0; i < imgData.length; i += 4) {
                const r = imgData[i], g = imgData[i+1], b = imgData[i+2];

                // Simple background removal for white pixels
                if (isWhite(r, g, b) && imgData[i+3] > 0) {
                    [originalData, grayData, blackData, whiteData].forEach(d => d.data[i+3] = 0);
                } else {
                    const gray = r * 0.3 + g * 0.59 + b * 0.11;
                    grayData.data[i] = gray; grayData.data[i+1] = gray; grayData.data[i+2] = gray;
                    blackData.data[i] = 0; blackData.data[i+1] = 0; blackData.data[i+2] = 0;
                    whiteData.data[i] = 255; whiteData.data[i+1] = 255; whiteData.data[i+2] = 255;
                }
            }
            
            const toUrl = (d: ImageData) => {
                const c = document.createElement('canvas');
                c.width = 500; c.height = 500;
                c.getContext('2d')?.putImageData(d, 0, 0);
                return c.toDataURL('image/png');
            };

            setLogoVariations({
                original: toUrl(originalData),
                grayscale: toUrl(grayData),
                black: toUrl(blackData),
                white: toUrl(whiteData)
            });

          } catch (e) {
              console.error("Error processing logo variations", e);
              setLogoVariations({ original: baseLogo, grayscale: null, black: null, white: null });
          } finally {
              setIsProcessingLogos(false);
          }
      };

      process();

  }, [logo, validationData.generatedLogo, validationData.logoUrl]);

  const printRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadPdf = async () => {
      const element = printRef.current;
      if (!element) return;
      
      const originalButtonText = "Salvar em PDF";
      const btn = document.activeElement as HTMLButtonElement;
      if(btn && btn.innerText === originalButtonText) btn.innerText = "Gerando PDF...";
      
      const clone = element.cloneNode(true) as HTMLElement;
      
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.top = '-10000px';
      container.style.left = '0';
      container.style.width = '1200px'; 
      container.className = document.documentElement.classList.contains('dark') ? 'dark' : 'light'; 
      
      const elementsToRemove = clone.querySelectorAll('button, input[type="file"], input[type="color"]');
      elementsToRemove.forEach(el => el.remove());

      container.appendChild(clone);
      document.body.appendChild(container);

      await new Promise(resolve => setTimeout(resolve, 500));

      try {
          const canvas = await html2canvas(clone, { 
              scale: 2,
              useCORS: true,
              logging: false,
              backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
              width: 1200,
              windowWidth: 1200 
          });
          
          const imgData = canvas.toDataURL('image/jpeg', 0.90);

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
          document.body.removeChild(container);
          if(btn && btn.innerText === "Gerando PDF...") btn.innerText = originalButtonText;
      }
  };
  
  const handleDownloadSingleLogo = (dataUrl: string | null, suffix: string) => {
      if (!dataUrl) return;
      const link = document.createElement('a');
      link.download = `${validationData.companyName.replace(/\s+/g, '_')}_logo_${suffix}.png`;
      link.href = dataUrl;
      link.click();
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
            if (!current[keys[i]]) current[keys[i]] = {}; 
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

  const { part1, part2, part3, part4 } = data;

  return (
    <div className="max-w-5xl mx-auto font-['Poppins',_sans-serif]">
      {isEditable && (
        <div className="text-center mb-12 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-4 rounded-xl border border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row justify-center items-center gap-4">
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
      <div ref={printRef} className="p-4 sm:p-6 md:p-12 bg-white dark:bg-slate-900 shadow-2xl rounded-sm">
          
          <header className="mb-20 border-b-2 border-gray-900 dark:border-white pb-8">
              <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">BRAND PLATFORM</h1>
                    <h2 className="text-xl text-gray-500 dark:text-gray-400 uppercase tracking-widest">{validationData.companyName}</h2>
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-400 dark:text-slate-500 uppercase tracking-widest">{formattedDate}</p>
                </div>
              </div>
          </header>

          <main className="space-y-24">
            
            <EditorialSection title="Strategy Core">
                {part1?.productStrategy && (
                    <SubSection title="Produtos & Serviços">
                        <EditableText value={part1.productStrategy.description} onUpdate={v => updateNestedField('part1.productStrategy.description', v)} />
                        <div className="mt-2 text-sm text-gray-500">
                             <strong>Categoria:</strong> {part1.productStrategy.category}
                        </div>
                    </SubSection>
                )}
                 <SubSection title="Propósito & Fundamentos">
                    <div className="grid md:grid-cols-3 gap-8">
                        <div>
                            <p className="font-bold text-purple-600 dark:text-purple-400 mb-2">Propósito</p>
                            <EditableText value={part1?.purpose || ''} onUpdate={v => updateNestedField('part1.purpose', v)} className="text-sm" />
                        </div>
                        <div>
                            <p className="font-bold text-purple-600 dark:text-purple-400 mb-2">Missão</p>
                            <EditableText value={part1?.mission || ''} onUpdate={v => updateNestedField('part1.mission', v)} className="text-sm" />
                        </div>
                        <div>
                            <p className="font-bold text-purple-600 dark:text-purple-400 mb-2">Visão</p>
                            <EditableText value={part1?.vision || ''} onUpdate={v => updateNestedField('part1.vision', v)} className="text-sm" />
                        </div>
                    </div>
                </SubSection>
                <SubSection title="Valores">
                    <div className="grid sm:grid-cols-2 gap-6">
                        {ensureArray(part1?.values).map((val: any, i) => (
                           <div key={i} className="border-l-2 border-gray-200 dark:border-slate-700 pl-4">
                                <h4 className="font-bold text-lg"><EditableText as="span" value={val.name} onUpdate={v => updateNestedList('part1.values', i, {...val, name: v})} /></h4>
                                <EditableText as="span" value={val.description} onUpdate={v => updateNestedList('part1.values', i, {...val, description: v})} className="text-sm text-gray-600 dark:text-slate-400" />
                            </div>
                        ))}
                    </div>
                </SubSection>
                <SubSection title="Arquétipos de Marca">
                     <div className="flex flex-col md:flex-row gap-8 items-center">
                        <div className="flex-1">
                             <p className="text-lg"><strong>Primário:</strong> <EditableText as="span" value={part1?.archetypes?.primary || ''} onUpdate={v => updateNestedField('part1.archetypes.primary', v)} /></p>
                             {part1?.archetypes?.secondary && <p className="text-gray-500"><strong>Secundário:</strong> <EditableText as="span" value={part1.archetypes.secondary} onUpdate={v => updateNestedField('part1.archetypes.secondary', v)} /></p>}
                        </div>
                        {archImage && (
                            <div className="w-full md:w-1/3">
                                <img src={archImage} alt="Archetype representation" className="w-full h-auto rounded-lg shadow-md grayscale hover:grayscale-0 transition-all duration-500" />
                            </div>
                        )}
                     </div>
                </SubSection>
                <SubSection title="Público & Posicionamento">
                    <p className="mb-4"><EditableText value={part1?.audienceAndPositioning?.targetAudience || ''} onUpdate={v => updateNestedField('part1.audienceAndPositioning.targetAudience', v)} /></p>
                    <div className="bg-gray-50 dark:bg-slate-800 p-6 rounded-lg border border-gray-100 dark:border-slate-700">
                        <p className="font-bold text-gray-400 text-xs uppercase mb-2">Declaração de Posicionamento</p>
                        <p className="italic text-lg text-gray-800 dark:text-slate-200">"<EditableText as="span" value={part1?.audienceAndPositioning?.positioningStatement || ''} onUpdate={v => updateNestedField('part1.audienceAndPositioning.positioningStatement', v)} />"</p>
                    </div>
                </SubSection>
            </EditorialSection>

            <EditorialSection title="Verbal Identity">
                <SubSection title="Slogan / Tagline">
                    <p className="text-5xl font-serif italic text-gray-800 dark:text-slate-200 leading-tight">
                        "<EditableText as="span" value={part2?.slogan || ''} onUpdate={v => updateNestedField('part2.slogan', v)} />"
                    </p>
                </SubSection>
                <div className="grid md:grid-cols-2 gap-12">
                    <SubSection title="Personalidade da Voz">
                         <EditableText value={part2?.voicePersonality || ''} onUpdate={v => updateNestedField('part2.voicePersonality', v)} />
                    </SubSection>
                    <SubSection title="Tom de Voz">
                        <ul className="space-y-2 text-sm">
                            <li><strong>Vendas:</strong> <EditableText as="span" value={part2?.toneOfVoiceApplication?.sales || ''} onUpdate={v => updateNestedField('part2.toneOfVoiceApplication.sales', v)} /></li>
                            <li><strong>Suporte:</strong> <EditableText as="span" value={part2?.toneOfVoiceApplication?.support || ''} onUpdate={v => updateNestedField('part2.toneOfVoiceApplication.support', v)} /></li>
                            <li><strong>Conteúdo:</strong> <EditableText as="span" value={part2?.toneOfVoiceApplication?.content || ''} onUpdate={v => updateNestedField('part2.toneOfVoiceApplication.content', v)} /></li>
                        </ul>
                    </SubSection>
                </div>
                <SubSection title="Diretrizes Práticas">
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <h4 className="font-bold text-green-600 mb-4">SOMOS</h4>
                            <ul className="space-y-3">
                                {ensureArray(part2?.practicalGuidelines?.weAre).map((item, i) => (
                                    <li key={i} className="text-sm">
                                        <strong><EditableText as="span" value={item.trait} onUpdate={v => updateNestedList('part2.practicalGuidelines.weAre', i, {...item, trait: v})} />:</strong>
                                        <br/>
                                        <EditableText as="span" value={item.description} onUpdate={v => updateNestedList('part2.practicalGuidelines.weAre', i, {...item, description: v})} className="text-gray-500" />
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-red-600 mb-4">NÃO SOMOS</h4>
                            <ul className="space-y-3">
                                {ensureArray(part2?.practicalGuidelines?.weAreNot).map((item, i) => (
                                    <li key={i} className="text-sm">
                                        <strong><EditableText as="span" value={item.trait} onUpdate={v => updateNestedList('part2.practicalGuidelines.weAreNot', i, {...item, trait: v})} />:</strong>
                                        <br/>
                                        <EditableText as="span" value={item.description} onUpdate={v => updateNestedList('part2.practicalGuidelines.weAreNot', i, {...item, description: v})} className="text-gray-500" />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </SubSection>
                <SubSection title="Mensagens-Chave">
                     <div className="grid md:grid-cols-3 gap-6">
                        <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded">
                            <h5 className="font-bold text-xs uppercase text-gray-400 mb-2">Produto</h5>
                            <EditableText value={part2?.keyMessages?.product || ''} onUpdate={v => updateNestedField('part2.keyMessages.product', v)} className="text-sm" />
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded">
                            <h5 className="font-bold text-xs uppercase text-gray-400 mb-2">Benefício</h5>
                            <EditableText value={part2?.keyMessages?.benefit || ''} onUpdate={v => updateNestedField('part2.keyMessages.benefit', v)} className="text-sm" />
                        </div>
                         <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded">
                            <h5 className="font-bold text-xs uppercase text-gray-400 mb-2">Marca</h5>
                            <EditableText value={part2?.keyMessages?.brand || ''} onUpdate={v => updateNestedField('part2.keyMessages.brand', v)} className="text-sm" />
                        </div>
                     </div>
                </SubSection>
                 <SubSection title="Pilares de Conteúdo">
                    <div className="flex flex-wrap gap-4">
                        {ensureArray(part2?.contentPillars).map((pillar, i) => (
                            <div key={i} className="flex-1 min-w-[200px] border border-gray-200 dark:border-slate-700 p-4 rounded-lg">
                                <h4 className="font-bold text-purple-600 dark:text-purple-400 mb-1"><EditableText as="span" value={pillar.name} onUpdate={v => updateNestedList('part2.contentPillars', i, {...pillar, name: v})} /></h4>
                                <EditableText as="span" value={pillar.description} onUpdate={v => updateNestedList('part2.contentPillars', i, {...pillar, description: v})} className="text-xs text-gray-500" />
                            </div>
                        ))}
                    </div>
                </SubSection>
            </EditorialSection>

            <EditorialSection title="Visual Identity">
                <SubSection title="Logotipo">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <LogoVariantCard title="Versão Original" variant="original" imageSrc={logoVariations.original || logo} isLoading={isProcessingLogos} onDownload={() => handleDownloadSingleLogo(logoVariations.original || logo, 'original')} onUpload={isEditable ? handleLogoUploadClick : undefined} />
                        <LogoVariantCard title="Versão Flat (Cinza)" variant="gray" imageSrc={logoVariations.grayscale} isLoading={isProcessingLogos} onDownload={() => handleDownloadSingleLogo(logoVariations.grayscale, 'flat_gray')} />
                        <LogoVariantCard title="Versão Light (Branco)" variant="light" imageSrc={logoVariations.white} isLoading={isProcessingLogos} onDownload={() => handleDownloadSingleLogo(logoVariations.white, 'light_white')} />
                        <LogoVariantCard title="Versão Dark (Preto)" variant="dark" imageSrc={logoVariations.black} isLoading={isProcessingLogos} onDownload={() => handleDownloadSingleLogo(logoVariations.black, 'dark_black')} />
                    </div>
                    {/* Hidden file input for logo upload */}
                    <input type="file" ref={logoInputRef} onChange={handleLogoFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
                </SubSection>
                 <SubSection title="Paleta de Cores">
                    <div className="flex flex-wrap gap-8">
                      {[...ensureArray(part3?.colorPalette?.primary), ...ensureArray(part3?.colorPalette?.secondary)].map((color, i) => (
                          <div key={i} className="text-center group">
                              <div className="w-24 h-24 mx-auto rounded-full shadow-lg group-hover:scale-110 transition-transform duration-300 border-4 border-white dark:border-slate-800" style={{backgroundColor: color.hex}}></div>
                              <p className="mt-4 font-bold text-gray-800 dark:text-slate-200">{color.name}</p>
                              <p className="text-sm text-gray-400 dark:text-slate-500 uppercase font-mono">{color.hex}</p>
                          </div>
                      ))}
                    </div>
                 </SubSection>
                 <SubSection title="Tipografia">
                    <div className="space-y-12">
                        <div className="border-b border-gray-100 dark:border-slate-800 pb-8">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Primária (Títulos)</span>
                            <p className="text-6xl md:text-8xl text-gray-900 dark:text-white leading-none" style={{fontFamily: `'${part3?.typography?.primary?.font}', sans-serif`}}>{part3?.typography?.primary?.font}</p>
                            <p className="mt-4 text-gray-500">{part3?.typography?.primary?.usage}</p>
                        </div>
                        <div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Secundária (Corpo)</span>
                            <div className="grid md:grid-cols-2 gap-8 items-center">
                                <p className="text-4xl text-gray-700 dark:text-slate-300" style={{fontFamily: `'${part3?.typography?.secondary?.font}', serif`}}>Aa Bb Cc Dd 123</p>
                                <p className="text-gray-500">{part3?.typography?.secondary?.usage}</p>
                            </div>
                        </div>
                    </div>
                 </SubSection>
                 <SubSection title="Estilo Fotográfico">
                    <EditableText value={part3?.photographyStyle?.description || ''} onUpdate={v => updateNestedField('part3.photographyStyle.description', v)} className="mb-6 block" />
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {photos.map((img, i) => <img key={i} src={img} alt={`Style example ${i+1}`} className="w-full h-64 object-cover rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300" />)}
                    </div>
                 </SubSection>
            </EditorialSection>
            
            <EditorialSection title="Channel Strategy">
                 <SubSection title="Personas">
                     <div className="grid grid-cols-1 gap-12">
                        {ensureArray(part4?.personas).map((persona, i) => (
                            <div key={i} className="flex flex-col md:flex-row gap-8 bg-gray-50 dark:bg-slate-800/50 p-8 rounded-2xl">
                                {pImages[i] && (
                                    <div className="w-full md:w-1/3 flex-shrink-0">
                                         <img src={pImages[i]} alt={persona.name} className="w-full h-auto rounded-xl shadow-lg object-cover aspect-square" />
                                    </div>
                                )}
                                <div className="space-y-4 flex-grow">
                                    <h4 className="text-3xl font-bold text-gray-900 dark:text-white"><EditableText as="span" value={persona.name} onUpdate={v => updateNestedField(`part4.personas.${i}.name`, v)} /></h4>
                                    
                                    <div>
                                        <p className="text-xs font-bold text-purple-600 uppercase mb-1">História</p>
                                        <EditableText as="p" value={persona.story} onUpdate={v => updateNestedField(`part4.personas.${i}.story`, v)} className="text-sm" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs font-bold text-red-500 uppercase mb-1">Dores</p>
                                            <EditableText as="p" value={persona.pains} onUpdate={v => updateNestedField(`part4.personas.${i}.pains`, v)} className="text-sm" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-green-500 uppercase mb-1">Objetivos</p>
                                            <EditableText as="p" value={persona.goals} onUpdate={v => updateNestedField(`part4.personas.${i}.goals`, v)} className="text-sm" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                     </div>
                 </SubSection>
                 
                 <SubSection title="Jornada do Cliente">
                    <div className="grid md:grid-cols-4 gap-4 mt-8">
                         {['discovery', 'consideration', 'decision', 'loyalty'].map((stage) => {
                             const data = part4?.customerJourney?.[stage as keyof typeof part4.customerJourney];
                             const labels: Record<string, string> = { discovery: 'Descoberta', consideration: 'Consideração', decision: 'Decisão', loyalty: 'Fidelização' };
                             return (
                                 <div key={stage} className="bg-white dark:bg-slate-800 border-t-4 border-purple-500 p-4 shadow-sm">
                                     <h4 className="font-bold text-lg mb-2">{labels[stage]}</h4>
                                     <p className="text-xs font-bold text-gray-400 uppercase mb-1">O que acontece</p>
                                     <EditableText value={data?.description || ''} onUpdate={v => updateNestedField(`part4.customerJourney.${stage}.description`, v)} className="text-sm mb-4" />
                                     <p className="text-xs font-bold text-gray-400 uppercase mb-1">Nosso Objetivo</p>
                                     <EditableText value={data?.goal || ''} onUpdate={v => updateNestedField(`part4.customerJourney.${stage}.goal`, v)} className="text-sm text-purple-600" />
                                 </div>
                             )
                         })}
                    </div>
                 </SubSection>

                 <SubSection title="Matriz de Canais">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm whitespace-nowrap">
                            <thead className="uppercase tracking-wider border-b-2 border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                                <tr>
                                    <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Canal</th>
                                    <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Propósito</th>
                                    <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Público</th>
                                    <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Métrica de Sucesso</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                {ensureArray(part4?.channelMatrix).map((channel, i) => (
                                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                            <EditableText as="span" value={channel.channel} onUpdate={v => updateNestedList('part4.channelMatrix', i, {...channel, channel: v})} />
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-slate-400 whitespace-normal max-w-xs">
                                            <EditableText as="span" value={channel.mainPurpose} onUpdate={v => updateNestedList('part4.channelMatrix', i, {...channel, mainPurpose: v})} />
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-slate-400">
                                            <EditableText as="span" value={channel.audience} onUpdate={v => updateNestedList('part4.channelMatrix', i, {...channel, audience: v})} />
                                        </td>
                                        <td className="px-6 py-4 text-purple-600 dark:text-purple-400 font-medium">
                                            <EditableText as="span" value={channel.successMetrics} onUpdate={v => updateNestedList('part4.channelMatrix', i, {...channel, successMetrics: v})} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                 </SubSection>
            </EditorialSection>

          </main>
      </div>
    </div>
  );
};