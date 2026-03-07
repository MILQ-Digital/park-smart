import { Loader2 } from "lucide-react";

interface AnalyzingStateProps {
  capturedImage: string;
}

const AnalyzingState = ({ capturedImage }: AnalyzingStateProps) => {
  return (
    <div className="flex flex-col items-center gap-6 animate-slide-up">
      <div className="relative w-full rounded-2xl overflow-hidden shadow-md">
        <img src={capturedImage} alt="Analyzing sign" className="w-full aspect-video object-cover opacity-80" />
        <div className="absolute inset-0 bg-foreground/10 flex items-center justify-center">
          <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-6 flex flex-col items-center gap-3 shadow-lg">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="text-subheading text-foreground">Reading Sign...</p>
            <p className="text-body text-muted-foreground">This takes a few seconds</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyzingState;
