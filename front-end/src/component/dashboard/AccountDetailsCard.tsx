import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { API_URL } from "../../utils/api";
import { User, Mail, Key, ShieldCheck, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { PWAStudioCard } from "../../components/pwa";

export default function AccountDetailsCard(): React.JSX.Element {
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
    if (!userId) return;

    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const u = JSON.parse(stored);
        if (u.name) setName(u.name);
        if (u.email) setEmail(u.email);
      }
    } catch {}

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
  }, [userId]);

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
        const updated = {
          ...parsedUser,
          name: data.user.name,
          email: data.user.email,
        };
        localStorage.setItem("user", JSON.stringify(updated));
        window.dispatchEvent(new Event("user-updated"));

        setStatus({ kind: "success", message: "Account profile updated successfully." });
        setCurrentPassword("");
        setNewPassword("");
      } else {
        setStatus({
          kind: "error",
          message: data.message || "Failed to update profile. Please check your credentials.",
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
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <User className="size-5 text-primary" />
                Account Details
              </CardTitle>
              <CardDescription>
                Manage your photographer identity, login email, and security credentials.
              </CardDescription>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="size-3.5" />
              Verified Account
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {status && (
            <div
              className={`flex items-start gap-2.5 p-3.5 rounded-xl text-xs font-medium ${
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Photographer / Studio Lead Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Shiv Bera"
                  required
                  className="pl-9 min-h-[44px]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-email">Login Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="photographer@example.com"
                  required
                  className="pl-9 min-h-[44px]"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border space-y-4">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Key className="size-4 text-muted-foreground" />
                Change Password (Optional)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-current-pass">Current Password</Label>
                  <Input
                    id="profile-current-pass"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="min-h-[44px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-new-pass">New Password</Label>
                  <Input
                    id="profile-new-pass"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="min-h-[44px]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                type="submit"
                className="min-h-[44px] px-6 rounded-xl font-semibold shadow-xs"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Saving Changes…
                  </>
                ) : (
                  "Save Account Details"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="mt-6">
        <PWAStudioCard />
      </div>
    </div>
  );
}
