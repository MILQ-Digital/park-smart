import { useRef, useState, useCallback } from "react";
import { Camera as CameraIcon, ImagePlus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";

interface CameraCaptureProps {
  onCapture: (imageBase64: string) => void;
  isAnalyzing: boolean;
}

const CameraCapture = ({ onCapture, isAnalyzing }: CameraCaptureProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isOpeningPicker, setIsOpeningPicker] = useState(false);

  const isNative = Capacitor.isNativePlatform();

  // Web-only camera fallback
  const startWebCamera = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("not-supported");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      const video = document.createElement("video");
      video.srcObject = mediaStream;
      video.setAttribute("playsinline", "true");
      await video.play();
      await new Promise((resolve) => setTimeout(resolve, 500));
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        onCapture(canvas.toDataURL("image/jpeg", 0.7));
      }
      mediaStream.getTracks().forEach((t) => t.stop());
    } catch {
      setCameraError("Camera not available in this browser. Please use 'Upload Photo' instead.");
      toast.error("Camera unavailable — try uploading a photo instead.");
    }
  }, [onCapture]);

  const isGranted = (permission: string) => permission === "granted" || permission === "limited";

  const hasRequiredPermission = (source: CameraSource, permissions: { camera: string; photos: string }) => {
    return source === CameraSource.Camera
      ? isGranted(permissions.camera)
      : isGranted(permissions.photos);
  };

  const ensureNativePermissions = useCallback(async (source: CameraSource) => {
    try {
      const current = await Camera.checkPermissions();
      if (hasRequiredPermission(source, current)) return true;

      const requested = await Camera.requestPermissions({
        permissions: ["camera", "photos"],
      });

      return hasRequiredPermission(source, requested);
    } catch (error) {
      console.error("Camera permission check failed:", error);
      // Let getPhoto surface a more specific native error if this fails
      return true;
    }
  }, []);

  const resizeImage = (dataUrl: string, maxWidth = 1280, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = Math.round((h * maxWidth) / w);
          w = maxWidth;
        }
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        c.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL("image/jpeg", quality));
      };
      img.src = dataUrl;
    });
  };

  const blobToDataUrl = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to process selected image"));
        }
      };
      reader.onerror = () => reject(new Error("Failed to process selected image"));
      reader.readAsDataURL(blob);
    });
  };

  const openFileInputFallback = (source: CameraSource) => {
    if (!fileInputRef.current) return;

    if (source === CameraSource.Camera) {
      fileInputRef.current.setAttribute("capture", "environment");
    } else {
      fileInputRef.current.removeAttribute("capture");
    }

    fileInputRef.current.click();
  };

  const takeNativePhoto = useCallback(async (source: CameraSource) => {
    if (isOpeningPicker) return;

    setIsOpeningPicker(true);
    setCameraError(null);

    try {
      const hasPermission = await ensureNativePermissions(source);
      if (!hasPermission) {
        const deniedMessage =
          source === CameraSource.Camera
            ? "Camera permission is required. Please enable it in iPhone Settings."
            : "Photo library permission is required. Please enable it in iPhone Settings.";
        setCameraError(deniedMessage);
        toast.error(deniedMessage);
        return;
      }

      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source,
        width: 1280,
        correctOrientation: true,
        presentationStyle: "fullscreen",
      });

      if (image.webPath) {
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        const dataUrl = await blobToDataUrl(blob);
        const compressed = await resizeImage(dataUrl);
        onCapture(compressed);
        return;
      }

      if (image.dataUrl) {
        const compressed = await resizeImage(image.dataUrl);
        onCapture(compressed);
        return;
      }

      toast.error("Failed to capture photo. Please try again.");
    } catch (err: any) {
      const msg = err?.message || "";
      const normalizedMsg = msg.toLowerCase();

      if (
        normalizedMsg.includes("cancel") ||
        normalizedMsg.includes("user cancelled") ||
        normalizedMsg.includes("canceled")
      ) {
        return;
      }

      console.error("Native camera error:", err);

      if (
        normalizedMsg.includes("permission") ||
        normalizedMsg.includes("denied") ||
        normalizedMsg.includes("not authorized")
      ) {
        const permissionMessage =
          source === CameraSource.Camera
            ? "Camera access is blocked. Enable Camera permission in iPhone Settings."
            : "Photo access is blocked. Enable Photos permission in iPhone Settings.";
        setCameraError(permissionMessage);
        toast.error(permissionMessage);
        return;
      }

      openFileInputFallback(source);
      toast.error(
        source === CameraSource.Camera
          ? "Native camera failed — using fallback picker."
          : "Native photo picker failed — using fallback picker."
      );
    } finally {
      setIsOpeningPicker(false);
    }
  }, [ensureNativePermissions, isOpeningPicker, onCapture]);

  const openCamera = useCallback(() => {
    setCameraError(null);
    if (isNative) {
      takeNativePhoto(CameraSource.Camera);
    } else {
      startWebCamera();
    }
  }, [isNative, startWebCamera, takeNativePhoto]);

  const uploadPhoto = useCallback(() => {
    setCameraError(null);
    if (isNative) {
      takeNativePhoto(CameraSource.Photos);
    } else {
      fileInputRef.current?.removeAttribute("capture");
      fileInputRef.current?.click();
    }
  }, [isNative, takeNativePhoto]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const compressed = await resizeImage(base64);
      onCapture(compressed);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Guide frame preview */}
      <div className="w-full aspect-[3/4] max-h-[50vh] rounded-2xl bg-secondary flex flex-col items-center justify-center gap-4 border-2 border-dashed border-border relative overflow-hidden">
        {/* Visual guide hint */}
        <div className="absolute inset-4 pointer-events-none">
          <div className="absolute top-0 left-0 w-10 h-10 border-t-[3px] border-l-[3px] border-primary/40 rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-10 h-10 border-t-[3px] border-r-[3px] border-primary/40 rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-10 h-10 border-b-[3px] border-l-[3px] border-primary/40 rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-10 h-10 border-b-[3px] border-r-[3px] border-primary/40 rounded-br-lg" />
        </div>

        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <CameraIcon className="w-10 h-10 text-primary" />
        </div>
        <p className="text-body-lg text-muted-foreground text-center px-8">
          Position the parking sign within the frame when taking your photo
        </p>
      </div>

      {cameraError && (
        <div className="w-full rounded-xl bg-warning/10 border border-warning/30 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-body text-foreground">{cameraError}</p>
        </div>
      )}

      <div className="flex flex-col gap-3 w-full">
        <Button
          variant="capture"
          size="lg"
          onClick={openCamera}
          disabled={isAnalyzing || isOpeningPicker}
          className="w-full"
        >
          <CameraIcon className="h-6 w-6" />
          Open Camera
        </Button>
        <Button
          variant="outline"
          size="default"
          onClick={uploadPhoto}
          disabled={isAnalyzing || isOpeningPicker}
          className="w-full"
        >
          <ImagePlus className="h-5 w-5" />
          Upload Photo
        </Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
};

export default CameraCapture;
