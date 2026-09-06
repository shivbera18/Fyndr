import React, { useState, useEffect } from "react";
import { ResponsiveModal } from "../../components/ui/responsive-modal";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { API_URL } from "../../utils/api";
import { User, Mail, Key, ShieldCheck, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export interface AccountDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated?: (updatedUser: { _id?: string; name?: string; email?: string }) => void;
}

export default function AccountDetailsModal({
  open,
  onOpenChange,
  onUserUpdated,
}: AccountDetailsModalProps): React.JSX.Element {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  const rawUser = localStorage.getItem("user");
  const parsedUser = rawUser ? JSON.parse(rawUser) : {};
  const userId = parsedUser._id;

  useEffect(() => {
    if (!open || !userId) return;

    // Prefill from local storage
    setName(parsedUser.name || "");
    setEmail(parsedUser.email || "");
    setStatus(null);
    setCurrentPassword("");
    setNewPassword("");

    // Fetch latest user details from server
    const fetchUser = async () => {
      try {
        const res = await fetch(`${API_URL}/user/${userId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.name) setName(data.name);
          if (data.email) setEmail(data.email);
        }
      } catch {
        // Fallback to local storage values
      }
    };

    fetchUser();
  }, [open, userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setLoading(true);
    setStatus(null);

    try {
      const payload: Record<string, string> = {
        name: name.trim(),
        email: email.trim(),
      };

      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await fetch(`${API_URL}/user/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.user) {
        // Update local storage
        const updated = {
          ...parsedUser,
          name: data.user.name,
          email: data.user.email,
        };
        localStorage.setItem("user", JSON.stringify(updated));
        window.dispatchEvent(new Event("user-updated"));

        if (onUserUpdated) {
          onUserUpdated(updated);
        }

        setStatus({ kind: "success", message: "Account details updated successfully!" });
        setCurrentPassword("");
        setNewPassword("");

        // Auto close after 1.2 seconds
        setTimeout(() => {
          onOpenChange(false);
          setStatus(null);
        }, 1200);
      } else {
        setStatus({
          kind: "error",
          message: data.message || "Failed to update account details. Please try again.",
        });
      }
    } catch {
      setStatus({
        kind: "error",
        message: "Network error. Failed to reach the server.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Account Details"
      description="Manage your photographer identity, contact email, and account security credentials."
      className="max-w-md"
    >
      <div className="space-y-5 pt-2">
        {/* Account Badge & Verification */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-9 rounded-full bg-primary/10 text-primary font-semibold text-sm">
              {name ? name.charAt(0).toUpperCase() : <User className="size-4" />}
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">{name || "Photographer"}</p>
              <p className="text-[11px] text-muted-foreground font-mono truncate max-w-[200px]">
                {email || "No email on file"}
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="size-3" />
            Verified
          </div>
        </div>

        {/* Status Message */}
        {status && (
          <div
            className={`flex items-start gap-2 p-3 rounded-xl text-xs font-medium ${
              status.kind === "success"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}
          >
            {status.kind === "success" ? (
              <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
            )}
            <span>{status.message}</span>
          </div>
        )}

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="account-name" className="text-xs font-medium">
              Full Name
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                id="account-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Shiv Bera"
                required
                className="pl-9 min-h-[44px]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="account-email" className="text-xs font-medium">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                id="account-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="photographer@example.com"
                required
                className="pl-9 min-h-[44px]"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-border space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Key className="size-3.5 text-muted-foreground" />
              Change Password (Optional)
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="current-password" className="text-xs font-medium">
                Current Password
              </Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter existing password"
                className="min-h-[44px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-password" className="text-xs font-medium">
                New Password
              </Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="min-h-[44px]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="min-h-[44px] px-4 rounded-xl text-xs"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="min-h-[44px] px-5 rounded-xl text-xs font-semibold shadow-xs"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </div>
    </ResponsiveModal>
  );
}
