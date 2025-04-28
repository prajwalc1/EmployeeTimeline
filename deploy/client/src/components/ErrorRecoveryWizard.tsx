import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ErrorStep = {
  id: string;
  title: string;
  description: string;
  action: () => Promise<boolean>;
  resolution?: string;
};

type SystemStatus = {
  database: boolean;
  api: boolean;
  filesystem: boolean;
};

export default function ErrorRecoveryWizard() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    database: true,
    api: true,
    filesystem: true,
  });

  // Error recovery steps
  const steps: ErrorStep[] = [
    {
      id: "database",
      title: "Datenbankverbindung prüfen",
      description: "Überprüfe die Verbindung zur Datenbank...",
      action: async () => {
        try {
          const response = await fetch('/api/system/check-database', {
            credentials: 'include'
          });
          return response.ok;
        } catch {
          return false;
        }
      },
      resolution: "Versuche die Anwendung neu zu starten. Wenn das Problem weiterhin besteht, kontaktiere bitte den Support."
    },
    {
      id: "api",
      title: "API-Verbindung prüfen",
      description: "Überprüfe die Verbindung zum Server...",
      action: async () => {
        try {
          const response = await fetch('/api/health', {
            credentials: 'include'
          });
          return response.ok;
        } catch {
          return false;
        }
      },
      resolution: "Stelle sicher, dass deine Internetverbindung stabil ist und versuche es erneut."
    },
    {
      id: "filesystem",
      title: "Dateisystem-Berechtigungen prüfen",
      description: "Überprüfe die Berechtigungen für Dateioperationen...",
      action: async () => {
        try {
          const response = await fetch('/api/system/check-filesystem', {
            credentials: 'include'
          });
          return response.ok;
        } catch {
          return false;
        }
      },
      resolution: "Stelle sicher, dass die Anwendung die notwendigen Berechtigungen hat."
    }
  ];

  // Check system status periodically
  useEffect(() => {
    const checkSystem = async () => {
      const status: SystemStatus = {
        database: true,
        api: true,
        filesystem: true
      };

      for (const step of steps) {
        const result = await step.action();
        status[step.id as keyof SystemStatus] = result;
      }

      setSystemStatus(status);
      
      // Open wizard if any check fails
      if (Object.values(status).some(s => !s)) {
        setIsOpen(true);
      }
    };

    // Initial check
    checkSystem();

    // Periodic check every 30 minutes
    const interval = setInterval(checkSystem, 30 * 60 * 1000);
    return () => clearInterval(interval);

    // Also check when the window regains focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSystem();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleNextStep = async () => {
    setIsChecking(true);
    try {
      const currentStep = steps[currentStepIndex];
      const result = await currentStep.action();
      
      if (result) {
        toast({
          title: "Erfolgreich",
          description: `${currentStep.title} war erfolgreich.`
        });
        
        if (currentStepIndex < steps.length - 1) {
          setCurrentStepIndex(curr => curr + 1);
        } else {
          setIsOpen(false);
          toast({
            title: "Systemprüfung abgeschlossen",
            description: "Alle Systeme funktionieren wieder normal."
          });
        }
      } else {
        toast({
          variant: "destructive",
          title: "Fehler",
          description: currentStep.resolution || "Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut."
        });
      }
    } finally {
      setIsChecking(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const currentStep = steps[currentStepIndex];

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>System-Diagnose</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Systemprobleme erkannt</AlertTitle>
            <AlertDescription>
              Der Assistent hilft Ihnen bei der Behebung der erkannten Probleme.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-4 rounded-lg border ${
                  index === currentStepIndex
                    ? "bg-muted"
                    : index < currentStepIndex
                    ? "bg-muted/50"
                    : ""
                }`}
              >
                {index < currentStepIndex ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : index === currentStepIndex ? (
                  isChecking ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                  )
                ) : (
                  <div className="h-5 w-5 rounded-full border-2" />
                )}
                <div className="flex-1">
                  <h3 className="font-medium">{step.title}</h3>
                  {index === currentStepIndex && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {step.description}
                    </p>
                  )}
                </div>
                {!systemStatus[step.id as keyof SystemStatus] && (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isChecking}
            >
              Später erinnern
            </Button>
            <Button
              onClick={handleNextStep}
              disabled={isChecking}
            >
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Prüfe...
                </>
              ) : (
                "Weiter"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
