import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { UrlInputForm } from './components/UrlInputForm';
import { ValidationModal } from './components/ValidationModal';
import { LoadingOverlay } from './components/LoadingOverlay';
import { BrandboardDisplay } from './components/BrandboardDisplay';
import { AppLogo } from './components/AppLogo';
import { StepResultDisplay } from './components/StepResultDisplay';
import { HomePage } from './components/HomePage';
import { StartOptions } from './components/StartOptions';
import { IdeaForm } from './components/IdeaForm';
import { AnalysisDisplay } from './components/AnalysisDisplay';
import { CandidateSelectionModal } from './components/CandidateSelectionModal';
import { Stepper } from './components/Stepper';
import { ConceptBriefingDisplay } from './components/ConceptBriefingDisplay';
import { 
  findCompanyCandidates,
  getFullCompanyInfo,
  createConceptFromIdea,
  generateBrandboardPart1, 
  generateBrandboardPart2, 
  generateBrandboardPart3, 
  generateBrandboardPart4, 
  generateImage,
  analyzeLogo,
  getCompanyAnalysis,
} from './services/geminiService';
import type { ValidationData, BrandboardData, CompanyCandidate } from './types';

type AppStep = 'HOME' | 'CHOOSE_MODE' | 'FORM_INPUT' | 'VALIDATING' | 'SELECTING_CANDIDATE' | 'CONFIRM_VALIDATION' | 'CONFIRM_CONCEPT' | 'GENERATING' | 'CONFIRM_ANALYSIS' | 'CONFIRM_STEP' | 'FINAL_DISPLAY';
type FormMode = 'NEW_IDEA' | 'EXISTING_COMPANY';

interface FormData {
  name: string;
  address: string;
  city: string;
  site: string;
  instagram: string;
}

// Icons for Theme Toggle
const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

// Helper to convert File to Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

function App() {
  const [currentStep, setCurrentStep] = useState<AppStep>('HOME');
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  const [validationData, setValidationData] = useState<ValidationData | null>(null);
  const [companyCandidates, setCompanyCandidates] = useState<CompanyCandidate[] | null>(null);
  const [userCoords, setUserCoords] = useState<{latitude: number, longitude: number} | null>(null);
  const [userInstagram, setUserInstagram] = useState<string>(''); // Store Instagram handle
  
  const [brandboardData, setBrandboardData] = useState<Partial<BrandboardData>>({});
  const [stepTitle, setStepTitle] = useState('');
  const [generatedLogo, setGeneratedLogo] = useState<string | null>(null);
  const [photographyImages, setPhotographyImages] = useState<string[]>([]);
  const [archetypeImage, setArchetypeImage] = useState<string | null>(null);
  const [personaImages, setPersonaImages] = useState<string[]>([]);
  
  const [streamingText, setStreamingText] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const requestLocation = useCallback(() => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserCoords({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
            },
            () => {
                console.warn("O usuário negou a permissão de geolocalização.");
            }
        );
    }
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const handleError = (message: string, error: unknown) => {
    console.error(error);
    alert(message);
    setCurrentStep('CHOOSE_MODE'); // Go back to a safe state
    setLoadingMessage('');
    setIsStreaming(false);
  };

  const resetState = () => {
    setCurrentStep('HOME');
    setFormMode(null);
    setBrandboardData({});
    setValidationData(null);
    setCompanyCandidates(null);
    setGeneratedLogo(null);
    setPhotographyImages([]);
    setArchetypeImage(null);
    setPersonaImages([]);
    setLoadingMessage('');
    setStreamingText('');
    setIsStreaming(false);
    setUserInstagram('');
  };
  
  const startValidation = () => {
    setCurrentStep('VALIDATING');
    setLoadingMessage('Buscando empresas...');
    setBrandboardData({});
  }

  const handleFormSubmit = useCallback(async ({ name, address, city, site, instagram }: FormData) => {
    startValidation();
    setUserInstagram(instagram); // Persist Instagram
    
    try {
        let finalUrl = site.trim();
        if (finalUrl && !finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
            finalUrl = `https://${finalUrl}`;
        }
        
        const candidates = await findCompanyCandidates(name, city, address, finalUrl, userCoords || undefined, instagram);

        if (candidates.length === 0) {
            throw new Error('COMPANY_NOT_FOUND');
        }

        if (candidates.length === 1 && candidates[0].matchType === 'EXATO_NA_CIDADE') {
            setLoadingMessage('Empresa encontrada! Obtendo detalhes...');
            const fullInfo = await getFullCompanyInfo(candidates[0], instagram);
            setValidationData(fullInfo);
            setCurrentStep('CONFIRM_VALIDATION');
        } else {
            setCompanyCandidates(candidates);
            setCurrentStep('SELECTING_CANDIDATE');
        }

    } catch (error) {
        const errorMessage = error instanceof Error && error.message === 'COMPANY_NOT_FOUND' 
            ? 'Não encontramos nenhuma empresa com os dados fornecidos. Verifique se o nome e a cidade estão corretos e tente novamente.'
            : 'Ocorreu um erro ao buscar as empresas. Por favor, tente novamente.';
        handleError(errorMessage, error);
    } finally {
        setLoadingMessage('');
    }
  }, [userCoords]);

  const handleCandidateSelect = async (candidate: CompanyCandidate) => {
    setCurrentStep('VALIDATING');
    setLoadingMessage('Confirmando seleção e obtendo detalhes...');
    setCompanyCandidates(null);
    try {
        const fullInfo = await getFullCompanyInfo(candidate, userInstagram);
        setValidationData(fullInfo);
        setCurrentStep('CONFIRM_VALIDATION');
    } catch (error) {
        handleError('Não foi possível obter os detalhes completos da empresa selecionada. Tente novamente.', error);
    } finally {
        setLoadingMessage('');
    }
  };


  const handleIdeaFormSubmit = useCallback(async (data: {name: string, description: string, segment: string, city: string, country: string, benchmarks: string, investment: string}) => {
    setCurrentStep('VALIDATING');
    setLoadingMessage('Criando conceito da sua nova marca...');
    setBrandboardData({});

    try {
        const validationResult = await createConceptFromIdea(data);
        setValidationData(validationResult);
        setCurrentStep('CONFIRM_CONCEPT');
    } catch (error) {
        handleError('Não foi possível criar o conceito da marca. Verifique os dados e tente novamente.', error);
    } finally {
        setLoadingMessage('');
    }
  }, []);

  const startGenerationFromAnalysis = useCallback(async (dataForGeneration?: any) => {
    const dataToUse = (dataForGeneration && typeof dataForGeneration === 'object' && dataForGeneration.companyName) 
      ? dataForGeneration 
      : validationData;

    if (!dataToUse) return;

    try {
      setCurrentStep('GENERATING');
      setStreamingText('');
      setIsStreaming(true);
      
      const part1Data = await generateBrandboardPart1(dataToUse, setStreamingText, setLoadingMessage);
      
      setBrandboardData(part1Data);
      setStepTitle('3. Núcleo da Marca');
      setCurrentStep('CONFIRM_STEP');

    } catch (error) {
       handleError('Falha ao gerar a Parte 1 do marketingboard.', error);
    } finally {
        setIsStreaming(false);
    }
  }, [validationData]);

  const handleConceptConfirm = useCallback(async (updatedData: ValidationData, logoFile: File | null) => {
      let dataWithLogoAnalysis: ValidationData = { ...updatedData };

      if (logoFile) {
          setCurrentStep('GENERATING');
          setLoadingMessage("Analisando seu logotipo...");
          try {
              const base64 = await fileToBase64(logoFile);
              const logoAnalysis = await analyzeLogo(base64);
              dataWithLogoAnalysis.uploadedLogoAnalysis = logoAnalysis;
              dataWithLogoAnalysis.generatedLogo = `data:${logoFile.type};base64,${base64}`;
              setGeneratedLogo(dataWithLogoAnalysis.generatedLogo);
          } catch (error) {
              handleError("Falha ao analisar o logotipo. Verifique o arquivo e tente novamente.", error);
              return;
          }
      }
      
      setValidationData(dataWithLogoAnalysis);
      startGenerationFromAnalysis(dataWithLogoAnalysis);
  }, [startGenerationFromAnalysis]);

 const startAnalysis = useCallback(async (dataForAnalysis: ValidationData) => {
    let finalData = { ...dataForAnalysis };
    try {
        if (formMode === 'EXISTING_COMPANY') {
            setCurrentStep('GENERATING');
            setLoadingMessage('Realizando pesquisa profunda sobre a empresa...');
            setIsStreaming(true);
            setStreamingText('');
            
            const { analysisText, sources } = await getCompanyAnalysis(dataForAnalysis, setStreamingText);
            
            finalData = {
                ...finalData,
                companyAnalysis: analysisText,
                companyAnalysisSources: sources
            };
        }
        
        setValidationData(finalData);
        setCurrentStep('CONFIRM_ANALYSIS');

    } catch (error) {
        handleError('Falha ao realizar a análise profunda da empresa.', error);
    } finally {
        setIsStreaming(false);
    }
}, [formMode]);

  const handleValidationConfirm = async (updatedValidationData: ValidationData, logoFile: File | null) => {
      // Use the updated data from the modal (which includes manual edits)
      let dataWithLogoAnalysis: ValidationData = { ...updatedValidationData };
      setValidationData(dataWithLogoAnalysis); // Update state

      if (logoFile) {
          setCurrentStep('GENERATING');
          setLoadingMessage("Analisando seu logotipo...");
          try {
              const base64 = await fileToBase64(logoFile);
              const logoAnalysis = await analyzeLogo(base64);
              dataWithLogoAnalysis.uploadedLogoAnalysis = logoAnalysis;
              dataWithLogoAnalysis.generatedLogo = `data:${logoFile.type};base64,${base64}`;
              setGeneratedLogo(dataWithLogoAnalysis.generatedLogo);
          } catch (error) {
              handleError("Falha ao analisar o logotipo. Verifique o arquivo e tente novamente.", error);
              return;
          }
      }
      
      await startAnalysis(dataWithLogoAnalysis);
  };

  const handleStepConfirm = useCallback(async (updatedData: any, newGeneratedLogo?: string | null) => {
    const currentPart = Object.keys(brandboardData).length;
    
    const newBrandboardData = JSON.parse(JSON.stringify(brandboardData));
    
    const stepKey = `part${currentPart}` as keyof BrandboardData;
    newBrandboardData[stepKey] = updatedData;

    setBrandboardData(newBrandboardData);
    if(newGeneratedLogo) {
        const logoDataUrl = `data:image/png;base64,${newGeneratedLogo}`;
        setGeneratedLogo(logoDataUrl);
        if(validationData){
            setValidationData({...validationData, generatedLogo: logoDataUrl })
        }
    }
    
    const finalValidationData = validationData!;
    
    try {
        setCurrentStep('GENERATING');
        setStreamingText('');
        let finalData = { ...newBrandboardData };

        if (currentPart === 1) {
            setIsStreaming(false);
            if (updatedData.archetypes?.imagePrompt) {
                setLoadingMessage('Gerando representação visual do arquétipo...');
                try {
                    const img = await generateImage(updatedData.archetypes.imagePrompt, 'archetype');
                    setArchetypeImage(`data:image/png;base64,${img}`);
                } catch (e) {
                    console.error("Failed to generate archetype image", e);
                }
            }

            setIsStreaming(true);
            const part2Data = await generateBrandboardPart2(finalValidationData, finalData, setStreamingText, setLoadingMessage);
            finalData = { ...finalData, ...part2Data };
            setBrandboardData(finalData);
            setStepTitle('4. Identidade Verbal');
            setCurrentStep('CONFIRM_STEP');

        } else if (currentPart === 2) { 
            setIsStreaming(true);
            const part3Data = await generateBrandboardPart3(finalValidationData, finalData, setStreamingText, setLoadingMessage);
            finalData = { ...finalData, ...part3Data };
            setBrandboardData(finalData);
            setStepTitle('5. Identidade Visual');
            setCurrentStep('CONFIRM_STEP');

        } else if (currentPart === 3) { 
            setIsStreaming(false);
            setLoadingMessage('Gerando ativos visuais...');
            if (finalData.part3?.photographyStyle?.imagePrompts) {
                const prompts = finalData.part3.photographyStyle.imagePrompts.slice(0, 3);
                const images = [];
                for (let i = 0; i < prompts.length; i++) {
                    setLoadingMessage(`Gerando imagem de estilo (${i + 1} de ${prompts.length})...`);
                    await new Promise(resolve => setTimeout(resolve, 3000)); 
                    const img = await generateImage(prompts[i], 'moodboard');
                    images.push(`data:image/png;base64,${img}`);
                }
                setPhotographyImages(images);
            }
            
            setIsStreaming(true);
            const part4Data = await generateBrandboardPart4(finalValidationData, finalData, setStreamingText, setLoadingMessage);
            finalData = { ...finalData, ...part4Data };
            setBrandboardData(finalData);
            setStepTitle('6. Estratégia de Canais');
            setCurrentStep('CONFIRM_STEP');

        } else if (currentPart === 4) { 
            setIsStreaming(false);
            setLoadingMessage('Finalizando...');

            if (updatedData.personas) {
                const personas = updatedData.personas;
                const images = [];
                for (let i = 0; i < personas.length; i++) {
                    if (personas[i].imagePrompt) {
                        setLoadingMessage(`Gerando retrato da persona ${i + 1}...`);
                        try {
                            const img = await generateImage(personas[i].imagePrompt, 'persona');
                            images.push(`data:image/png;base64,${img}`);
                        } catch(e) {
                             images.push(''); // placeholder
                             console.error("Failed persona image", e);
                        }
                    }
                }
                setPersonaImages(images);
            }

            if (!generatedLogo && !validationData?.uploadedLogoAnalysis && finalData.part3?.logo?.prompt) {
                setLoadingMessage('Gerando logotipo final...');
                await new Promise(resolve => setTimeout(resolve, 2000));
                const logo = await generateImage(finalData.part3.logo.prompt, 'logo');
                setGeneratedLogo(`data:image/png;base64,${logo}`);
            }
            setCurrentStep('FINAL_DISPLAY');
        }
    } catch (error) {
        handleError(`Falha ao gerar a próxima etapa do marketingboard.`, error);
    } finally {
        setIsStreaming(false);
    }

  }, [validationData, brandboardData, generatedLogo]);

  const handleBack = () => {
    const currentPart = Object.keys(brandboardData).length;
    if (currentPart > 1) {
        const newBrandboardData = { ...brandboardData };
        const keyToRemove = 
            currentPart === 4 ? 'part4' :
            currentPart === 3 ? 'part3' :
            currentPart === 2 ? 'part2' :
            null;

        if (keyToRemove && newBrandboardData[keyToRemove as keyof BrandboardData]) {
            delete newBrandboardData[keyToRemove as keyof BrandboardData];
        }

        setBrandboardData(newBrandboardData);
        
        const newStepNumber = Object.keys(newBrandboardData).length;
        const titles: Record<number, string> = {
            1: '3. Núcleo da Marca',
            2: '4. Identidade Verbal',
            3: '5. Identidade Visual',
            4: '6. Estratégia de Canais',
        };
        setStepTitle(titles[newStepNumber]);
        setCurrentStep('CONFIRM_STEP');

    } else if (currentStep === 'CONFIRM_STEP' && currentPart === 1) {
        setCurrentStep(formMode === 'EXISTING_COMPANY' ? 'CONFIRM_ANALYSIS' : 'CONFIRM_CONCEPT');
    } else {
        setCurrentStep(formMode === 'EXISTING_COMPANY' ? 'CONFIRM_VALIDATION' : 'FORM_INPUT');
    }
  };
  
  const handleStartOptionSelect = (mode: FormMode) => {
    setFormMode(mode);
    setCurrentStep('FORM_INPUT');
  };

  const stepperSteps = ['1. Início', '2. Diagnóstico', '3. Núcleo da Marca', '4. Identidade Verbal', '5. Identidade Visual', '6. Estratégia de Canais', '7. Resultado Final'];
  const activeStepIndex = useMemo(() => {
      switch (currentStep) {
          case 'HOME':
          case 'CHOOSE_MODE':
          case 'FORM_INPUT':
          case 'VALIDATING':
          case 'SELECTING_CANDIDATE':
          case 'CONFIRM_VALIDATION':
          case 'CONFIRM_CONCEPT':
              return 0; // 1. Início
          case 'CONFIRM_ANALYSIS':
              return 1; // 2. Diagnóstico
          case 'CONFIRM_STEP':
              return Object.keys(brandboardData).length + 1; // +1 for validation/concept, +1 for analysis = index 2+
          case 'FINAL_DISPLAY':
              return stepperSteps.length - 1; // 7. Resultado Final
          case 'GENERATING':
              if (formMode === 'EXISTING_COMPANY' && !validationData?.companyAnalysis) {
                   return 1; // Generating 'Diagnóstico'
              }
              const partCount = Object.keys(brandboardData).length;
              if (partCount === 0) return 2; // Generating 'Núcleo'
              if (partCount === 4) return 6; // Finalizing for 'Resultado Final'
              return partCount + 2; // Mapping parts to steps
          default:
              return 0;
      }
  }, [currentStep, brandboardData, validationData, formMode, stepperSteps.length]);
  
  const isWideLayout = ['FORM_INPUT', 'VALIDATING', 'CONFIRM_STEP', 'CONFIRM_CONCEPT'].includes(currentStep);

  const renderContent = () => {
    switch(currentStep) {
      case 'HOME':
        return <HomePage onStart={() => setCurrentStep('CHOOSE_MODE')} />;
      case 'CHOOSE_MODE':
        return <div className="max-w-7xl mx-auto py-10 px-4 sm:px-8"><StartOptions onSelect={handleStartOptionSelect} /></div>;
      case 'FORM_INPUT':
      case 'VALIDATING':
        if (formMode === 'NEW_IDEA') {
          return <IdeaForm 
                    onSubmit={handleIdeaFormSubmit} 
                    isLoading={currentStep === 'VALIDATING'} 
                    onBack={() => setCurrentStep('CHOOSE_MODE')} 
                  />;
        }
        return <UrlInputForm 
                  onSubmit={handleFormSubmit} 
                  isLoading={currentStep === 'VALIDATING'} 
                  onBack={() => setCurrentStep('CHOOSE_MODE')}
                />;
      case 'CONFIRM_CONCEPT':
        return (
            <ConceptBriefingDisplay
              validationData={validationData}
              onConfirm={handleConceptConfirm}
              onBack={() => setCurrentStep('FORM_INPUT')}
            />
        );
      case 'CONFIRM_ANALYSIS':
        return (
          <div className="max-w-7xl mx-auto py-10 px-4 sm:px-8">
            <AnalysisDisplay
              analysisText={validationData?.companyAnalysis}
              sources={validationData?.companyAnalysisSources}
              onConfirm={startGenerationFromAnalysis}
              onBack={() => setCurrentStep('CONFIRM_VALIDATION')}
            />
          </div>
        );
      case 'CONFIRM_STEP':
        const stepNumber = Object.keys(brandboardData).length;
        const stepDataForDisplay = brandboardData[`part${stepNumber}` as keyof BrandboardData];

        return (
          <StepResultDisplay
            title={stepTitle}
            stepData={stepDataForDisplay}
            onConfirm={handleStepConfirm}
            onBack={handleBack}
            stepNumber={stepNumber}
            brandboardData={brandboardData}
            validationData={validationData!}
          />
        );
      case 'FINAL_DISPLAY':
        return (
            <div className="py-10 px-4 sm:px-8">
                <BrandboardDisplay 
                  brandboardData={brandboardData as BrandboardData}
                  validationData={validationData!} 
                  generatedLogo={generatedLogo}
                  photographyImages={photographyImages}
                  archetypeImage={archetypeImage}
                  personaImages={personaImages}
                  isEditable={true}
                />
            </div>
        );
      case 'GENERATING':
      default:
         return null;
    }
  }

  return (
    <div className="min-h-screen transition-colors duration-500 bg-white dark:bg-brand-dark text-gray-900 dark:text-gray-100 font-sans">
      {['GENERATING', 'VALIDATING'].includes(currentStep) && <LoadingOverlay message={loadingMessage} streamingText={isStreaming ? streamingText : undefined} />}
      
      {(currentStep !== 'HOME' && currentStep !== 'FINAL_DISPLAY') && (
        <header className="pt-6 px-4 sm:px-8 bg-white/90 dark:bg-brand-dark/90 backdrop-blur-md sticky top-0 z-40 border-b border-gray-100 dark:border-white/5 shadow-sm transition-colors duration-300">
          <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-3 items-center mb-4">
                  <div className="justify-self-start">
                  </div>
                   <div className="flex items-center justify-center space-x-3 overflow-hidden cursor-pointer" onClick={() => resetState()}>
                      <AppLogo />
                      <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 dark:text-white whitespace-nowrap font-display">
                          Marketingboard
                      </h1>
                  </div>
                   <div className="flex items-center gap-4 justify-self-end">
                    <button 
                      onClick={toggleTheme} 
                      className="p-2 rounded-full bg-gray-100 dark:bg-brand-surface hover:bg-gray-200 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
                    >
                      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                    </button>
                  </div>
              </div>
              
              <div className="w-full">
                  <div className="px-2 pb-4">
                    <Stepper steps={stepperSteps} currentStepIndex={activeStepIndex} />
                  </div>
              </div>
          </div>
        </header>
      )}

      <main className={isWideLayout ? '' : 'py-10 px-4 sm:px-8'}>
        {renderContent()}
      </main>

      <CandidateSelectionModal
        isVisible={currentStep === 'SELECTING_CANDIDATE'}
        candidates={companyCandidates || []}
        onSelect={handleCandidateSelect}
        onReject={() => resetState()}
      />

      <ValidationModal 
        isVisible={currentStep === 'CONFIRM_VALIDATION'}
        onConfirm={handleValidationConfirm}
        onCancel={() => resetState()}
        onReject={() => setCurrentStep('FORM_INPUT')}
        validationData={validationData}
      />

    </div>
  );
}

export default App;