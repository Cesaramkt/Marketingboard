import React from 'react';

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
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
    <div className="w-full py-4">
      <div className="relative flex items-center justify-between w-full">
        
        {/* Background Line (Gray) */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-300 dark:bg-slate-700 rounded-full -z-10 transition-colors duration-300" />
        
        {/* Active Progress Line (Gradient) */}
        <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-purple-600 to-violet-400 rounded-full -z-0 transition-all duration-500 ease-out"
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
                        ? 'w-8 h-8 bg-violet-600 border-violet-600 shadow-lg shadow-violet-900/50 scale-100' 
                        : isCurrent 
                            ? 'w-10 h-10 bg-white dark:bg-slate-900 border-violet-500 dark:border-violet-400 shadow-[0_0_15px_rgba(167,139,250,0.5)] scale-110' 
                            : 'w-8 h-8 bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-600 scale-90'
                    }
                `}
              >
                {isCompleted ? (
                  <CheckIcon className="w-4 h-4 text-white animate-appear" />
                ) : isCurrent ? (
                  <span className="w-2.5 h-2.5 bg-violet-500 dark:bg-violet-400 rounded-full animate-pulse" />
                ) : (
                  <span className="w-2 h-2 bg-gray-400 dark:bg-slate-600 rounded-full" />
                )}
              </div>

              {/* Step Label */}
              <span 
                className={`
                    absolute top-12 text-xs font-medium tracking-wide whitespace-nowrap transition-all duration-300
                    ${isCurrent 
                        ? 'text-violet-700 dark:text-violet-300 font-bold -translate-y-1 scale-110' 
                        : isCompleted 
                            ? 'text-gray-500 dark:text-slate-400' 
                            : 'text-gray-400 dark:text-slate-600'
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