import { cn } from '@/lib/utils';
import { useBuilderContext } from '@/contexts/BuilderContext';

export function BuilderStepsNav() {
  const { steps, activeStep, setActiveStep } = useBuilderContext();

  return (
    <nav className="flex flex-wrap items-center gap-2">
      {steps.map((step, index) => {
        const isActive = step.key === activeStep;
        const stepNumberClasses = cn(
          'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
          isActive ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-700',
        );
        return (
          <button
            key={step.key}
            type="button"
            onClick={() => setActiveStep(step.key)}
            className={cn(
              'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors',
              isActive
                ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400',
            )}
          >
            <span className={stepNumberClasses}>
              {index + 1}
            </span>
            <span className="font-medium">{step.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
