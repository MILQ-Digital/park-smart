import { useEffect, useState, useCallback } from "react";
import { CameraPreview } from "@capacitor-community/camera-preview";
import { X, Camera as CameraIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface LiveCameraViewProps {
  onCapture: (imageBase64: string) => void;
  onClose: () => void;
}

const LiveCameraView = ({ onCapture, onClose }: LiveCameraViewProps) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        await CameraPreview.start({
          position: "rear",
          toBack: true,
          parent: "camera-preview-container",
          className: "camera-preview",
          width: window.innerWidth,
          height: window.innerHeight,
          enableZoom: true,
        });
        if (mounted) setReady(true);
      } catch (err) {
        console.error("[LiveCamera] Failed to start:", err);
        toast.error("Couldn't start camera. Please try uploading a photo instead.");
        onClose();
      }
    };

    startCamera();

    return () => {
      mounted = false;
      CameraPreview.stop().catch(() => {});
    };
  }, [onClose]);

  const capturePhoto = useCallback(async () => {
    try {
      const result = await CameraPreview.capture({
        quality: 85,
      });
      const dataUrl = `data:image/jpeg;base64,${result.value}`;
      await CameraPreview.stop();
      onCapture(dataUrl);
    } catch (err) {
      console.error("[LiveCamera] Capture error:", err);
      toast.error("Failed to capture photo. Please try again.");
    }
  }, [onCapture]);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Camera preview renders behind this transparent container */}
      <div id="camera-preview-container" className="absolute inset-0" />

      {/* Overlay UI */}
      <div className="absolute inset-0 flex flex-col pointer-events-none">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pointer-events-auto"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              CameraPreview.stop().catch(() => {});
              onClose();
            }}
            className="text-white bg-black/40 rounded-full h-10 w-10"
          >
            <X className="h-6 w-6" />
          </Button>
          <span className="text-white text-sm font-medium bg-black/40 px-3 py-1.5 rounded-full">
            Position the sign inside the frame
          </span>
          <div className="w-10" />
        </div>

        {/* Guide frame */}
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="w-full max-w-sm aspect-[3/4] relative">
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-white/80 rounded-tl-xl" />
            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-white/80 rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-white/80 rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-white/80 rounded-br-xl" />
            {/* Subtle border between corners */}
            <div className="absolute inset-0 border-2 border-white/20 rounded-xl" />
          </div>
        </div>

        {/* Bottom capture button */}
        <div className="flex items-center justify-center pb-8 pointer-events-auto"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 32px)" }}>
          <button
            onClick={capturePhoto}
            disabled={!ready}
            className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-white/20 active:bg-white/40 transition-colors disabled:opacity-50"
          >
            <div className="w-16 h-16 rounded-full bg-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveCameraView;
