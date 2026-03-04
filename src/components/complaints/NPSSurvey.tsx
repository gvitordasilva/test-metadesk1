import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Star, Send, CheckCircle } from "lucide-react";

type NPSSurveyProps = {
  complaintId?: string | null;
  sessionId?: string | null;
  channel?: string;
  respondentName?: string | null;
  respondentEmail?: string | null;
};

const scoreLabels: Record<number, string> = {
  0: "Muito insatisfeito",
  1: "Muito insatisfeito",
  2: "Insatisfeito",
  3: "Insatisfeito",
  4: "Pouco insatisfeito",
  5: "Neutro",
  6: "Neutro",
  7: "Satisfeito",
  8: "Satisfeito",
  9: "Muito satisfeito",
  10: "Extremamente satisfeito",
};

const scoreColors: Record<number, string> = {
  0: "bg-red-500 hover:bg-red-600",
  1: "bg-red-500 hover:bg-red-600",
  2: "bg-red-400 hover:bg-red-500",
  3: "bg-orange-400 hover:bg-orange-500",
  4: "bg-orange-400 hover:bg-orange-500",
  5: "bg-yellow-400 hover:bg-yellow-500",
  6: "bg-yellow-400 hover:bg-yellow-500",
  7: "bg-lime-400 hover:bg-lime-500",
  8: "bg-green-400 hover:bg-green-500",
  9: "bg-green-500 hover:bg-green-600",
  10: "bg-emerald-500 hover:bg-emerald-600",
};

export function NPSSurvey({
  complaintId,
  sessionId,
  channel = "web",
  respondentName,
  respondentEmail,
}: NPSSurveyProps) {
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (score === null) return;
    setSubmitting(true);

    try {
      const { error } = await supabase.from("nps_responses" as any).insert({
        complaint_id: complaintId || null,
        session_id: sessionId || null,
        score,
        comment: comment.trim() || null,
        channel,
        respondent_name: respondentName || null,
        respondent_email: respondentEmail || null,
      });

      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      console.error("NPS submit error:", err);
      toast.error("Erro ao enviar avaliação. Obrigado de qualquer forma!");
      setSubmitted(true); // Don't block the user
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-4 animate-in fade-in duration-300">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-3">
          <CheckCircle className="w-6 h-6 text-green-600" />
        </div>
        <p className="font-medium text-foreground">Obrigado pela sua avaliação!</p>
        <p className="text-sm text-muted-foreground mt-1">Sua opinião nos ajuda a melhorar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 mb-2">
          <Star className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Avalie seu atendimento</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          De 0 a 10, qual a probabilidade de você recomendar nosso atendimento?
        </p>
      </div>

      {/* Score buttons */}
      <div className="flex justify-center gap-1.5 flex-wrap">
        {Array.from({ length: 11 }, (_, i) => (
          <button
            key={i}
            onClick={() => setScore(i)}
            className={cn(
              "w-10 h-10 rounded-lg font-bold text-sm transition-all duration-200",
              score === i
                ? `${scoreColors[i]} text-white scale-110 shadow-md`
                : "bg-muted hover:bg-muted/80 text-foreground"
            )}
          >
            {i}
          </button>
        ))}
      </div>

      {/* Labels */}
      <div className="flex justify-between text-[10px] text-muted-foreground px-1">
        <span>Nada provável</span>
        <span>Extremamente provável</span>
      </div>

      {/* Selected feedback */}
      {score !== null && (
        <div className="text-center animate-in fade-in duration-200">
          <span className="text-sm font-medium text-muted-foreground">
            {scoreLabels[score]}
          </span>
        </div>
      )}

      {/* Comment */}
      {score !== null && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Textarea
            placeholder="Quer nos contar mais? (opcional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-h-[60px] resize-none"
            maxLength={500}
          />
        </div>
      )}

      {/* Submit */}
      {score !== null && (
        <div className="flex justify-center">
          <Button onClick={handleSubmit} disabled={submitting} size="sm" className="gap-2">
            <Send className="w-3.5 h-3.5" />
            {submitting ? "Enviando..." : "Enviar Avaliação"}
          </Button>
        </div>
      )}
    </div>
  );
}
