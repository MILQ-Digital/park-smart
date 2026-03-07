import { CheckCircle2, XCircle, Clock, DollarSign, AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ParkingInfo {
  canPark: boolean;
  summary: string;
  maxDuration: string | null;
  cost: string | null;
  restrictions: string[];
  timeDependent: string | null;
}

interface ParkingResultProps {
  result: ParkingInfo;
  capturedImage: string;
  onReset: () => void;
}

const ParkingResult = ({ result, capturedImage, onReset }: ParkingResultProps) => {
  return (
    <div className="flex flex-col gap-5 animate-slide-up">
      {/* Captured image preview */}
      <div className="relative w-full rounded-2xl overflow-hidden shadow-md">
        <img src={capturedImage} alt="Captured parking sign" className="w-full aspect-video object-cover" />
      </div>

      {/* Main verdict */}
      <div
        className={`rounded-2xl p-6 flex items-center gap-4 shadow-md ${
          result.canPark ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"
        }`}
      >
        {result.canPark ? (
          <CheckCircle2 className="h-12 w-12 flex-shrink-0" />
        ) : (
          <XCircle className="h-12 w-12 flex-shrink-0" />
        )}
        <div>
          <p className="text-heading">{result.canPark ? "You Can Park Here" : "No Parking"}</p>
          <p className="text-body-lg opacity-90">{result.summary}</p>
        </div>
      </div>

      {/* Details cards */}
      <div className="grid grid-cols-2 gap-3">
        {result.maxDuration && (
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-info" />
              <span className="text-label text-muted-foreground">Time Limit</span>
            </div>
            <p className="text-subheading text-card-foreground">{result.maxDuration}</p>
          </div>
        )}
        {result.cost && (
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-success" />
              <span className="text-label text-muted-foreground">Cost</span>
            </div>
            <p className="text-subheading text-card-foreground">{result.cost}</p>
          </div>
        )}
      </div>

      {/* Time-dependent info */}
      {result.timeDependent && (
        <div className="bg-warning/10 rounded-xl p-4 border border-warning/30 flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-label text-foreground mb-1">Schedule Note</p>
            <p className="text-body text-muted-foreground">{result.timeDependent}</p>
          </div>
        </div>
      )}

      {/* Restrictions */}
      {result.restrictions.length > 0 && (
        <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
          <p className="text-label text-muted-foreground mb-2">Restrictions</p>
          <ul className="space-y-2">
            {result.restrictions.map((r, i) => (
              <li key={i} className="text-body text-foreground flex items-start gap-2">
                <span className="text-destructive mt-1">•</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Scan another */}
      <Button variant="default" size="lg" onClick={onReset} className="w-full mt-2">
        <ArrowLeft className="h-5 w-5" />
        Scan Another Sign
      </Button>
    </div>
  );
};

export default ParkingResult;
