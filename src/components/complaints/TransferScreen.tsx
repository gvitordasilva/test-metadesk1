import { Headphones, Home, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TransferScreenProps {
  onNewComplaint: () => void;
  onGoHome: () => void;
}

export function TransferScreen({
  onNewComplaint,
  onGoHome,
}: TransferScreenProps) {
  return (
    <div className="text-center py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Transfer icon */}
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-indigo-50 mb-6">
        <Headphones className="w-12 h-12 text-primary" />
      </div>

      <h2 className="text-3xl font-bold text-foreground mb-3">
        Transferência Solicitada
      </h2>
      <p className="text-lg text-muted-foreground mb-8">
        Você está sendo direcionado para um atendente humano.
      </p>

      {/* Waiting indicator */}
      <div className="bg-muted rounded-lg p-6 inline-block mb-8">
        <div className="flex items-center justify-center gap-3 mb-3">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-lg font-medium text-foreground">
            Aguardando atendente...
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Um de nossos atendentes irá assumir sua conversa em breve.
        </p>
      </div>

      {/* Information */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-8 max-w-md mx-auto">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <strong>Importante:</strong> Mantenha esta página aberta. O atendente será 
          notificado e entrará em contato através do sistema.
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button variant="outline" onClick={onNewComplaint} className="gap-2">
          <Plus className="w-4 h-4" /> Nova Solicitação
        </Button>
        <Button onClick={onGoHome} className="gap-2">
          <Home className="w-4 h-4" /> Página Inicial
        </Button>
      </div>
    </div>
  );
}
