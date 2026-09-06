import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Header from "../navbar/Header";
import Footer from "../Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { ResponsiveModal } from "../../components/ui/responsive-modal";
import { API_URL } from "../../utils/api";
import {
  User,
  Mail,
  Key,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  Trash2,
  LogOut,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sliders,
  Sparkles,
} from "lucide-react";
import { PWAStudioCard } from "../../components/pwa";

export default function AccountPage(): React.JSX.Element {
  const navigate = useNavigate();

  // Profile fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [memberSince, setMemberSince] = useState<string>("");
  const [isVerified, setIsVerified] = useState<boolean>(true);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  // Danger zone modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const rawUser = localStorage.getItem("user");
  const parsedUser = rawUser ? JSON.parse(rawUser) : {};
  const userId = parsedUser._id;

  // Auth guard & data fetch
  useEffect(() => {
    if (!userId) {
      navigate("/login");
      return;
    }

    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const u = JSON.parse(stored);
        if (u.name) setName(u.name);
        if (u.email) setEmail(u.email);
      }
    } catch {}
    const fetchUserDetails = async () => {
      try {
        const res = await fetch(`${API_URL}/user/${userId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.name) setName(data.name);
          if (data.email) setEmail(data.email);
          if (data.isVerified !== undefined) setIsVerified(data.isVerified);
          if (data.createdAt) {
            setMemberSince(
              new Date(data.createdAt).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })
            );
          }
        }
      } catch {
        // Fallback to local storage values
      }
    };

    fetchUserDetails();
  }, [userId, navigate]);

  // Handle Profile & Password Updates
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    if (newPassword && newPassword !== confirmPassword) {
      setStatus({ kind: "error", message: "New password and confirmation do not match." });
      return;
    }

    if (newPassword && !currentPassword) {
      setStatus({ kind: "error", message: "Current password is required to set a new password." });
      return;
    }

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
        // Update local storage and notify listeners
        const updated = {
          ...parsedUser,
          name: data.user.name,
          email: data.user.email,
        };
        localStorage.setItem("user", JSON.stringify(updated));
        window.dispatchEvent(new Event("user-updated"));

        setStatus({ kind: "success", message: "Your account profile has been saved successfully." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setStatus({
          kind: "error",
          message: data.message || "Failed to update profile. Please verify your details.",
        });
      }
    } catch {
      setStatus({
        kind: "error",
        message: "Network error. Failed to communicate with auth server.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    } catch {}
    navigate("/login");
  };

  // Handle Account Deletion
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      setDeleteError('Please type "DELETE" to confirm account deletion.');
      return;
    }

    setDeleteLoading(true);
    setDeleteError("");

    try {
      const res = await fetch(`${API_URL}/user/${userId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        navigate("/login");
      } else {
        const d = await res.json();
        setDeleteError(d.message || "Failed to delete account. Please try again.");
      }
    } catch {
      setDeleteError("Network error. Could not delete account.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "P";

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />

      <main className="flex-1 container mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <nav className="flex items-center gap-2 text-xs text-muted-foreground" aria-label="Breadcrumb">
            <Link to="/dashboard" className="hover:text-foreground transition-colors flex items-center gap-1">
              <ArrowLeft className="size-3.5" />
              Back to Dashboard
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Account Settings</span>
          </nav>

          <Link
            to="/settings"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Sliders className="size-3.5 text-primary" />
            Studio Branding
          </Link>
        </div>

        {/* Hero Profile Overview Card */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-muted/50 to-muted/20 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative flex items-center justify-center size-16 rounded-full bg-primary text-primary-foreground font-bold text-xl shadow-md ring-4 ring-background">
                {initials}
                {isVerified && (
                  <span
                    className="absolute bottom-0 right-0 size-4 rounded-full bg-emerald-500 ring-2 ring-background"
                    title="Verified Account"
                  />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    {name || "Photographer Account"}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="size-3" />
                    Verified Pro
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground font-mono">
                  {email || "photographer@fyndr.cloud"}
                </p>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end gap-2 text-xs text-muted-foreground w-full sm:w-auto justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-border">
              {memberSince && (
                <div className="inline-flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  <span>Joined {memberSince}</span>
                </div>
              )}
              <span className="font-mono text-[11px] text-muted-foreground/80">
                ID: {userId ? userId.substring(0, 10) : "active"}…
              </span>
            </div>
          </div>
        </div>

        {/* Status Notification Banner */}
        {status && (
          <div
            className={`flex items-start gap-2.5 p-4 rounded-xl text-xs font-medium ${
              status.kind === "success"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}
            role="alert"
          >
            {status.kind === "success" ? (
              <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">{status.message}</div>
          </div>
        )}

        {/* Main Settings Form Card */}
        <form onSubmit={handleUpdateProfile} className="space-y-6">
          {/* Section 1: Personal Identity */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <User className="size-4 text-primary" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Update your photographer identity and primary contact email address.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="account-name" className="text-xs font-medium">
                  Full Name / Display Name
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
                <p className="text-[11px] text-muted-foreground">
                  This name is displayed on your galleries, email dispatches, and client proofing portals.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="account-email" className="text-xs font-medium">
                  Email Address (Login ID)
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
                <p className="text-[11px] text-muted-foreground">
                  Used for account security, verification codes, and client inquiries.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Security & Password */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Key className="size-4 text-primary" />
                Security &amp; Password
              </CardTitle>
              <CardDescription>
                Keep your studio account secure. Leave password fields blank if you do not wish to change it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="account-current-pass" className="text-xs font-medium">
                  Current Password
                </Label>
                <Input
                  id="account-current-pass"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password to verify"
                  className="min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="account-new-pass" className="text-xs font-medium">
                    New Password
                  </Label>
                  <Input
                    id="account-new-pass"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="min-h-[44px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account-confirm-pass" className="text-xs font-medium">
                    Confirm New Password
                  </Label>
                  <Input
                    id="account-confirm-pass"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="min-h-[44px]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form Save Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="submit"
              className="min-h-[44px] px-6 rounded-xl font-semibold shadow-xs flex items-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving Changes…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Section 3: Studio & Events Quick Hub */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Sliders className="size-4 text-emerald-500" />
              Connected Studio &amp; Client Experience
            </CardTitle>
            <CardDescription>
              Configure how clients see your studio branding, logo watermarks, and WhatsApp booking leads.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p className="text-foreground font-medium">Studio Branding &amp; Watermark Config</p>
              <p>Customize studio name, phone number, portfolio offer, and watermark position.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] rounded-xl text-xs font-medium px-4 shrink-0"
              onClick={() => navigate("/settings")}
            >
              Configure Studio
            </Button>
          </CardContent>
        </Card>

        {/* Progressive Web App / Studio Desktop App */}
        <PWAStudioCard />

        {/* Section 4: Danger Zone */}
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 space-y-4">
          <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
            <AlertTriangle className="size-4" />
            <span>Danger Zone</span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-foreground">Sign Out of Session</p>
              <p className="text-xs text-muted-foreground">
                Safely end your photographer session on this device.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] rounded-xl text-xs font-medium border-border hover:bg-muted"
              onClick={handleLogout}
            >
              <LogOut className="size-3.5 mr-1.5" />
              Sign Out
            </Button>
          </div>

          <div className="border-t border-destructive/20 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-destructive">Delete Account</p>
              <p className="text-xs text-muted-foreground">
                Permanently delete your Fyndr account, profile credentials, and associated preferences.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              className="min-h-[44px] rounded-xl text-xs font-semibold"
              onClick={() => {
                setDeleteConfirmText("");
                setDeleteError("");
                setDeleteModalOpen(true);
              }}
            >
              <Trash2 className="size-3.5 mr-1.5" />
              Delete Account
            </Button>
          </div>
        </div>
      </main>

      {/* Delete Account Confirmation Modal */}
      <ResponsiveModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Delete Your Account"
        description="This action cannot be undone. This will permanently delete your photographer account credentials."
        className="max-w-md"
      >
        <div className="space-y-4 pt-2">
          {deleteError && (
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 text-xs font-medium">
              {deleteError}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Please type <span className="font-mono font-bold text-foreground">DELETE</span> to confirm you want to permanently delete your account.
          </p>

          <div className="space-y-1.5">
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="min-h-[44px] font-mono text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3">
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              className="min-h-[44px] rounded-xl text-xs"
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              className="min-h-[44px] rounded-xl text-xs font-semibold"
              disabled={deleteConfirmText !== "DELETE" || deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Permanently Delete"
              )}
            </Button>
          </div>
        </div>
      </ResponsiveModal>

      <Footer />
    </div>
  );
}
