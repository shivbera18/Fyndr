import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Header from "../navbar/Header";
import Footer from "../Footer";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { ResponsiveModal } from "../../components/ui/responsive-modal";
import { PageShell, PageHero, SectionCard, Callout, StatusBadge } from "../../components/ui/page-kit";
import { API_URL } from "../../utils/api";
import { signOut } from "../../utils/session";
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
  Loader2,
  Sliders,
  Sparkles,
  ImageUp,
} from "lucide-react";
import { PWAStudioCard } from "../../components/pwa";
import UploadQualityToggle from "./UploadQualityToggle";

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
    void signOut().finally(() => navigate("/login"));
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
        void signOut().finally(() => navigate("/login"));
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

  return (
    <PageShell header={<Header />} footer={<Footer />} maxWidth="max-w-4xl">
      <div className="space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <nav className="flex items-center gap-2 text-xs text-muted-foreground" aria-label="Breadcrumb">
            <Link to="/dashboard" className="hover:text-foreground transition-colors flex items-center gap-1 min-h-[44px]">
              <ArrowLeft className="size-3.5" />
              Back to Dashboard
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Account Settings</span>
          </nav>

          <Link
            to="/settings"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground min-h-[44px]"
          >
            <Sliders className="size-3.5 text-primary" />
            Studio Branding
          </Link>
        </div>

        <PageHero
          align="left"
          kicker="Photographer account"
          title={name || "Photographer Account"}
          lead={email || "photographer@fyndr.cloud"}
          actions={
            <>
              <StatusBadge status={isVerified ? "ok" : "pending"}>
                <ShieldCheck className="size-3" />
                {isVerified ? "Verified Pro" : "Verification pending"}
              </StatusBadge>
              {memberSince && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="size-3.5" />
                  Joined {memberSince}
                </span>
              )}
            </>
          }
        />

        {/* Status Notification Banner */}
        {status && (
          <Callout variant={status.kind === "success" ? "success" : "error"} title={status.kind === "success" ? "Saved" : "Something needs attention"}>
            {status.message}
          </Callout>
        )}

        {/* Main Settings Form — settings-row cards: title/desc left, control right */}
        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <SectionCard
            title={
              <span className="flex items-center gap-2">
                <User className="size-4 text-primary" />
                Personal Information
              </span>
            }
            description="Update your photographer identity and primary contact email address."
          >
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:items-start">
              <p className="text-[11px] text-muted-foreground md:pt-1">
                This name is displayed on your galleries, email dispatches, and client proofing portals.
              </p>
              <div className="space-y-4">
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
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title={
              <span className="flex items-center gap-2">
                <Key className="size-4 text-primary" />
                Security &amp; Password
              </span>
            }
            description="Keep your studio account secure. Leave password fields blank if you do not wish to change it."
          >
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:items-start">
              <p className="text-[11px] text-muted-foreground md:pt-1">
                Changing the password signs other devices out on next use.
              </p>
              <div className="space-y-4">
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
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title={
              <span className="flex items-center gap-2">
                <ImageUp className="size-4 text-primary" />
                Upload Quality
              </span>
            }
            description="Compressed uploads are faster and near-lossless. Switch to original for full-resolution archival."
          >
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:items-start">
              <p className="text-[11px] text-muted-foreground md:pt-1">
                Applies to every photo you upload from this device.
              </p>
              <UploadQualityToggle />
            </div>
          </SectionCard>

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

        {/* Studio hub — the deep account view links back to shared settings, no duplicated branding form */}
        <SectionCard
          title={
            <span className="flex items-center gap-2">
              <Sliders className="size-4 text-emerald-500" />
              Connected Studio &amp; Client Experience
            </span>
          }
          description="Configure how clients see your studio branding, logo watermarks, and WhatsApp booking leads."
        >
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p className="text-foreground font-medium">Studio Branding &amp; Watermark Config</p>
              <p>Customize studio name, phone number, portfolio offer, and watermark position — managed once in Settings.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] rounded-xl text-xs font-medium px-4 shrink-0"
              onClick={() => navigate("/settings")}
            >
              Configure Studio
            </Button>
          </div>
        </SectionCard>

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
      </div>

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
    </PageShell>
  );
}
