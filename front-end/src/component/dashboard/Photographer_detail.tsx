import { useEffect, useState } from "react";
import { toast } from "sonner";
import { API_URL } from "../../utils/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";

export default function Photographer_detail(): React.JSX.Element {
  const [studioName, setStudioName] = useState("");
  const [phoneNo, setPhoneNo] = useState("");
  const [address, setAddress] = useState("");
  const [offer, setOffer] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user._id as string | undefined;

  useEffect(() => {
    const fetchStudio = async () => {
      if (!userId) return;
      try {
        const res = await fetch(`${API_URL}/find_studio`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ create_by: userId }),
        });
        const data = await res.json();
        if (data && data.studio_name) {
          setStudioName(data.studio_name || "");
          setPhoneNo(data.phone_no || "");
          setAddress(data.address || "");
          setOffer(data.offer || "");
          setDescription(data.description || "");
          if (typeof data.logoUrl === "string") setLogoUrl(data.logoUrl);
        }
      } catch {}
    };

    fetchStudio();
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    if (!userId) {
      setStatus({ kind: "error", text: "Please log in to save studio details." });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/studio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          create_by: userId,
          studio_name: studioName,
          phone_no: phoneNo,
          address,
          offer,
          description,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ kind: "success", text: "Studio details saved successfully." });
      } else {
        setStatus({ kind: "error", text: data.message || "Failed to save studio details." });
      }
    } catch {
      setStatus({ kind: "error", text: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  // ponytail: logo rides event_profile static mount; persist via existing POST /studio.
  const persistLogo = async (next: string | null) => {
    if (!userId) return;
    await fetch(`${API_URL}/studio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        create_by: userId,
        studio_name: studioName,
        phone_no: phoneNo,
        address,
        offer,
        description,
        logoUrl: next,
        logoUpdatedAt: next ? new Date().toISOString() : null,
      }),
    }).catch(() => {});
  };

  const handleLogoFile = async (file: File | undefined) => {
    if (!file || !userId) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2MB.");
      return;
    }
    setLogoBusy(true);
    try {
      const form = new FormData();
      form.append("logo", file);
      const up = await fetch(`${API_URL}/studio/logo`, { method: "POST", body: form });
      const data = await up.json().catch(() => null);
      if (!up.ok || !data || typeof data.logoUrl !== "string") {
        toast.error(data?.message || "Logo upload failed.");
        return;
      }
      setLogoUrl(data.logoUrl);
      await persistLogo(data.logoUrl);
      toast.success("Studio logo saved.");
    } catch {
      toast.error("Network error uploading logo.");
    } finally {
      setLogoBusy(false);
    }
  };

  const handleLogoRemove = async () => {
    setLogoUrl(null);
    await persistLogo(null);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Photographer &amp; studio branding</CardTitle>
          <CardDescription>
            This information will be displayed to guests when they access your event galleries and
            scan QR codes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status && (
            <div
              className={`mb-6 rounded-lg p-4 text-sm font-medium border ${
                status.kind === "success"
                  ? "bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800"
                  : "bg-destructive/10 text-destructive border-destructive/20"
              }`}
            >
              {status.text}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="studioName">Studio or brand name</Label>
              <Input
                id="studioName"
                value={studioName}
                onChange={(e) => setStudioName(e.target.value)}
                required
                placeholder="e.g. Apex Visuals & Wedding Cinema"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNo">Contact phone / WhatsApp</Label>
              <Input
                id="phoneNo"
                type="tel"
                value={phoneNo}
                onChange={(e) => setPhoneNo(e.target.value)}
                placeholder="+91 98765 43210"
                autoComplete="tel"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="offer">Special offers / tagline</Label>
              <Input
                id="offer"
                value={offer}
                onChange={(e) => setOffer(e.target.value)}
                placeholder="Book 2026 weddings & get 15% off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Studio location / address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Mumbai, India / Available Worldwide"
                autoComplete="street-address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">About your studio</Label>
              <textarea
                id="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell your clients and event guests about your photography experience…"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="studioLogo">Studio logo (corner mark on previews)</Label>
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <img src={`${API_URL}${logoUrl}`} alt="Studio logo" className="h-24 w-24 rounded-lg border object-contain bg-muted" />
                ) : (
                  <div className="h-24 w-24 rounded-lg border border-dashed flex items-center justify-center text-xs text-muted-foreground">
                    No logo
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <Input
                    id="studioLogo"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={logoBusy}
                    onChange={(e) => {
                      void handleLogoFile(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  {logoUrl ? (
                    <Button type="button" variant="outline" size="sm" disabled={logoBusy} onClick={() => void handleLogoRemove()} className="min-h-[44px]">
                      Remove logo
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              loading={loading}
              className="w-full sm:w-auto min-h-[44px]"
            >
              Save studio branding →
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
