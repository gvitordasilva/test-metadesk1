import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Play, Timer } from "lucide-react";

type ServiceCountdownDialogProps = {
  open: boolean;
  countdownSeconds: number;
  onStart: () => void;
  onClose: () => void;
  customerName?: string;
};

export function ServiceCountdownDialog({
  open,
  countdownSeconds,
  onStart,
  onClose,
  customerName,
}: ServiceCountdownDialogProps) {
  const [remaining, setRemaining] = useState(countdownSeconds);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (open) {
      setRemaining(countdownSeconds);
      setStarted(false);
    }
  }, [open, countdownSeconds]);

  useEffect(() => {
    if (!open || started) return;

    if (remaining <= 0) {
      setStarted(true);
      onStart();
      return;
    }

    const timer = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [open, remaining, started, onStart]);

  const handleEarlyStart = useCallback(() => {
    setStarted(true);
    onStart();
  }, [onStart]);

  const progress = countdownSeconds > 0 ? ((countdownSeconds - remaining) / countdownSeconds) * 100 : 100;

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-primary" />
            Iniciando Atendimento
          </DialogTitle>
          <DialogDescription>
            {customerName
              ? `O atendimento de ${customerName} começará automaticamente.`
              : "O atendimento começará automaticamente."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {!started ? (
            <>
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 112 112">
                    <circle cx="56" cy="56" r="50" stroke="currentColor" strokeWidth="6" fill="none" className="text-muted" />
                    <circle
                      cx="56"
                      cy="56"
                      r="50"
                      stroke="currentColor"
                      strokeWidth="6"
                      fill="none"
                      strokeDasharray={2 * Math.PI * 50}
                      strokeDashoffset={2 * Math.PI * 50 * (1 - progress / 100)}
                      strokeLinecap="round"
                      className="text-primary transition-all duration-1000"
                    />
                  </svg>
                  <span className="text-4xl font-bold font-mono">{remaining}</span>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  O contador TMA iniciará ao fechar esta janela ou clicar abaixo.
                </p>
              </div>

              <Button onClick={handleEarlyStart} className="w-full" size="lg">
                <Play className="h-4 w-4 mr-2" />
                Iniciar Agora
              </Button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <Play className="h-6 w-6 text-green-600" />
              </div>
              <p className="font-medium text-green-600">Atendimento iniciado!</p>
              <p className="text-sm text-muted-foreground">O TMA está sendo contabilizado.</p>
              <Button variant="outline" onClick={onClose} className="mt-2">
                Fechar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
