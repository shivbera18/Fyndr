import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  BarChart2,
  Calendar,
  PlusCircle,
  LogOut,
  Sliders,
  ShieldCheck,
} from "lucide-react";

export interface SessionUser {
  _id?: string;
  name?: string;
  email?: string;
}

interface AccountMenuProps {
  user: SessionUser;
  onLogout: () => void;
  onUserUpdated?: (updated: SessionUser) => void;
}

export default function AccountMenu({
  user,
  onLogout,
  onUserUpdated,
}: AccountMenuProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "P";

  return (
    <>
      <div className="relative inline-block" ref={menuRef}>
        {/* Account Icon Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`group flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring ${
            isOpen
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-background hover:bg-muted/80 text-foreground"
          }`}
          aria-label="Account settings and profile"
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <div className="flex items-center justify-center size-8 rounded-full bg-muted text-foreground group-hover:bg-primary group-hover:text-primary-foreground font-semibold text-xs transition-colors">
            {user.name ? initials : <User className="size-4" />}
          </div>
        </button>

        {/* Dropdown Popover */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl z-50 p-2 animate-in fade-in-0 zoom-in-95 origin-top-right">
            {/* User Profile Header */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/60">
              <div className="flex items-center justify-center size-10 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {user.name || "Photographer"}
                  </p>
                  <ShieldCheck className="size-3 text-emerald-500 shrink-0" />
                </div>
                <p className="text-[11px] text-muted-foreground truncate font-mono">
                  {user.email || "No email on file"}
                </p>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1.5 space-y-0.5">
              {/* Account Details Action */}
              {/* My Account Action */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/account");
                }}
                className="w-full flex items-center gap-2.5 px-3 min-h-[44px] rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors text-left"
              >
                <div className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary">
                  <User className="size-3.5" />
                </div>
                <div>
                  <div className="font-medium text-foreground">My Account</div>
                  <div className="text-[10px] text-muted-foreground">Manage profile, security & credentials</div>
                </div>
              </button>

              {/* Studio Settings & Branding */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/settings");
                }}
                className="w-full flex items-center gap-2.5 px-3 min-h-[44px] rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors text-left"
              >
                <div className="flex items-center justify-center size-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Sliders className="size-3.5" />
                </div>
                <div>
                  <div className="font-medium text-foreground">Studio Settings & Branding</div>
                  <div className="text-[10px] text-muted-foreground">Watermark, WhatsApp & studio info</div>
                </div>
              </button>

              {/* Studio Analytics */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/analytics");
                }}
                className="w-full flex items-center gap-2.5 px-3 min-h-[44px] rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors text-left"
              >
                <div className="flex items-center justify-center size-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <BarChart2 className="size-3.5" />
                </div>
                <div>
                  <div className="font-medium text-foreground">Studio Analytics</div>
                  <div className="text-[10px] text-muted-foreground">View visitor scans, searches & leads</div>
                </div>
              </button>

              {/* Create Event */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/create-event");
                }}
                className="w-full flex items-center gap-2.5 px-3 min-h-[44px] rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors text-left"
              >
                <div className="flex items-center justify-center size-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <PlusCircle className="size-3.5" />
                </div>
                <div>
                  <div className="font-medium text-foreground">Create Event</div>
                  <div className="text-[10px] text-muted-foreground">Launch new PIN-protected or public gallery</div>
                </div>
              </button>

              {/* My Events */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/dashboard");
                }}
                className="w-full flex items-center gap-2.5 px-3 min-h-[44px] rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors text-left"
              >
                <div className="flex items-center justify-center size-7 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Calendar className="size-3.5" />
                </div>
                <div>
                  <div className="font-medium text-foreground">My Events</div>
                  <div className="text-[10px] text-muted-foreground">Manage active galleries & uploads</div>
                </div>
              </button>
            </div>

            {/* Sign Out Divider & Button */}
            <div className="pt-1.5 mt-1 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2.5 px-3 min-h-[44px] rounded-xl text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors text-left"
              >
                <div className="flex items-center justify-center size-7 rounded-lg bg-destructive/10 text-destructive">
                  <LogOut className="size-3.5" />
                </div>
                <span className="font-medium">Sign out</span>
              </button>
            </div>
          </div>
        )}
      </div>

    </>
  );
}
