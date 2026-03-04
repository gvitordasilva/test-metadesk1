import { Check } from "lucide-react";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

const steps = [
  { label: "Identificação", description: "Como deseja se identificar" },
  { label: "Detalhes", description: "Informações da ocorrência" },
  { label: "Anexos", description: "Documentos e fotos" },
  { label: "Confirmação", description: "Revisar e enviar" },
];

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const percentage = ((currentStep) / totalSteps) * 100;

  return (
    <div className="w-full mb-8">
      {/* Progress bar visual */}
      <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden mb-6">
        <div
          className="absolute h-full bg-gradient-to-r from-[#7ae4ff] to-[#a18aff] transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Steps indicators */}
      <div className="flex justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <div
              key={step.label}
              className={`flex flex-col items-center flex-1 ${
                index < steps.length - 1 ? "relative" : ""
              }`}
            >
              {/* Step circle */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                  isCompleted
                    ? "bg-[#4deb92] text-white"
                    : isCurrent
                    ? "bg-[#7ae4ff] text-[#232f3c] ring-4 ring-[#7ae4ff]/30"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  stepNumber
                )}
              </div>

              {/* Step label */}
              <div className="mt-2 text-center">
                <p
                  className={`text-sm font-medium ${
                    isCurrent ? "text-slate-800" : "text-slate-500"
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-xs text-slate-400 hidden sm:block">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
