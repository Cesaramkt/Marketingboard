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

type AppStep = 'HOME' | 'CHOOSE_MODE' | 'FORM_INPUT' | 'VALIDATING' | 'SELECTING_CANDIDATE' | 'CONFIRM_VALIDATION' | 'GENERATING' | 'CONFIRM_ANALYSIS' | 'CONFIRM_STEP' | 'FINAL_DISPLAY';
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
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
  
  const [brandboardData, setBrandboardData] = useState<Partial<BrandboardData>>({});
  const [stepTitle, setStepTitle] = useState('');
  const [generatedLogo, setGeneratedLogo] = useState<string | null>(null);
  const [photographyImages, setPhotographyImages] = useState<string[]>([]);
  
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
    setLoadingMessage('');
    setStreamingText('');
    setIsStreaming(false);
  };
  
  const startValidation = () => {
    setCurrentStep('VALIDATING');
    setLoadingMessage('Buscando empresas...');
    setBrandboardData({});
  }

  const handleFormSubmit = useCallback(async ({ name, address, city, site, instagram }: FormData) => {
    startValidation();
    
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
            const fullInfo = await getFullCompanyInfo(candidates[0]);
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
        const fullInfo = await getFullCompanyInfo(candidate);
        setValidationData(fullInfo);
        setCurrentStep('CONFIRM_VALIDATION');
    } catch (error) {
        handleError('Não foi possível obter os detalhes completos da empresa selecionada. Tente novamente.', error);
    } finally {
        setLoadingMessage('');
    }
  };


  const handleIdeaFormSubmit = useCallback(async (name: string, description: string, segment: string, benchmarks: string) => {
    setCurrentStep('VALIDATING');
    setLoadingMessage('Criando conceito da sua nova marca...');
    setBrandboardData({});

    try {
        const data = await createConceptFromIdea(name, description, segment, benchmarks);
        setValidationData(data);
        setCurrentStep('CONFIRM_VALIDATION');
    } catch (error) {
        handleError('Não foi possível criar o conceito da marca. Verifique os dados e tente novamente.', error);
    } finally {
        setLoadingMessage('');
    }
  }, []);

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

  const startGenerationFromAnalysis = useCallback(async () => {
    if (!validationData) return;

    try {
      setCurrentStep('GENERATING');
      setStreamingText('');
      setIsStreaming(true);
      
      const part1Data = await generateBrandboardPart1(validationData, setStreamingText, setLoadingMessage);
      
      setBrandboardData(part1Data);
      setStepTitle('1. O Núcleo da Marca (Quem Somos)');
      setCurrentStep('CONFIRM_STEP');

    } catch (error) {
       handleError('Falha ao gerar a Parte 1 do marketingboard.', error);
    } finally {
        setIsStreaming(false);
    }
  }, [validationData]);


  const handleValidationConfirm = async (logoFile: File | null) => {
      let dataWithLogoAnalysis: ValidationData = { ...validationData! };

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
    
    // Assert the key type to avoid "any" type error
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
            setIsStreaming(true);
            const part2Data = await generateBrandboardPart2(finalValidationData, finalData, setStreamingText, setLoadingMessage);
            finalData = { ...finalData, ...part2Data };
            setBrandboardData(finalData);
            setStepTitle('2. Identidade Verbal (Como Falamos)');
            setCurrentStep('CONFIRM_STEP');
        } else if (currentPart === 2) { 
            setIsStreaming(true);
            const part3Data = await generateBrandboardPart3(finalValidationData, finalData, setStreamingText, setLoadingMessage);
            finalData = { ...finalData, ...part3Data };
            setBrandboardData(finalData);
            setStepTitle('3. Identidade Visual (Como Nos Mostramos)');
            setCurrentStep('CONFIRM_STEP');
        } else if (currentPart === 3) { 
            setIsStreaming(false);
            setLoadingMessage('Gerando ativos visuais...');
            if (finalData.part3?.photographyStyle?.imagePrompts) {
                const prompts = finalData.part3.photographyStyle.imagePrompts.slice(0, 3);
                const images = [];
                for (let i = 0; i < prompts.length; i++) {
                    setLoadingMessage(`Gerando imagem de estilo (${i + 1} de ${prompts.length})...`);
                    await new Promise(resolve => setTimeout(resolve, 2000)); 
                    const img = await generateImage(prompts[i], 'moodboard');
                    images.push(`data:image/png;base64,${img}`);
                }
                setPhotographyImages(images);
            }
            
            setIsStreaming(true);
            const part4Data = await generateBrandboardPart4(finalValidationData, finalData, setStreamingText, setLoadingMessage);
            finalData = { ...finalData, ...part4Data };
            setBrandboardData(finalData);
            setStepTitle('4. Estratégia de Canal (Onde Atuamos)');
            setCurrentStep('CONFIRM_STEP');
        } else if (currentPart === 4) { 
            setIsStreaming(false);
            setLoadingMessage('Finalizando...');
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
        const titles = [
          '1. O Núcleo da Marca (Quem Somos)', 
          '2. Identidade Verbal (Como Falamos)', 
          '3. Identidade Visual (Como Nos Mostramos)', 
          '4. Estratégia de Canal (Onde Atuamos)'
        ];
        setStepTitle(titles[newStepNumber - 1]);
        setCurrentStep('CONFIRM_STEP');

    } else {
        setCurrentStep('CONFIRM_VALIDATION');
    }
  };
  
  const handleStartOptionSelect = (mode: FormMode) => {
    setFormMode(mode);
    setCurrentStep('FORM_INPUT');
  };

  const stepperSteps = ['Validação', 'Análise', 'Núcleo', 'Verbal', 'Visual', 'Canais', 'Final'];
  const activeStepIndex = useMemo(() => {
      switch (currentStep) {
          case 'HOME':
          case 'CHOOSE_MODE':
          case 'FORM_INPUT':
          case 'VALIDATING':
          case 'SELECTING_CANDIDATE':
          case 'CONFIRM_VALIDATION':
              return 0;
          case 'CONFIRM_ANALYSIS':
              return 1;
          case 'CONFIRM_STEP':
              return Object.keys(brandboardData).length + 1;
          case 'FINAL_DISPLAY':
              return stepperSteps.length - 1;
          case 'GENERATING':
              if (!validationData?.companyAnalysis) {
                   return 1; // Generating 'Análise'
              }
              const partCount = Object.keys(brandboardData).length;
              if (partCount === 4) return 6; // Finalizing
              return partCount + 2;
          default:
              return 0;
      }
  }, [currentStep, brandboardData, validationData, stepperSteps.length]);
  
  const renderContent = () => {
    switch(currentStep) {
      case 'HOME':
        return <HomePage onStart={() => setCurrentStep('CHOOSE_MODE')} />;
      case 'CHOOSE_MODE':
        return <StartOptions onSelect={handleStartOptionSelect} />
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
      case 'CONFIRM_ANALYSIS':
        return (
          <AnalysisDisplay
            analysisText={validationData?.companyAnalysis}
            sources={validationData?.companyAnalysisSources}
            onConfirm={startGenerationFromAnalysis}
            onBack={() => setCurrentStep('CONFIRM_VALIDATION')}
          />
        );
      case 'CONFIRM_STEP':
        const stepNumber = Object.keys(brandboardData).length;
        // Safe usage with type assertion or check
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
            <BrandboardDisplay 
              brandboardData={brandboardData as BrandboardData}
              validationData={validationData!} 
              generatedLogo={generatedLogo}
              photographyImages={photographyImages}
              isEditable={true}
            />
        );
      case 'GENERATING':
      default:
         return null;
    }
  }

  return (
    <div className="min-h-screen transition-colors duration-500 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-200 font-['Poppins',_sans_serif]">
      {['GENERATING', 'VALIDATING'].includes(currentStep) && <LoadingOverlay message={loadingMessage} streamingText={isStreaming ? streamingText : undefined} />}
      
      {currentStep !== 'HOME' && (
        <header className="pt-6 px-4 sm:px-8 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 border-b border-gray-200 dark:border-slate-800 shadow-lg transition-colors duration-300">
          <div className="max-w-7xl mx-auto">
              <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-3 overflow-hidden cursor-pointer" onClick={() => resetState()}>
                      <AppLogo />
                      <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 dark:text-slate-100 whitespace-nowrap font-['Playfair_Display',_serif]">
                          Gerador de Marketingboard
                      </h1>
                  </div>
                   <div className="flex items-center gap-4">
                    <button 
                      onClick={toggleTheme} 
                      className="p-2 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
                      title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
                    >
                      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                    </button>
                    {currentStep === 'FINAL_DISPLAY' && (
                      <button 
                        onClick={() => resetState()}
                        className="flex-shrink-0 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105"
                      >
                        Gerar Novo
                      </button>
                    )}
                  </div>
              </div>
              
              {/* Stepper Container */}
              <div className="w-full overflow-x-auto pb-2 scrollbar-hide">
                  <div className="min-w-[700px] px-2 pb-4">
                    <Stepper steps={stepperSteps} currentStepIndex={activeStepIndex} />
                  </div>
              </div>
          </div>
        </header>
      )}

      <main className={currentStep !== 'HOME' ? "py-10 px-4 sm:px-8" : ""}>
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