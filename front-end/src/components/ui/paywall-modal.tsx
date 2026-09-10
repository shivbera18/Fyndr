import * as React from "react";
import { ResponsiveModal } from "./responsive-modal";
import { Button } from "./button";
import { Badge } from "./badge";
import { Check, Sparkles, ShieldCheck, Download, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import axios from "axios";
import { toast } from "sonner";
import { API_URL } from "../../utils/api";

export interface PaywallConfig {
  enabled: boolean;
  stage: "download" | "batch_download" | "watermark_removal" | "entry";
  pricePerPhoto: number;
  priceFullAlbum: number;
  freePhotoLimit: number;
  currency: string;
  customMessage?: string;
}

export interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: PaywallConfig;
  studioName?: string;
  eventId: string;
  photoName?: string;
  matchedPhotoCount?: number;
  onUnlockSuccess: (result: { tier: "single" | "album"; photoName?: string; transactionId?: string }) => void;
  testMode?: boolean;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

const STAGE_INFO: Record<string, { badge: string; defaultDesc: string }> = {
  download: {
    badge: "High-Resolution Download",
    defaultDesc: "Unlock original high-resolution photos directly from the photographer's camera.",
  },
  batch_download: {
    badge: "Photo Bundle Upgrade",
    defaultDesc: "You have reached the free download limit. Unlock unlimited high-resolution downloads.",
  },
  watermark_removal: {
    badge: "Watermark-Free Originals",
    defaultDesc: "Remove watermarks and receive crisp, uncompressed original images.",
  },
  entry: {
    badge: "Gallery Access Pass",
    defaultDesc: "Unlock full access to view and download all your matched photos from this event.",
  },
};

export function PaywallModal({
  open,
  onOpenChange,
  config,
  studioName,
  eventId,
  photoName,
  matchedPhotoCount = 1,
  onUnlockSuccess,
  testMode = false,
}: PaywallModalProps) {
  const [selectedTier, setSelectedTier] = React.useState<"album" | "single">("album");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);

  // Reset state when modal opens
  React.useEffect(() => {
    if (open) {
      setSelectedTier("album");
      setIsProcessing(false);
      setIsSuccess(false);
    }
  }, [open]);

  const currencySymbol = CURRENCY_SYMBOLS[config.currency] || config.currency || "₹";
  const stageMeta = STAGE_INFO[config.stage] || STAGE_INFO.download;
  const activeAmount = selectedTier === "single" ? config.pricePerPhoto : config.priceFullAlbum;

  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    try {
      if (testMode) {
        // Studio dashboard preview mode: mock response
        await new Promise((resolve) => setTimeout(resolve, 800));
        setIsSuccess(true);
        toast.success("Test Payment Succeeded! Paywall is functioning properly.");
        setTimeout(() => {
          onUnlockSuccess({
            tier: selectedTier,
            photoName,
            transactionId: "test_tx_" + Date.now(),
          });
          onOpenChange(false);
        }, 800);
        return;
      }
      const res = await axios.post(`${API_URL}/events/${eventId}/paywall/unlock`, {
        tier: selectedTier,
        photoName,
      });

      if (res.data?.ok) {
        setIsSuccess(true);
        toast.success("Payment simulated successfully! Downloads unlocked.");
        setTimeout(() => {
          onUnlockSuccess({
            tier: selectedTier,
            photoName,
            transactionId: res.data.transactionId,
          });
          onOpenChange(false);
        }, 800);
      } else {
        toast.error("Failed to process unlock. Please try again.");
        setIsProcessing(false);
      }
    } catch (err: unknown) {
      // If network fails in demo mode, still allow graceful fallback
      const errorMsg = err instanceof Error ? err.message : "Unlock failed";
      toast.error(errorMsg);
      setIsProcessing(false);
    }
  };

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange} className="sm:max-w-md">
      <div className="space-y-4 text-foreground pt-1">
        {/* Header Badge & Studio Attribution */}
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-3">
          <Badge variant="brand" className="text-xs font-semibold uppercase tracking-wider">
            {stageMeta.badge}
          </Badge>
          {studioName && (
            <span className="text-xs font-medium text-muted-foreground truncate max-w-[200px]">
              by {studioName}
            </span>
          )}
        </div>

        {/* Studio Message / Title */}
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-foreground">
            {config.stage === "entry" ? "Unlock Your Matched Gallery" : "Unlock Full-Resolution Photos"}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {config.customMessage?.trim() || stageMeta.defaultDesc}
          </p>
        </div>

        {/* Tier Cards */}
        <div className="grid grid-cols-1 gap-2.5 pt-1">
          {/* Full Album Pass */}
          <button
            type="button"
            onClick={() => setSelectedTier("album")}
            className={cn(
              "relative w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-start justify-between gap-3",
              selectedTier === "album"
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-border/80 bg-card"
            )}
          >
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground">All Matched Photos</span>
                <span className="bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Best Value
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Download all {matchedPhotoCount > 1 ? `${matchedPhotoCount} ` : ""}photos with original DSLR quality & zero limits.
              </p>
            </div>
            <div className="text-right whitespace-nowrap pl-2">
              <div className="text-base font-extrabold text-foreground">
                {currencySymbol}
                {config.priceFullAlbum}
              </div>
              <span className="text-[10px] text-muted-foreground">One-time</span>
            </div>
          </button>

          {/* Single Photo Option (only if not entry stage) */}
          {config.stage !== "entry" && (
            <button
              type="button"
              onClick={() => setSelectedTier("single")}
              className={cn(
                "relative w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-start justify-between gap-3",
                selectedTier === "single"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-border/80 bg-card"
              )}
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground">Single Photo Only</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {photoName ? `Unlock "${photoName.slice(0, 20)}..."` : "Unlock currently selected photo"} in original resolution.
                </p>
              </div>
              <div className="text-right whitespace-nowrap pl-2">
                <div className="text-base font-extrabold text-foreground">
                  {currencySymbol}
                  {config.pricePerPhoto}
                </div>
                <span className="text-[10px] text-muted-foreground">Per photo</span>
              </div>
            </button>
          )}
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground py-1">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-green-500 shrink-0" />
            <span>Official studio originals</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>Instant high-speed download</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          {isSuccess ? (
            <div className="w-full py-3 bg-green-500/15 border border-green-500/30 text-green-600 dark:text-green-400 rounded-lg flex items-center justify-center gap-2 font-medium text-sm animate-in fade-in">
              <Check className="w-4 h-4" />
              <span>Unlocked! Resuming download...</span>
            </div>
          ) : (
            <Button
              type="button"
              className="w-full h-11 text-sm font-semibold rounded-lg"
              disabled={isProcessing}
              onClick={handleSimulatePayment}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Processing Simulated Payment...
                </>
              ) : (
                <>
                  Simulate Payment ({currencySymbol}
                  {activeAmount}) <span className="opacity-75 text-xs font-normal ml-1">[Demo Mode]</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </ResponsiveModal>
  );
}
