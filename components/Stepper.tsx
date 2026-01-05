import React from 'react';

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={4} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
);

interface StepperProps {
  steps: string[];
  currentStepIndex: number;
}

export const Stepper: React.FC<StepperProps> = ({ steps, currentStepIndex }) => {
  // Calculate progress percentage for the connecting line
  const progressPercentage = (currentStepIndex / (steps.length - 1)) * 100;

  return (
    <div className="w-full py-6">
      <div className="relative flex items-center justify-between w-full">
        
        {/* Background Line (Gray) */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-gray-200 dark:bg-white/10 rounded-full -z-10" />
        
        {/* Active Progress Line (Brand Color) */}
        <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-brand-primary rounded-full -z-0 transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
        />

        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isUpcoming = index > currentStepIndex;

          return (
            <div key={step} className="flex flex-col items-center group cursor-default relative z-10">
              
              {/* Step Circle Indicator */}
              <div 
                className={`
                    flex items-center justify-center rounded-full transition-all duration-500 border-2
                    ${isCompleted 
                        ? 'w-8 h-8 bg-brand-primary border-brand-primary shadow-[0_0_10px_rgba(177,242,14,0.4)] scale-100' 
                        : isCurrent 
                            ? 'w-10 h-10 bg-white dark:bg-brand-dark border-brand-primary shadow-[0_0_15px_rgba(177,242,14,0.3)] scale-110' 
                            : 'w-8 h-8 bg-gray-100 dark:bg-brand-surface border-gray-300 dark:border-white/20 scale-90'
                    }
                `}
              >
                {isCompleted ? (
                  <CheckIcon className="w-4 h-4 text-black animate-appear" />
                ) : isCurrent ? (
                  <span className="w-3 h-3 bg-brand-primary rounded-full animate-pulse" />
                ) : (
                  <span className="w-2 h-2 bg-gray-400 dark:bg-white/20 rounded-full" />
                )}
              </div>

              {/* Step Label */}
              <span 
                className={`
                    absolute top-14 text-xs font-semibold tracking-wide whitespace-nowrap transition-all duration-300
                    ${isCurrent 
                        ? 'text-brand-primary -translate-y-1 scale-105' 
                        : isCompleted 
                            ? 'text-gray-500 dark:text-gray-400' 
                            : 'text-gray-300 dark:text-white/20'
                    }
                `}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes appear {
            from { opacity: 0; transform: scale(0.5); }
            to { opacity: 1; transform: scale(1); }
        }
        .animate-appear {
            animation: appear 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>
    </div>
  );
};