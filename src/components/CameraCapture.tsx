import { useRef, useState, useCallback, useEffect } from "react";
import { Camera, ImagePlus, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CameraCaptureProps {
  onCapture: (imageBase64: string) => void;
  isAnalyzing: boolean;
}

const CameraCapture = ({ onCapture, isAnalyzing }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      // Check if getUserMedia is available
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("not-supported");
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
      setStream(mediaStream);
      setIsCameraActive(true);
    } catch (err: any) {
      console.error("Camera access error:", err);
      const errorName = err?.name || err?.message || "";

      if (errorName === "not-supported" || errorName === "TypeError") {
        setCameraError("Camera not available in this browser. Please use 'Upload Photo' instead.");
      } else if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError") {
        setCameraError("Camera permission was denied. Please allow camera access or use 'Upload Photo'.");
      } else if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
        setCameraError("No camera found on this device. Please use 'Upload Photo'.");
      } else {
        setCameraError("Couldn't access the camera. Please use 'Upload Photo' instead.");
      }
      
      toast.error("Camera unavailable — try uploading a photo instead.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setIsCameraActive(false);
    setCameraError(null);
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Check if video has actual content
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error("Camera feed not ready. Please wait a moment and try again.");
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL("image/jpeg", 0.8);
    
    // Validate the captured image isn't empty
    if (!base64 || base64 === "data:," || base64.length < 100) {
      toast.error("Failed to capture the photo. Please try again.");
      return;
    }
    
    stopCamera();
    onCapture(base64);
  }, [stopCamera, onCapture]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      onCapture(base64);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  if (isCameraActive) {
    return (
      <div className="relative flex flex-col items-center">
        <div className="relative w-full overflow-hidden rounded-2xl border-2 border-primary/20 shadow-lg">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full aspect-[3/4] object-cover bg-foreground/5"
          />
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[40%] border-2 border-primary/60 rounded-xl" />
          </div>
        </div>
        <p className="mt-3 text-body-lg text-muted-foreground text-center">
          Point at the parking sign
        </p>
        <div className="mt-4 flex gap-4">
          <Button variant="outline" size="lg" onClick={stopCamera}>
            <X className="h-5 w-5" />
            Cancel
          </Button>
          <Button variant="capture" size="lg" onClick={capturePhoto} disabled={isAnalyzing}>
            <Camera className="h-6 w-6" />
            Take Photo
          </Button>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-full aspect-[3/4] max-h-[50vh] rounded-2xl bg-secondary flex flex-col items-center justify-center gap-4 border-2 border-dashed border-border">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Camera className="w-10 h-10 text-primary" />
        </div>
        <p className="text-body-lg text-muted-foreground text-center px-8">
          Take a photo of a parking sign to check availability
        </p>
      </div>

      {/* Camera error message */}
      {cameraError && (
        <div className="w-full rounded-xl bg-warning/10 border border-warning/30 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-body text-foreground">{cameraError}</p>
        </div>
      )}

      <div className="flex flex-col gap-3 w-full">
        <Button variant="capture" size="lg" onClick={startCamera} disabled={isAnalyzing} className="w-full">
          <Camera className="h-6 w-6" />
          Open Camera
        </Button>
        <Button variant="outline" size="default" onClick={() => fileInputRef.current?.click()} disabled={isAnalyzing} className="w-full">
          <ImagePlus className="h-5 w-5" />
          Upload Photo
        </Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
};

export default CameraCapture;
