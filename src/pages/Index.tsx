import { useState } from "react";
import { Car } from "lucide-react";
import { toast } from "sonner";
import CameraCapture from "@/components/CameraCapture";
import ParkingResult, { type ParkingInfo } from "@/components/ParkingResult";
import AnalyzingState from "@/components/AnalyzingState";
import { supabase } from "@/integrations/supabase/client";

type AppState = "idle" | "analyzing" | "result" | "pick-side";

const Index = () => {
  const [state, setState] = useState<AppState>("idle");
  const [capturedImage, setCapturedImage] = useState<string>("");
  const [result, setResult] = useState<ParkingInfo | null>(null);

  const analyzeSign = async (imageBase64: string, side?: "left" | "right") => {
    if (!imageBase64 || !imageBase64.startsWith("data:image/")) {
      toast.error("Invalid image. Please try taking the photo again.");
      return;
    }

    setCapturedImage(imageBase64);
    setState("analyzing");

    // Get the user's current local time info
    const now = new Date();
    const currentTime = now.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    try {
      const { data, error } = await supabase.functions.invoke("analyze-sign", {
        body: { image: imageBase64, currentTime, timezone, side },
      });

      if (error) {
        throw new Error(error.message || "Failed to analyze sign");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const parkingData = data as ParkingInfo;
      setResult(parkingData);

      // If it has multiple directions and no side was specified, show picker
      if (parkingData.hasMultipleDirections && parkingData.directions?.length && !side) {
        setState("pick-side");
      } else {
        setState("result");
      }
    } catch (err) {
      console.error("Analysis error:", err);
      toast.error("Couldn't read the sign. Please try again with a clearer photo.");
      setState("idle");
    }
  };

  const handleSelectSide = (side: "left" | "right") => {
    // Re-analyze for the specific side
    analyzeSign(capturedImage, side);
  };

  const reset = () => {
    setState("idle");
    setCapturedImage("");
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-md border-b border-border px-6 py-4">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Car className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-subheading text-foreground leading-tight">Can I Park Here?</h1>
            <p className="text-label text-muted-foreground">Sign Reader</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-6">
        {state === "idle" && (
          <CameraCapture onCapture={(img) => analyzeSign(img)} isAnalyzing={false} />
        )}
        {state === "analyzing" && (
          <AnalyzingState capturedImage={capturedImage} />
        )}
        {state === "pick-side" && result && (
          <ParkingResult
            result={result}
            capturedImage={capturedImage}
            onReset={reset}
            onSelectSide={handleSelectSide}
          />
        )}
        {state === "result" && result && (
          <ParkingResult result={result} capturedImage={capturedImage} onReset={reset} />
        )}
      </main>
    </div>
  );
};

export default Index;
