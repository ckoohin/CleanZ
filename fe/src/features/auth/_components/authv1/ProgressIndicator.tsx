import { motion } from 'motion/react';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressIndicator({ currentStep, totalSteps }: ProgressIndicatorProps) {
  const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="relative py-2">
      {/* Background bar */}
      <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 bg-gray-200 rounded-full" />
      
      {/* Progress bar */}
      <motion.div
        className="absolute top-1/2 -translate-y-1/2 left-0 h-1 bg-primary/80 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      />
      
      {/* Step markers */}
      <div className="relative flex justify-between">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <motion.div
            key={step}
            className={`w-4 h-4 rounded-full border-2 transition-colors z-10 ${
              step < currentStep
                ? 'bg-primary border-primary'
                : step === currentStep
                ? 'bg-primary border-primary'
                : 'bg-white border-gray-300'
            }`}
            initial={{ scale: 0.8 }}
            animate={{ 
              scale: step === currentStep ? 1 : 1,
            }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>
    </div>
  );
}