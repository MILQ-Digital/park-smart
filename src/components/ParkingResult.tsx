import { CheckCircle2, XCircle, Clock, DollarSign, AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface DirectionInfo {
  side: "left" | "right";
  canPark: boolean;
  summary: string;
  maxDuration?: string | null;
  cost?: string | null;
}

export interface ParkingInfo {
  canPark: boolean;
  summary: string;
  maxDuration: string | null;
  cost: string | null;
  restrictions: string[];
  timeDependent: string | null;
  hasMultipleDirections?: boolean;
  directions?: DirectionInfo[];
}

interface ParkingResultProps {
  result: ParkingInfo;
  capturedImage: string;
  onReset: () => void;
  onSelectSide?: (side: "left" | "right") => void;
}

const ParkingResult = ({ result, capturedImage, onReset, onSelectSide }: ParkingResultProps) => {
  // If the sign has multiple directions and we haven't picked a side yet
  if (result.hasMultipleDirections && result.directions && result.directions.length > 0 && onSelectSide) {
    return (
      <div className="flex flex-col gap-5 animate-slide-up">
        {/* Captured image preview */}
        <div className="relative w-full rounded-2xl overflow-hidden shadow-md">
          <img src={capturedImage} alt="Captured parking sign" className="w-full aspect-video object-cover" />
        </div>

        {/* Direction prompt */}
        <div className="rounded-2xl p-6 bg-info/10 border border-info/30 text-center">
          <p className="text-heading text-foreground mb-2">Which side are you parking?</p>
          <p className="text-body text-muted-foreground">
            This sign has different rules for each direction. Tap the side where your car is.
          </p>
        </div>

        {/* Direction choices */}
        <div className="grid grid-cols-2 gap-4">
          {result.directions.map((dir) => {
            const isShortDir = dir.canPark && dir.maxDuration && (() => {
              const match = dir.maxDuration!.match(/(\d+)\s*min/i);
              return match && parseInt(match[1], 10) < 10;
            })();

            const borderColor = !dir.canPark
              ? "border-destructive/40 bg-destructive/5 hover:bg-destructive/10"
              : isShortDir
                ? "border-accent/40 bg-accent/5 hover:bg-accent/10"
                : "border-success/40 bg-success/5 hover:bg-success/10";

            return (
              <button
                key={dir.side}
                onClick={() => onSelectSide(dir.side)}
                className={`rounded-2xl p-5 border-2 text-left transition-all active:scale-[0.97] ${borderColor}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-heading">
                    {dir.side === "left" ? "← Left" : "Right →"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {!dir.canPark ? (
                    <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                  ) : isShortDir ? (
                    <AlertTriangle className="h-5 w-5 text-accent flex-shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                  )}
                  <span className="text-label text-foreground">
                    {!dir.canPark ? "No Parking" : isShortDir ? "Limited Time" : "Can Park"}
                  </span>
                </div>
                <p className="text-body text-muted-foreground">{dir.summary}</p>
              </button>
            );
          })}
        </div>

        {/* Scan another */}
        <Button variant="outline" size="lg" onClick={onReset} className="w-full mt-2">
          <ArrowLeft className="h-5 w-5" />
          Scan Another Sign
        </Button>
      </div>
    );
  }

  // Check if duration is under 10 minutes
  const isShortDuration = result.canPark && result.maxDuration && (() => {
    const match = result.maxDuration!.match(/(\d+)\s*min/i);
    return match && parseInt(match[1], 10) < 10;
  })();

  const verdictColor = !result.canPark
    ? "bg-destructive text-destructive-foreground"
    : isShortDuration
      ? "bg-accent text-accent-foreground"
      : "bg-success text-success-foreground";

  const verdictLabel = !result.canPark
    ? "No Parking"
    : isShortDuration
      ? "Limited Time"
      : "You Can Park Here";

  return (
    <div className="flex flex-col gap-5 animate-slide-up">
      {/* Captured image preview */}
      <div className="relative w-full rounded-2xl overflow-hidden shadow-md">
        <img src={capturedImage} alt="Captured parking sign" className="w-full aspect-video object-cover" />
      </div>

      {/* Main verdict */}
      <div className={`rounded-2xl p-6 flex items-center gap-4 shadow-md ${verdictColor}`}>
        {result.canPark ? (
          isShortDuration ? (
            <AlertTriangle className="h-12 w-12 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="h-12 w-12 flex-shrink-0" />
          )
        ) : (
          <XCircle className="h-12 w-12 flex-shrink-0" />
        )}
        <div>
          <p className="text-heading">{verdictLabel}</p>
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
