import React from 'react';

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
);

interface StepperProps {
  steps: string[];
  currentStepIndex: number;
}

export const Stepper: React.FC<StepperProps> = ({ steps, currentStepIndex }) => {
  return (
    <nav aria-label="Progress">
      <ol role="list" className="flex items-center">
        {steps.map((step, stepIdx) => (
          <li key={step} className={`relative ${stepIdx !== steps.length - 1 ? 'flex-1' : ''}`}>
            {stepIdx < currentStepIndex ? (
              // Completed Step
              <>
                <div className="absolute inset-0 top-1/2 -translate-y-1/2 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-purple-600" />
                </div>
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 transition-colors duration-300">
                  <CheckIcon className="h-5 w-5 text-white" aria-hidden="true" />
                </div>
              </>
            ) : stepIdx === currentStepIndex ? (
              // Current Step
              <>
                <div className="absolute inset-0 top-1/2 -translate-y-1/2 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-slate-700" />
                </div>
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-purple-600 bg-slate-800 transition-colors duration-300">
                  <span className="h-2.5 w-2.5 rounded-full bg-purple-600" aria-hidden="true" />
                </div>
              </>
            ) : (
              // Upcoming Step
              <>
                <div className="absolute inset-0 top-1/2 -translate-y-1/2 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-slate-700" />
                </div>
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-600 bg-slate-800 transition-colors duration-300" />
              </>
            )}
             <span className={`absolute top-10 left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap px-1 text-xs font-medium text-center transition-colors duration-300 ${stepIdx <= currentStepIndex ? 'text-slate-200' : 'text-slate-500'}`}>
                {step}
             </span>
          </li>
        ))}
      </ol>
    </nav>
  );
};
