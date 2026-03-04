import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ArrowRight, AlertCircle, MessageSquare, Lightbulb } from "lucide-react";

export interface DetailsData {
  type: "reclamacao" | "denuncia" | "sugestao" | "";
  category: string;
  occurredAt: string;
  location: string;
  description: string;
  involvedParties: string;
}

interface StepDetailsProps {
  data: DetailsData;
  onUpdate: (data: DetailsData) => void;
  onNext: () => void;
  onBack: () => void;
}

const categories = [
  { value: "atendimento", label: "Atendimento" },
  { value: "produto", label: "Produto" },
  { value: "servico", label: "Serviço" },
  { value: "conduta", label: "Conduta" },
  { value: "financeiro", label: "Financeiro" },
  { value: "outro", label: "Outro" },
];

const typeIcons = {
  reclamacao: MessageSquare,
  denuncia: AlertCircle,
  sugestao: Lightbulb,
};

export function StepDetails({ data, onUpdate, onNext, onBack }: StepDetailsProps) {
  const isValid = data.type && data.category && data.description;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Detalhes da Ocorrência
        </h2>
        <p className="text-muted-foreground">
          Descreva o que aconteceu com o máximo de detalhes possível
        </p>
      </div>

      {/* Tipo */}
      <div className="space-y-3">
        <Label>Tipo de solicitação *</Label>
        <RadioGroup
          value={data.type}
          onValueChange={(value) => onUpdate({ ...data, type: value as DetailsData["type"] })}
          className="grid gap-3 md:grid-cols-3"
        >
          {(["reclamacao", "denuncia", "sugestao"] as const).map((type) => {
            const Icon = typeIcons[type];
            const labels = {
              reclamacao: "Reclamação",
              denuncia: "Denúncia",
              sugestao: "Sugestão",
            };
            return (
              <Label
                key={type}
                htmlFor={type}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  data.type === type
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-muted-foreground/50"
                }`}
              >
                <RadioGroupItem value={type} id={type} className="sr-only" />
                <Icon className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">{labels[type]}</span>
              </Label>
            );
          })}
        </RadioGroup>
      </div>

      {/* Categoria */}
      <div className="space-y-2">
        <Label htmlFor="category">Categoria *</Label>
        <Select
          value={data.category}
          onValueChange={(value) => onUpdate({ ...data, category: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma categoria" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Data e Local */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="occurredAt">Data do ocorrido</Label>
          <Input
            id="occurredAt"
            type="date"
            value={data.occurredAt}
            onChange={(e) => onUpdate({ ...data, occurredAt: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Local onde aconteceu</Label>
          <Input
            id="location"
            placeholder="Ex: Loja Centro, Setor de Atendimento"
            value={data.location}
            onChange={(e) => onUpdate({ ...data, location: e.target.value })}
          />
        </div>
      </div>

      {/* Descrição */}
      <div className="space-y-2">
        <Label htmlFor="description">Descrição detalhada *</Label>
        <Textarea
          id="description"
          placeholder="Descreva o ocorrido com o máximo de detalhes..."
          className="min-h-[150px]"
          value={data.description}
          onChange={(e) => onUpdate({ ...data, description: e.target.value })}
        />
      </div>

      {/* Envolvidos */}
      <div className="space-y-2">
        <Label htmlFor="involvedParties">
          Pessoas ou departamentos envolvidos (opcional)
        </Label>
        <Input
          id="involvedParties"
          placeholder="Nomes ou setores envolvidos"
          value={data.involvedParties}
          onChange={(e) => onUpdate({ ...data, involvedParties: e.target.value })}
        />
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <Button onClick={onNext} disabled={!isValid} className="gap-2">
          Continuar <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
