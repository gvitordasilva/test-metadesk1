import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressBar } from "@/components/complaints/ProgressBar";
import { StepChannelSelection } from "@/components/complaints/StepChannelSelection";
import { StepTriageChatbot } from "@/components/complaints/StepTriageChatbot";
import { StepIdentification, IdentificationData } from "@/components/complaints/StepIdentification";
import { StepDetails, DetailsData } from "@/components/complaints/StepDetails";
import { StepAttachments } from "@/components/complaints/StepAttachments";
import { StepConfirmation } from "@/components/complaints/StepConfirmation";
import { StepVoiceAgent } from "@/components/complaints/StepVoiceAgent";
import { SuccessScreen } from "@/components/complaints/SuccessScreen";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRoundRobinAssignment } from "@/hooks/useRoundRobinAssignment";

const TOTAL_STEPS = 4;

type Channel = 'text' | 'voice' | 'chatbot' | null;

export default function ReclamacoesDenuncias() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [channel, setChannel] = useState<Channel>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [protocolNumber, setProtocolNumber] = useState<string | null>(null);
  const [complaintId, setComplaintId] = useState<string | null>(null);
  // Form data
  const [identificationData, setIdentificationData] = useState<IdentificationData>({
    isAnonymous: false,
    name: "",
    email: "",
    phone: "",
  });

  const [detailsData, setDetailsData] = useState<DetailsData>({
    type: "",
    category: "",
    occurredAt: "",
    location: "",
    description: "",
    involvedParties: "",
  });

  const [files, setFiles] = useState<File[]>([]);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const { assignToNextAttendant, checkOnlineAttendants } = useRoundRobinAssignment();

  const uploadFiles = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const file of files) {
      const timestamp = Date.now();
      const filename = `${timestamp}-${file.name}`;
      
      const { data, error } = await supabase.storage
        .from("complaint-attachments")
        .upload(filename, file);

      if (error) {
        console.error("Upload error:", error);
        throw new Error(`Erro ao fazer upload de ${file.name}`);
      }

      const { data: urlData } = supabase.storage
        .from("complaint-attachments")
        .getPublicUrl(data.path);

      uploadedUrls.push(urlData.publicUrl);
    }

    return uploadedUrls;
  };

  const handleSubmit = async () => {
    if (!captchaToken) {
      toast({
        title: "Erro",
        description: "Por favor, complete o captcha.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Upload files if any
      let attachmentUrls: string[] = [];
      if (files.length > 0) {
        attachmentUrls = await uploadFiles();
      }

      // 2. Generate protocol number
      const { data: protocolData, error: protocolError } = await supabase
        .rpc("generate_complaint_protocol");

      if (protocolError) {
        throw new Error("Erro ao gerar protocolo");
      }

      const protocol = protocolData as string;

      // 3. Insert complaint
      const { data: complaintData, error: insertError } = await supabase.from("complaints").insert({
        protocol_number: protocol,
        is_anonymous: identificationData.isAnonymous,
        reporter_name: identificationData.isAnonymous ? null : identificationData.name,
        reporter_email: identificationData.isAnonymous ? null : identificationData.email,
        reporter_phone: identificationData.isAnonymous ? null : identificationData.phone,
        type: detailsData.type,
        category: detailsData.category,
        occurred_at: detailsData.occurredAt ? new Date(detailsData.occurredAt).toISOString() : null,
        location: detailsData.location || null,
        description: detailsData.description,
        involved_parties: detailsData.involvedParties || null,
        attachments: attachmentUrls,
      }).select().single();

      if (insertError) {
        console.error("Insert error:", insertError);
        throw new Error("Erro ao registrar solicitação");
      }

      // 4. Check online attendants for round-robin assignment
      const onlineCount = await checkOnlineAttendants();
      
      // 5. Add to service queue
      const { data: queueData, error: queueError } = await supabase.from("service_queue" as any).insert({
        channel: "web",
        status: onlineCount > 0 ? "waiting" : "waiting",
        priority: 3,
        customer_name: identificationData.isAnonymous ? "Anônimo" : identificationData.name,
        customer_email: identificationData.isAnonymous ? null : identificationData.email,
        customer_phone: identificationData.isAnonymous ? null : identificationData.phone,
        subject: `${detailsData.type}: ${detailsData.category}`,
        last_message: detailsData.description.substring(0, 100) + (detailsData.description.length > 100 ? "..." : ""),
        complaint_id: complaintData?.id,
        waiting_since: new Date().toISOString(),
      }).select().single();

      if (queueError) {
        console.error("Queue insert error:", queueError);
      } else if (queueData && onlineCount > 0) {
        // Round-robin: assign to next available attendant
        await assignToNextAttendant((queueData as any).id);
      } else if (onlineCount === 0) {
        // No attendants online - notify user
        toast({
          title: "Sem atendentes disponíveis",
          description: "No momento não há atendentes online. Sua solicitação foi registrada e será atendida assim que possível.",
        });
      }

      // 5. Send email notification
      try {
        await supabase.functions.invoke("send-complaint-email", {
          body: {
            protocolNumber: protocol,
            email: identificationData.isAnonymous ? null : identificationData.email,
            name: identificationData.isAnonymous ? null : identificationData.name,
            phone: identificationData.isAnonymous ? null : identificationData.phone,
            type: detailsData.type,
            category: detailsData.category,
            description: detailsData.description,
            captchaToken,
          },
        });
      } catch (emailError) {
        console.error("Email error:", emailError);
        // Don't fail the submission if email fails
      }

      // 6. Trigger AI triage in background (non-blocking)
      if (complaintData?.id) {
        supabase.functions.invoke("complaint-ai-triage", {
          body: {
            complaint_id: complaintData.id,
            description: detailsData.description,
            type: detailsData.type,
            category: detailsData.category,
            channel: "web",
            reporter_name: identificationData.isAnonymous ? null : identificationData.name,
            is_anonymous: identificationData.isAnonymous,
          },
        }).then(() => {
          console.log("AI triage completed for complaint:", complaintData.id);
        }).catch((triageError) => {
          console.error("AI triage error:", triageError);
        });
      }

      setProtocolNumber(protocol);
      setComplaintId(complaintData?.id || null);
      setCurrentStep(5); // Success screen

    } catch (error) {
      console.error("Submit error:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao enviar solicitação",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setChannel(null);
    setCurrentStep(1);
    setIdentificationData({
      isAnonymous: false,
      name: "",
      email: "",
      phone: "",
    });
    setDetailsData({
      type: "",
      category: "",
      occurredAt: "",
      location: "",
      description: "",
      involvedParties: "",
    });
    setFiles([]);
    setCaptchaToken(null);
    setProtocolNumber(null);
    setComplaintId(null);
  };

  const handleChannelSelect = (selectedChannel: Channel) => {
    setChannel(selectedChannel);
  };

  const handleBackToChannelSelection = () => {
    setChannel(null);
  };

  const renderContent = () => {
    // Channel selection screen
    if (channel === null) {
      return <StepChannelSelection onSelect={handleChannelSelect} />;
    }

    // Chatbot triage
    if (channel === 'chatbot') {
      return (
        <StepTriageChatbot
          onComplete={() => setCurrentStep(5)}
          onBack={handleBackToChannelSelection}
          onTransfer={(protocol) => {
            setProtocolNumber(protocol);
            // Stay in the chatbot view - the transfer message is shown inline
          }}
        />
      );
    }

    // Voice agent screen
    if (channel === 'voice') {
      return <StepVoiceAgent onBack={handleBackToChannelSelection} />;
    }

    // Text form flow
    switch (currentStep) {
      case 1:
        return (
          <StepIdentification
            data={identificationData}
            onUpdate={setIdentificationData}
            onNext={() => setCurrentStep(2)}
            onBack={handleBackToChannelSelection}
          />
        );
      case 2:
        return (
          <StepDetails
            data={detailsData}
            onUpdate={setDetailsData}
            onNext={() => setCurrentStep(3)}
            onBack={() => setCurrentStep(1)}
          />
        );
      case 3:
        return (
          <StepAttachments
            files={files}
            onUpdate={setFiles}
            onNext={() => setCurrentStep(4)}
            onBack={() => setCurrentStep(2)}
          />
        );
      case 4:
        return (
          <StepConfirmation
            identificationData={identificationData}
            detailsData={detailsData}
            files={files}
            captchaToken={captchaToken}
            onCaptchaChange={setCaptchaToken}
            onSubmit={handleSubmit}
            onBack={() => setCurrentStep(3)}
            isSubmitting={isSubmitting}
          />
        );
      case 5:
        return (
          <SuccessScreen
            protocolNumber={protocolNumber || ""}
            email={identificationData.isAnonymous ? null : identificationData.email}
            onNewComplaint={resetForm}
            onGoHome={() => navigate("/")}
            complaintId={complaintId}
            respondentName={identificationData.isAnonymous ? null : identificationData.name}
            channel="web"
          />
        );
      default:
        return null;
    }
  };

  const showProgressBar = channel === 'text' && currentStep < 5;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Header */}
      <header className="bg-[#232f3c] shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <img
              src="/metadesk-icon-white.png"
              alt="Metadesk"
              className="h-10 w-auto"
            />
            <div>
              <h1 className="text-xl font-bold text-white">
                Reclamações e Denúncias
              </h1>
              <p className="text-sm text-slate-300">
                Canal seguro para sua manifestação
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {showProgressBar && (
          <ProgressBar currentStep={currentStep} totalSteps={TOTAL_STEPS} />
        )}

        <Card className="shadow-lg border border-slate-200 bg-white">
          <CardContent className="p-6 md:p-8">
            {renderContent()}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="bg-slate-100 border-t border-slate-200 mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-4 text-center">
          <p className="text-sm text-slate-500">
            Sua privacidade é protegida. Todas as informações são tratadas com
            confidencialidade.
          </p>
        </div>
      </footer>
    </div>
  );
}
