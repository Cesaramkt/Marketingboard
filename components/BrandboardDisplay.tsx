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
        <h2 className="text-5xl md:text-6xl font-light text-gray-400 dark:text-slate-600 tracking-tighter mb-10">{title}</h2>
        <div className="space-y-12">
            {children}
        </div>
    </section>
);

const SubSection: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={className}>
        <h3 className="text-2xl font-semibold text-gray-800 dark:text-slate-200 tracking-tight mb-4">{title}</h3>
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
    
    let bgClass = 'bg-gray-200 dark:bg-slate-700'; // Default/Flat style

    if (variant === 'light') {
        bgClass = 'bg-slate-700 dark:bg-slate-800'; // Dark bg for light logo
    } else if (variant === 'dark') {
        bgClass = 'bg-gray-200 dark:bg-slate-300';
    }

    return (
        <div className={`flex flex-col items-center rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-slate-600 ${bgClass} p-4 transition-transform hover:scale-[1.02]`}>
            <p className={`text-xs uppercase tracking-wider font-semibold mb-3 ${variant === 'light' ? 'text-slate-300' : 'text-gray-500 dark:text-slate-400'}`}>{title}</p>
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
  const [isProcessingLogos, setIsProcessingLogos] = useState(false);
  
  const formattedDate = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());

  useEffect(() => {
    setData(brandboardData);
    setLogo(validationData.generatedLogo || generatedLogo);
    setPhotos(photographyImages);
  }, [brandboardData, generatedLogo, photographyImages, validationData]);

  // Generate variations whenever logo changes
  useEffect(() => {
      const baseLogo = validationData.generatedLogo || logo || validationData.logoUrl;
      if (!baseLogo) return;

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

            ctx.drawImage(img, 0, 0, 500, 500);
            const imageData = ctx.getImageData(0, 0, 500, 500);
            const imgData = imageData.data;

            const isWhite = (r: number, g: number, b: number) => r > 240 && g > 240 && b > 240;

            const originalData = new ImageData(new Uint8ClampedArray(imgData), 500, 500);
            const grayData = new ImageData(new Uint8ClampedArray(imgData), 500, 500);
            const blackData = new ImageData(new Uint8ClampedArray(imgData), 500, 500);
            const whiteData = new ImageData(new Uint8ClampedArray(imgData), 500, 500);

            for (let i = 0; i < imgData.length; i += 4) {
                const r = imgData[i], g = imgData[i+1], b = imgData[i+2];

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
      <div ref={printRef} className="p-4 sm:p-6 md:p-12 bg-white dark:bg-slate-900">
          
          <header className="mb-20">
              {logo && <img src={logo} alt="Logo" className="max-h-12 mb-8" />}
              <h1 className="text-4xl font-bold text-gray-800 dark:text-slate-200 mb-2">Brand Platform</h1>
              <p className="text-sm text-gray-500 dark:text-slate-500">Updated {formattedDate}</p>
          </header>

          <main className="space-y-16">
            
            {photographyImages && photographyImages.length > 0 && (
                <section className="mb-20">
                    <img src={photographyImages[0]} alt="Brand mood" className="w-full h-auto object-cover rounded-lg shadow-lg" />
                </section>
            )}

            <EditorialSection title="Brand Strategy + Positioning">
                {part1?.productStrategy && (
                    <SubSection title="What We Sell">
                        <EditableText value={part1.productStrategy.description} onUpdate={v => updateNestedField('part1.productStrategy.description', v)} />
                    </SubSection>
                )}
                 <SubSection title="Our Core">
                    <p><strong>Purpose:</strong> <EditableText as="span" value={part1?.purpose || ''} onUpdate={v => updateNestedField('part1.purpose', v)} /></p>
                    <p><strong>Mission:</strong> <EditableText as="span" value={part1?.mission || ''} onUpdate={v => updateNestedField('part1.mission', v)} /></p>
                    <p><strong>Vision:</strong> <EditableText as="span" value={part1?.vision || ''} onUpdate={v => updateNestedField('part1.vision', v)} /></p>
                </SubSection>
                <SubSection title="Our Values">
                    <ul className="list-none p-0 m-0 space-y-2">
                        {ensureArray(part1?.values).map((val: any, i) => (
                           <li key={i}>
                                <strong><EditableText as="span" value={val.name} onUpdate={v => updateNestedList('part1.values', i, {...val, name: v})} />:</strong>
                                {' '}
                                <EditableText as="span" value={val.description} onUpdate={v => updateNestedList('part1.values', i, {...val, description: v})} />
                            </li>
                        ))}
                    </ul>
                </SubSection>
                <SubSection title="Our Audience">
                    <EditableText value={part1?.audienceAndPositioning?.targetAudience || ''} onUpdate={v => updateNestedField('part1.audienceAndPositioning.targetAudience', v)} />
                </SubSection>
            </EditorialSection>

            <EditorialSection title="Verbal Identity">
                <SubSection title="Slogan">
                    <p className="text-4xl font-serif italic text-gray-800 dark:text-slate-200">
                        "<EditableText as="span" value={part2?.slogan || ''} onUpdate={v => updateNestedField('part2.slogan', v)} />"
                    </p>
                </SubSection>
                <SubSection title="Voice & Tone">
                     <p><strong>Personality:</strong> <EditableText as="span" value={part2?.voicePersonality || ''} onUpdate={v => updateNestedField('part2.voicePersonality', v)} /></p>
                </SubSection>
            </EditorialSection>

            <EditorialSection title="Visual Identity">
                <SubSection title="Logo">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <LogoVariantCard title="Versão Original" variant="original" imageSrc={logoVariations.original || logo} isLoading={isProcessingLogos} onDownload={() => handleDownloadSingleLogo(logoVariations.original || logo, 'original')} onUpload={isEditable ? handleLogoUploadClick : undefined} />
                        <LogoVariantCard title="Versão Flat (Cinza)" variant="gray" imageSrc={logoVariations.grayscale} isLoading={isProcessingLogos} onDownload={() => handleDownloadSingleLogo(logoVariations.grayscale, 'flat_gray')} />
                        <LogoVariantCard title="Versão Light (Branco)" variant="light" imageSrc={logoVariations.white} isLoading={isProcessingLogos} onDownload={() => handleDownloadSingleLogo(logoVariations.white, 'light_white')} />
                        <LogoVariantCard title="Versão Dark (Preto)" variant="dark" imageSrc={logoVariations.black} isLoading={isProcessingLogos} onDownload={() => handleDownloadSingleLogo(logoVariations.black, 'dark_black')} />
                    </div>
                </SubSection>
                 <SubSection title="Color Palette">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
                      {[...ensureArray(part3?.colorPalette?.primary), ...ensureArray(part3?.colorPalette?.secondary)].map((color, i) => (
                          <div key={i} className="text-center">
                              <div className="w-24 h-24 mx-auto rounded-full shadow-inner" style={{backgroundColor: color.hex}}></div>
                              <p className="mt-3 font-bold text-gray-800 dark:text-slate-200">{color.name}</p>
                              <p className="text-sm text-gray-500 dark:text-slate-500 uppercase">{color.hex}</p>
                          </div>
                      ))}
                    </div>
                 </SubSection>
                 <SubSection title="Typography">
                    <div className="space-y-8">
                        <div>
                            <p className="text-6xl text-gray-800 dark:text-slate-200" style={{fontFamily: `'${part3?.typography?.primary?.font}', sans-serif`}}>{part3?.typography?.primary?.font}</p>
                            <p className="mt-2 text-sm text-gray-500 dark:text-slate-500">{part3?.typography?.primary?.usage}</p>
                        </div>
                        <div>
                            <p className="text-xl text-gray-700 dark:text-slate-300" style={{fontFamily: `'${part3?.typography?.secondary?.font}', serif`}}>{part2?.slogan || 'The quick brown fox jumps over the lazy dog.'}</p>
                            <p className="mt-2 text-sm text-gray-500 dark:text-slate-500">{part3?.typography?.secondary?.usage}</p>
                        </div>
                    </div>
                 </SubSection>
                 <SubSection title="Photography Style">
                    <EditableText value={part3?.photographyStyle?.description || ''} onUpdate={v => updateNestedField('part3.photographyStyle.description', v)} />
                     <div className="grid grid-cols-2 gap-4 mt-6">
                        {photos.slice(1).map((img, i) => <img key={i} src={img} alt={`Style example ${i+2}`} className="w-full h-auto object-cover rounded-md" />)}
                    </div>
                 </SubSection>
            </EditorialSection>
            
            <EditorialSection title="Channel Strategy">
                 <SubSection title="Personas">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {ensureArray(part4?.personas).map((persona, i) => (
                            <div key={i} className="space-y-2">
                                <h4 className="text-xl font-bold text-gray-800 dark:text-slate-200"><EditableText as="span" value={persona.name} onUpdate={v => updateNestedField(`part4.personas.${i}.name`, v)} /></h4>
                                <p><strong>Story:</strong> <EditableText as="span" value={persona.story} onUpdate={v => updateNestedField(`part4.personas.${i}.story`, v)} /></p>
                                <p><strong>Pains:</strong> <EditableText as="span" value={persona.pains} onUpdate={v => updateNestedField(`part4.personas.${i}.pains`, v)} /></p>
                                <p><strong>Goals:</strong> <EditableText as="span" value={persona.goals} onUpdate={v => updateNestedField(`part4.personas.${i}.goals`, v)} /></p>
                            </div>
                        ))}
                     </div>
                 </SubSection>
            </EditorialSection>

          </main>
      </div>
    </div>
  );
};
