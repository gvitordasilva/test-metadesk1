import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { UserX, User, ArrowRight, ArrowLeft } from "lucide-react";

export interface IdentificationData {
  isAnonymous: boolean;
  name: string;
  email: string;
  phone: string;
}

interface StepIdentificationProps {
  data: IdentificationData;
  onUpdate: (data: IdentificationData) => void;
  onNext: () => void;
  onBack?: () => void;
}

export function StepIdentification({ data, onUpdate, onNext, onBack }: StepIdentificationProps) {
  const [identificationType, setIdentificationType] = useState<string>(
    data.isAnonymous ? "anonymous" : "identified"
  );

  const handleTypeChange = (value: string) => {
    setIdentificationType(value);
    onUpdate({
      ...data,
      isAnonymous: value === "anonymous",
      name: value === "anonymous" ? "" : data.name,
      email: value === "anonymous" ? "" : data.email,
      phone: value === "anonymous" ? "" : data.phone,
    });
  };

  const isValid = identificationType === "anonymous" || (data.name && data.email);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Como deseja se identificar?
        </h2>
        <p className="text-muted-foreground">
          Você pode escolher fazer sua solicitação de forma anônima ou identificada
        </p>
      </div>

      <RadioGroup
        value={identificationType}
        onValueChange={handleTypeChange}
        className="grid gap-4 md:grid-cols-2"
      >
        <Label
          htmlFor="anonymous"
          className={`flex flex-col items-center p-6 rounded-lg border-2 cursor-pointer transition-all ${
            identificationType === "anonymous"
              ? "border-primary bg-primary/5"
              : "border-muted hover:border-muted-foreground/50"
          }`}
        >
          <RadioGroupItem value="anonymous" id="anonymous" className="sr-only" />
          <UserX className="w-12 h-12 mb-4 text-muted-foreground" />
          <span className="text-lg font-medium">Anônimo</span>
          <span className="text-sm text-muted-foreground text-center mt-2">
            Sua identidade não será revelada
          </span>
        </Label>

        <Label
          htmlFor="identified"
          className={`flex flex-col items-center p-6 rounded-lg border-2 cursor-pointer transition-all ${
            identificationType === "identified"
              ? "border-primary bg-primary/5"
              : "border-muted hover:border-muted-foreground/50"
          }`}
        >
          <RadioGroupItem value="identified" id="identified" className="sr-only" />
          <User className="w-12 h-12 mb-4 text-muted-foreground" />
          <span className="text-lg font-medium">Identificado</span>
          <span className="text-sm text-muted-foreground text-center mt-2">
            Receberá atualizações por e-mail
          </span>
        </Label>
      </RadioGroup>

      {identificationType === "identified" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="space-y-2">
            <Label htmlFor="name">Nome completo *</Label>
            <Input
              id="name"
              placeholder="Seu nome"
              value={data.name}
              onChange={(e) => onUpdate({ ...data, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail *</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={data.email}
              onChange={(e) => onUpdate({ ...data, email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone (opcional)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(00) 00000-0000"
              value={data.phone}
              onChange={(e) => onUpdate({ ...data, phone: e.target.value })}
            />
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4">
        {onBack && (
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
        )}
        <div className={!onBack ? "ml-auto" : ""}>
          <Button onClick={onNext} disabled={!isValid} className="gap-2">
            Continuar <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
