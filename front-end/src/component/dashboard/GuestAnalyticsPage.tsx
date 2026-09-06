import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { API_URL } from "../../utils/api";
import Header from "../navbar/Header";
import Footer from "../Footer";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import {
  Users,
  KeyRound,
  Download,
  ScanFace,
  FileSpreadsheet,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Smartphone,
  Tablet,
  Laptop,
  Activity,
  Search,
  MessageCircle,
  Loader2,
  ArrowLeft,
  Clock,
  ShieldCheck,
  Coins,
  CreditCard,
  Sparkles,
  TrendingUp,
  BarChart3,
  Layers,
  ChevronRight,
  Eye,
} from "lucide-react";
import { cn } from "../../lib/utils";

interface SummaryData {
  totalVisitors: number;
  uniqueGuests: number;
  verifiedGuests: number;
  totalAttempts: number;
  failedAttempts: number;
  totalSearches: number;
  totalDownloads: number;
  uniquePhotosDownloaded: number;
  downloadConversionRate: number;
  searchSuccessRate: number;
  paywall?: {
    enabled?: boolean;
    stage?: string;
    pricePerPhoto?: number;
    priceFullAlbum?: number;
    freePhotoLimit?: number;
    currency?: string;
    customMessage?: string;
    unlockedCount?: number;
    totalRevenue?: number;
  } | null;
}

interface GuestItem {
  _id: string;
  guestName: string;
  guestPhone: string;
  attempts: number;
  failedAttempts: number;
  verified: boolean;
  searchesCount: number;
  viewsCount: number;
  downloadsCount: number;
  device?: {
    type?: string;
    os?: string;
    browser?: string;
  };
  lastSeenAt?: string;
  firstSeenAt?: string;
}

interface TimelineItem {
  time: string;
  views: number;
  searches: number;
  downloads: number;
}

interface ActivityItem {
  _id: string;
  type: string;
  metadata?: Record<string, any>;
  ip?: string;
  timestamp: string;
  guestAccessId?: {
    guestName?: string;
    guestPhone?: string;
    verified?: boolean;
  };
}

type TabType = "leads" | "funnel" | "traffic" | "monetization" | "activity";
type FilterType = "all" | "verified" | "failed" | "downloads" | "searches";

export default function GuestAnalyticsPage(): React.JSX.Element {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Route state fallbacks
  const routeState = (location.state as { eventName?: string; ownerId?: string; pin?: string } | null) || {};
  const [eventName, setEventName] = useState<string>(routeState.eventName || "Event");
  const [ownerId, setOwnerId] = useState<string>(routeState.ownerId || "");

  // Page data states
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [guests, setGuests] = useState<GuestItem[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  // UI control states
  const [activeTab, setActiveTab] = useState<TabType>("leads");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [activityFilter, setActivityFilter] = useState<string>("all");

  // Authentication & owner resolution
  useEffect(() => {
    const rawUser = localStorage.getItem("user");
    if (!rawUser) {
      navigate("/login");
      return;
    }
    try {
      const parsed = JSON.parse(rawUser);
      if (!ownerId && parsed._id) {
        setOwnerId(parsed._id);
      }
    } catch {
      navigate("/login");
    }
  }, [navigate, ownerId]);

  // Fetch event name fallback if not present in state
  useEffect(() => {
    if (!eventId) return;
    if (!routeState.eventName) {
      fetch(`${API_URL}/events/${eventId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.event_name) {
            setEventName(data.event_name);
          }
          if (data?.created_id && !ownerId) {
            setOwnerId(data.created_id);
          }
        })
        .catch(() => {
          // Keep default
        });
    }
  }, [eventId, routeState.eventName, ownerId]);

  // Primary analytics fetch
  const fetchData = useCallback(async () => {
    if (!eventId) return;
    try {
      const resolvedOwner = ownerId || (() => {
        try {
          return JSON.parse(localStorage.getItem("user") || "{}")._id || "";
        } catch {
          return "";
        }
      })();

      const authQuery = resolvedOwner ? `&created_id=${encodeURIComponent(resolvedOwner)}` : "";
      const authQueryFirst = resolvedOwner ? `?created_id=${encodeURIComponent(resolvedOwner)}` : "";
      const authHeaders: Record<string, string> = resolvedOwner ? { "x-created-id": resolvedOwner } : {};

      const [sumRes, guestsRes, timelineRes, actRes] = await Promise.all([
        fetch(`${API_URL}/api/analytics/event/${eventId}/summary${authQueryFirst}`, { headers: authHeaders }),
        fetch(`${API_URL}/api/analytics/event/${eventId}/guests?limit=100${authQuery}`, { headers: authHeaders }),
        fetch(`${API_URL}/api/analytics/event/${eventId}/timeline${authQueryFirst}`, { headers: authHeaders }),
        fetch(`${API_URL}/api/analytics/event/${eventId}/activity${authQueryFirst}`, { headers: authHeaders }),
      ]);

      if (sumRes.ok) {
        const data = await sumRes.json();
        setSummary(data);
      }
      if (guestsRes.ok) {
        const data = await guestsRes.json();
        setGuests(data.guests || []);
      }
      if (timelineRes.ok) {
        const data = await timelineRes.json();
        setTimeline(data || []);
      }
      if (actRes.ok) {
        const data = await actRes.json();
        setActivities(data || []);
      }
      setLastRefreshedAt(new Date());
    } catch {
      // Graceful error fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId, ownerId]);

  useEffect(() => {
    setLoading(true);
    void fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    void fetchData();
  };

  // Filtered guest list
  const filteredGuests = useMemo(() => {
    return guests.filter((g) => {
      const query = searchQuery.trim().toLowerCase();
      const matchSearch =
        !query ||
        (g.guestName && g.guestName.toLowerCase().includes(query)) ||
        (g.guestPhone && g.guestPhone.includes(query)) ||
        (g.device?.os && g.device.os.toLowerCase().includes(query)) ||
        (g.device?.browser && g.device.browser.toLowerCase().includes(query));

      if (!matchSearch) return false;
      if (filterType === "verified") return g.verified;
      if (filterType === "failed") return !g.verified;
      if (filterType === "downloads") return (g.downloadsCount || 0) > 0;
      if (filterType === "searches") return (g.searchesCount || 0) > 0;
      return true;
    });
  }, [guests, searchQuery, filterType]);

  // Filtered live activities
  const filteredActivities = useMemo(() => {
    if (activityFilter === "all") return activities;
    return activities.filter((a) => a.type === activityFilter);
  }, [activities, activityFilter]);

  // Device breakdown
  const deviceStats = useMemo(() => {
    let mobile = 0;
    let desktop = 0;
    let tablet = 0;
    for (const g of guests) {
      const t = g.device?.type?.toLowerCase();
      if (t === "mobile") mobile++;
      else if (t === "tablet") tablet++;
      else desktop++;
    }
    const total = guests.length || 1;
    return {
      mobile,
      desktop,
      tablet,
      mobilePct: Math.round((mobile / total) * 100),
      desktopPct: Math.round((desktop / total) * 100),
      tabletPct: Math.round((tablet / total) * 100),
    };
  }, [guests]);

  // Peak activity computation
  const peakActivity = useMemo(() => {
    if (!timeline || timeline.length === 0) return null;
    let maxHour = timeline[0];
    let maxTotal = (maxHour.views || 0) + (maxHour.searches || 0) + (maxHour.downloads || 0);

    for (const item of timeline) {
      const total = (item.views || 0) + (item.searches || 0) + (item.downloads || 0);
      if (total > maxTotal) {
        maxTotal = total;
        maxHour = item;
      }
    }
    return maxTotal > 0 ? { hour: maxHour.time, volume: maxTotal } : null;
  }, [timeline]);

  // Engagement rating
  const engagementRating = useMemo(() => {
    const rate = summary?.downloadConversionRate || 0;
    if (rate >= 60) return { label: "Exceptional Engagement", color: "text-emerald-500", badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
    if (rate >= 35) return { label: "Strong Engagement", color: "text-blue-500", badge: "bg-blue-500/10 text-blue-600 border-blue-500/20" };
    if (rate >= 15) return { label: "Moderate Engagement", color: "text-amber-500", badge: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
    return { label: "Initial Discovery", color: "text-muted-foreground", badge: "bg-muted text-muted-foreground border-border" };
  }, [summary]);

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + ", " + d.toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  const getCleanPhone = (phone: string) => phone.replace(/[^0-9]/g, "");

  const resolvedOwner = ownerId || (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}")._id || "";
    } catch {
      return "";
    }
  })();

  const csvExportUrl = `${API_URL}/api/analytics/event/${eventId}/export-csv?created_id=${encodeURIComponent(resolvedOwner)}`;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />

      <main className="flex-1 container mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 pb-24 md:pb-12 space-y-6">
        {/* Navigation Breadcrumbs & Back Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Link to="/dashboard" className="hover:text-foreground transition-colors flex items-center gap-1">
              Dashboard
            </Link>
            <ChevronRight className="h-4 w-4" />
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="hover:text-foreground transition-colors truncate max-w-[200px]"
            >
              {eventName}
            </button>
            <ChevronRight className="h-4 w-4" />
            <span className="font-semibold text-foreground">Guest Analytics</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="min-h-[44px] flex items-center gap-1.5 text-xs sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Event
          </Button>
        </div>

        {/* Header Block: Title, Badges & Top Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl border border-border bg-card shadow-sm">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border border-primary/20 bg-primary/10 text-primary">
                <BarChart3 className="size-3.5" />
                Comprehensive Guest Intelligence
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Telemetry Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {eventName} — Guest Analytics
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Real-time attendee ledger, facial search conversion funnel, and high-resolution photo download metrics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="min-h-[44px] flex items-center gap-2 text-xs sm:text-sm"
              title="Refresh telemetry"
            >
              <RefreshCw className={cn("h-4 w-4", (refreshing || loading) && "animate-spin")} />
              {refreshing ? "Updating…" : "Refresh"}
            </Button>

            <a href={csvExportUrl} download target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="default" className="min-h-[44px] flex items-center gap-2 text-xs sm:text-sm">
                <FileSpreadsheet className="h-4 w-4 text-emerald-300" />
                Export CSV Leads
              </Button>
            </a>
          </div>
        </div>

        {/* Last Refreshed & Health Summary Pill */}
        {lastRefreshedAt && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground px-1">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              <span>Last synchronized: {lastRefreshedAt.toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("px-2 py-0.5 rounded-md border font-medium text-xs", engagementRating.badge)}>
                {engagementRating.label}
              </span>
              {peakActivity && (
                <span className="hidden sm:inline-flex items-center gap-1 text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  Peak hour: {peakActivity.hour} ({peakActivity.volume} actions)
                </span>
              )}
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground border border-dashed rounded-2xl bg-card">
            <Loader2 className="h-9 w-9 animate-spin text-primary" />
            <p className="text-sm font-medium">Synthesizing comprehensive event intelligence…</p>
          </div>
        ) : (
          <>
            {/* Primary KPI Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Unique Visitors */}
              <Card className="hover:border-primary/40 transition-colors shadow-sm">
                <CardContent className="p-5 space-y-1.5">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-semibold uppercase tracking-wider">Total Visitors</span>
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Users className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold tracking-tight text-foreground">
                    {summary?.totalVisitors || 0}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                    <span>{summary?.uniqueGuests || 0} total leads</span>
                    <span className="font-semibold text-emerald-600">{summary?.verifiedGuests || 0} verified</span>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Security & PIN Attempts */}
              <Card className="hover:border-amber-500/40 transition-colors shadow-sm">
                <CardContent className="p-5 space-y-1.5">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-semibold uppercase tracking-wider">Access Security</span>
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                      <KeyRound className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold tracking-tight text-foreground">
                    {summary?.totalAttempts || 0}
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                    {(summary?.failedAttempts || 0) > 0 ? (
                      <span className="text-destructive font-medium flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {summary?.failedAttempts} failed attempts
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-medium flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        100% Correct PIN
                      </span>
                    )}
                    <span className="text-muted-foreground">
                      {summary?.totalAttempts
                        ? Math.round((((summary.totalAttempts - (summary.failedAttempts || 0)) / summary.totalAttempts) * 100))
                        : 100}
                      % Pass
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: AI Face Searches */}
              <Card className="hover:border-indigo-500/40 transition-colors shadow-sm">
                <CardContent className="p-5 space-y-1.5">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-semibold uppercase tracking-wider">AI Face Searches</span>
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                      <ScanFace className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold tracking-tight text-foreground">
                    {summary?.totalSearches || 0}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                    <span className="font-semibold text-indigo-600">{summary?.searchSuccessRate || 0}% Match Rate</span>
                    <span>Selfie checks</span>
                  </div>
                </CardContent>
              </Card>

              {/* Card 4: Downloads & Conversion */}
              <Card className="hover:border-emerald-500/40 transition-colors shadow-sm">
                <CardContent className="p-5 space-y-1.5">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-semibold uppercase tracking-wider">Photo Downloads</span>
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                      <Download className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold tracking-tight text-foreground">
                    {summary?.totalDownloads || 0}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                    <span>{summary?.uniquePhotosDownloaded || 0} unique photos</span>
                    <span className="font-semibold text-emerald-600">{summary?.downloadConversionRate || 0}% Conversion</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Conversion Funnel Bar */}
            <div className="p-5 sm:p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Attendee Engagement Funnel
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Tracking guest progression from gallery landing to PIN verification, selfie match, and photo download.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit text-xs">
                  End-to-End Conversion: {summary?.downloadConversionRate || 0}%
                </Badge>
              </div>

              {/* 4-Step Funnel Visual */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                {/* Step 1: Visitors */}
                <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-1 relative">
                  <div className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
                    <span>1. Landed</span>
                    <span className="font-mono text-[11px] text-primary">100%</span>
                  </div>
                  <div className="text-xl font-bold text-foreground">{summary?.totalVisitors || 0}</div>
                  <p className="text-[11px] text-muted-foreground">Unique attendees</p>
                </div>

                {/* Step 2: PIN Verification */}
                <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-1 relative">
                  <div className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
                    <span>2. Verified</span>
                    <span className="font-mono text-[11px] text-emerald-600">
                      {summary?.totalVisitors
                        ? Math.round(((summary.verifiedGuests || 0) / summary.totalVisitors) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="text-xl font-bold text-foreground">{summary?.verifiedGuests || 0}</div>
                  <p className="text-[11px] text-muted-foreground">Correct PIN entered</p>
                </div>

                {/* Step 3: Selfie Searches */}
                <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-1 relative">
                  <div className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
                    <span>3. Face Searched</span>
                    <span className="font-mono text-[11px] text-indigo-600">
                      {summary?.totalSearches || 0}
                    </span>
                  </div>
                  <div className="text-xl font-bold text-foreground">{summary?.searchSuccessRate || 0}%</div>
                  <p className="text-[11px] text-muted-foreground">Match success rate</p>
                </div>

                {/* Step 4: Downloads */}
                <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-1 relative">
                  <div className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
                    <span>4. Converted</span>
                    <span className="font-mono text-[11px] text-emerald-600">
                      {summary?.downloadConversionRate || 0}%
                    </span>
                  </div>
                  <div className="text-xl font-bold text-foreground">{summary?.totalDownloads || 0}</div>
                  <p className="text-[11px] text-muted-foreground">Photos saved by guests</p>
                </div>
              </div>
            </div>

            {/* Tab Navigation Navigation Bar */}
            <div className="flex items-center gap-1.5 border-b border-border overflow-x-auto scrollbar-hide py-1">
              <button
                type="button"
                onClick={() => setActiveTab("leads")}
                className={cn(
                  "min-h-[44px] px-4 py-2 rounded-lg font-medium text-xs sm:text-sm flex items-center gap-2 transition-all shrink-0",
                  activeTab === "leads"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Users className="h-4 w-4" />
                Guest Leads Directory ({guests.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("traffic")}
                className={cn(
                  "min-h-[44px] px-4 py-2 rounded-lg font-medium text-xs sm:text-sm flex items-center gap-2 transition-all shrink-0",
                  activeTab === "traffic"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Smartphone className="h-4 w-4" />
                Audience & Devices
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("monetization")}
                className={cn(
                  "min-h-[44px] px-4 py-2 rounded-lg font-medium text-xs sm:text-sm flex items-center gap-2 transition-all shrink-0",
                  activeTab === "monetization"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Coins className="h-4 w-4" />
                Monetization & Paywall
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("activity")}
                className={cn(
                  "min-h-[44px] px-4 py-2 rounded-lg font-medium text-xs sm:text-sm flex items-center gap-2 transition-all shrink-0",
                  activeTab === "activity"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Activity className="h-4 w-4" />
                Live Audit Stream ({activities.length})
              </button>
            </div>

            {/* TAB CONTENT 1: GUEST LEADS DIRECTORY */}
            {activeTab === "leads" && (
              <div className="space-y-4">
                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, phone, device, or browser…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 min-h-[44px] text-sm"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      type="button"
                      variant={filterType === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterType("all")}
                      className="min-h-[40px] text-xs"
                    >
                      All ({guests.length})
                    </Button>
                    <Button
                      type="button"
                      variant={filterType === "verified" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterType("verified")}
                      className="min-h-[40px] text-xs"
                    >
                      Verified ({guests.filter((g) => g.verified).length})
                    </Button>
                    <Button
                      type="button"
                      variant={filterType === "failed" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterType("failed")}
                      className="min-h-[40px] text-xs text-destructive"
                    >
                      Failed PIN ({guests.filter((g) => !g.verified).length})
                    </Button>
                    <Button
                      type="button"
                      variant={filterType === "downloads" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterType("downloads")}
                      className="min-h-[40px] text-xs"
                    >
                      Downloaded ({guests.filter((g) => (g.downloadsCount || 0) > 0).length})
                    </Button>
                  </div>
                </div>

                {/* Table or Empty State */}
                {filteredGuests.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border p-12 text-center space-y-3 bg-card">
                    <Users className="h-10 w-10 mx-auto text-muted-foreground/60" />
                    <h3 className="font-semibold text-lg text-foreground">No guest leads found</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                      {searchQuery
                        ? "No guests matched your current search filters. Try clearing the query."
                        : "Guests will automatically populate here as they access the gallery via the QR standee or event link."}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-muted/70 text-muted-foreground text-xs uppercase tracking-wider border-b border-border">
                          <tr>
                            <th className="px-4 py-3.5 font-semibold">Guest Lead</th>
                            <th className="px-4 py-3.5 font-semibold">Verification</th>
                            <th className="px-4 py-3.5 font-semibold text-center">PIN Attempts</th>
                            <th className="px-4 py-3.5 font-semibold text-center">Face Searches</th>
                            <th className="px-4 py-3.5 font-semibold text-center">Downloads</th>
                            <th className="px-4 py-3.5 font-semibold">Device &amp; OS</th>
                            <th className="px-4 py-3.5 font-semibold">Last Active</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredGuests.map((g) => {
                            const cleanPhone = getCleanPhone(g.guestPhone);
                            const waLink = cleanPhone ? `https://wa.me/${cleanPhone}` : null;
                            const initials = (g.guestName || "Guest").slice(0, 2).toUpperCase();

                            return (
                              <tr key={g._id} className="hover:bg-muted/30 transition-colors">
                                {/* Guest Lead */}
                                <td className="px-4 py-3.5">
                                  <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                      {initials}
                                    </div>
                                    <div>
                                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                                        {g.guestName || "Anonymous Guest"}
                                      </div>
                                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                        <span>{g.guestPhone || "No phone logged"}</span>
                                        {waLink && (
                                          <a
                                            href={waLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-emerald-500 hover:text-emerald-400 inline-flex items-center"
                                            title="Chat with guest on WhatsApp"
                                          >
                                            <MessageCircle className="h-3.5 w-3.5" />
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* Verification */}
                                <td className="px-4 py-3.5">
                                  {g.verified ? (
                                    <Badge variant="success" className="gap-1 text-xs font-normal">
                                      <CheckCircle2 className="h-3 w-3" /> Verified
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive" className="gap-1 text-xs font-normal">
                                      <XCircle className="h-3 w-3" /> Failed PIN
                                    </Badge>
                                  )}
                                </td>

                                {/* Attempts */}
                                <td className="px-4 py-3.5 text-center">
                                  <span className="font-semibold text-foreground">{g.attempts || 0}</span>
                                  {g.failedAttempts > 0 && (
                                    <span className="text-[11px] text-destructive block">
                                      ({g.failedAttempts} failed)
                                    </span>
                                  )}
                                </td>

                                {/* Searches */}
                                <td className="px-4 py-3.5 text-center">
                                  <span className="font-semibold text-foreground">{g.searchesCount || 0}</span>
                                </td>

                                {/* Downloads */}
                                <td className="px-4 py-3.5 text-center">
                                  <span
                                    className={cn(
                                      "font-semibold",
                                      (g.downloadsCount || 0) > 0 ? "text-emerald-600" : "text-muted-foreground"
                                    )}
                                  >
                                    {g.downloadsCount || 0}
                                  </span>
                                </td>

                                {/* Device */}
                                <td className="px-4 py-3.5 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                                    {g.device?.type === "mobile" ? (
                                      <Smartphone className="h-3.5 w-3.5 text-primary" />
                                    ) : g.device?.type === "tablet" ? (
                                      <Tablet className="h-3.5 w-3.5 text-amber-500" />
                                    ) : (
                                      <Laptop className="h-3.5 w-3.5 text-indigo-500" />
                                    )}
                                    <span className="capitalize">{g.device?.type || "Desktop"}</span>
                                  </div>
                                  <span className="text-[11px] text-muted-foreground">
                                    {g.device?.os || "Unknown OS"} · {g.device?.browser || "Browser"}
                                  </span>
                                </td>

                                {/* Last Active */}
                                <td className="px-4 py-3.5 text-xs text-muted-foreground">
                                  {formatTimestamp(g.lastSeenAt)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 2: TRAFFIC, TIMELINE & DEVICE DISTRIBUTION */}
            {activeTab === "traffic" && (
              <div className="space-y-6">
                {/* Device Breakdown Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-border p-5 bg-card flex items-center gap-4 shadow-sm">
                    <div className="p-3.5 rounded-xl bg-primary/10 text-primary">
                      <Smartphone className="h-7 w-7" />
                    </div>
                    <div className="space-y-0.5 flex-1">
                      <span className="text-xs text-muted-foreground uppercase font-semibold">Mobile Guests</span>
                      <div className="text-2xl font-bold text-foreground">{deviceStats.mobilePct}%</div>
                      <p className="text-xs text-muted-foreground">{deviceStats.mobile} total sessions</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border p-5 bg-card flex items-center gap-4 shadow-sm">
                    <div className="p-3.5 rounded-xl bg-indigo-500/10 text-indigo-500">
                      <Laptop className="h-7 w-7" />
                    </div>
                    <div className="space-y-0.5 flex-1">
                      <span className="text-xs text-muted-foreground uppercase font-semibold">Desktop Visitors</span>
                      <div className="text-2xl font-bold text-foreground">{deviceStats.desktopPct}%</div>
                      <p className="text-xs text-muted-foreground">{deviceStats.desktop} total sessions</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border p-5 bg-card flex items-center gap-4 shadow-sm">
                    <div className="p-3.5 rounded-xl bg-amber-500/10 text-amber-500">
                      <Tablet className="h-7 w-7" />
                    </div>
                    <div className="space-y-0.5 flex-1">
                      <span className="text-xs text-muted-foreground uppercase font-semibold">Tablet Viewers</span>
                      <div className="text-2xl font-bold text-foreground">{deviceStats.tabletPct}%</div>
                      <p className="text-xs text-muted-foreground">{deviceStats.tablet} total sessions</p>
                    </div>
                  </div>
                </div>

                {/* Hourly Activity Volume Timeline */}
                <div className="rounded-2xl border border-border p-5 sm:p-6 bg-card shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Traffic &amp; Activity Timeline</h3>
                      <p className="text-xs text-muted-foreground">
                        Hourly distribution of gallery page views, AI facial searches, and photo downloads.
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-medium">
                      <span className="flex items-center gap-1 text-sky-500">
                        <span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> Page Views
                      </span>
                      <span className="flex items-center gap-1 text-indigo-500">
                        <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" /> Face Searches
                      </span>
                      <span className="flex items-center gap-1 text-emerald-500">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Downloads
                      </span>
                    </div>
                  </div>

                  {timeline.length === 0 ? (
                    <div className="py-16 text-center text-xs sm:text-sm text-muted-foreground border border-dashed rounded-xl">
                      No traffic data recorded for this event yet.
                    </div>
                  ) : (
                    <div className="space-y-3 pt-2">
                      {timeline.slice(-16).map((item, idx) => {
                        const total = (item.views || 0) + (item.searches || 0) + (item.downloads || 0) || 1;
                        const vPct = Math.round(((item.views || 0) / total) * 100);
                        const sPct = Math.round(((item.searches || 0) / total) * 100);
                        const dPct = Math.round(((item.downloads || 0) / total) * 100);

                        return (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex justify-between text-xs text-muted-foreground font-mono">
                              <span className="font-semibold text-foreground">{item.time}</span>
                              <span>
                                {item.views} views · {item.searches} searches · {item.downloads} downloads
                              </span>
                            </div>
                            <div className="h-3.5 w-full rounded-full bg-muted overflow-hidden flex">
                              {item.views > 0 && (
                                <div
                                  style={{ width: `${vPct}%` }}
                                  className="h-full bg-sky-500 transition-all"
                                  title={`Views: ${item.views}`}
                                />
                              )}
                              {item.searches > 0 && (
                                <div
                                  style={{ width: `${sPct}%` }}
                                  className="h-full bg-indigo-500 transition-all"
                                  title={`Searches: ${item.searches}`}
                                />
                              )}
                              {item.downloads > 0 && (
                                <div
                                  style={{ width: `${dPct}%` }}
                                  className="h-full bg-emerald-500 transition-all"
                                  title={`Downloads: ${item.downloads}`}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: MONETIZATION & PAYWALL PERFORMANCE */}
            {activeTab === "monetization" && (
              <div className="space-y-6">
                {/* Monetization KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="rounded-2xl border border-border bg-card p-5 space-y-1.5 shadow-sm">
                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-amber-500" /> Total Revenue
                    </span>
                    <div className="text-3xl font-bold tracking-tight text-foreground">
                      {summary?.paywall?.currency === "USD"
                        ? "$"
                        : summary?.paywall?.currency === "EUR"
                        ? "€"
                        : summary?.paywall?.currency === "GBP"
                        ? "£"
                        : "₹"}
                      {summary?.paywall?.totalRevenue ?? 0}
                    </div>
                    <p className="text-[11px] text-muted-foreground">Direct guest album purchases</p>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-5 space-y-1.5 shadow-sm">
                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-blue-500" /> Album Unlocks
                    </span>
                    <div className="text-3xl font-bold tracking-tight text-foreground">
                      {summary?.paywall?.unlockedCount ?? 0}
                    </div>
                    <p className="text-[11px] text-muted-foreground">Successful guest transactions</p>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-5 space-y-1.5 shadow-sm">
                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-500" /> Active Stage
                    </span>
                    <div className="text-xl font-bold tracking-tight text-foreground capitalize truncate">
                      {(summary?.paywall?.stage || "download").replace("_", " ")}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {summary?.paywall?.enabled ? "Gating active" : "Paywall free/disabled"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-5 space-y-1.5 shadow-sm">
                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-emerald-500" /> Unlock Rate
                    </span>
                    <div className="text-3xl font-bold tracking-tight text-foreground">
                      {summary?.totalSearches
                        ? Math.min(
                            100,
                            Math.round(((summary.paywall?.unlockedCount || 0) / summary.totalSearches) * 100)
                          )
                        : 0}
                      %
                    </div>
                    <p className="text-[11px] text-muted-foreground">Of selfie searching guests</p>
                  </div>
                </div>

                {/* Pricing Rules & Setup */}
                <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
                    <div>
                      <h4 className="font-semibold text-base text-foreground">Paywall Configuration</h4>
                      <p className="text-xs text-muted-foreground">
                        Pricing tiers and gating rules applied to this event's guest downloads.
                      </p>
                    </div>
                    <Badge variant={summary?.paywall?.enabled ? "brand" : "secondary"}>
                      {summary?.paywall?.enabled ? "Paywall Active" : "Disabled (Free Gallery)"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5 p-4 rounded-xl bg-muted/30 border border-border">
                      <span className="text-xs text-muted-foreground font-medium">Single Photo Price</span>
                      <div className="text-lg font-bold text-foreground">
                        {summary?.paywall?.currency ?? "INR"} {summary?.paywall?.pricePerPhoto ?? 49}
                      </div>
                    </div>

                    <div className="space-y-1.5 p-4 rounded-xl bg-muted/30 border border-border">
                      <span className="text-xs text-muted-foreground font-medium">Full Album Bundle</span>
                      <div className="text-lg font-bold text-foreground">
                        {summary?.paywall?.currency ?? "INR"} {summary?.paywall?.priceFullAlbum ?? 199}
                      </div>
                    </div>

                    <div className="space-y-1.5 p-4 rounded-xl bg-muted/30 border border-border">
                      <span className="text-xs text-muted-foreground font-medium">Free Photo Allowance</span>
                      <div className="text-lg font-bold text-foreground">
                        {summary?.paywall?.stage === "batch_download"
                          ? `${summary?.paywall?.freePhotoLimit ?? 2} free photos`
                          : "Full gallery gating"}
                      </div>
                    </div>
                  </div>

                  {summary?.paywall?.customMessage && (
                    <div className="text-xs sm:text-sm space-y-1 bg-muted/20 p-4 rounded-xl border border-border/50">
                      <span className="font-semibold text-foreground">Custom Guest Message:</span>
                      <p className="text-muted-foreground italic">"{summary.paywall.customMessage}"</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT 4: REAL-TIME AUDIT STREAM */}
            {activeTab === "activity" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    Chronological audit trail of the last 50 guest interactions logged on this event.
                  </span>

                  {/* Filter chips */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      type="button"
                      variant={activityFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActivityFilter("all")}
                      className="h-8 text-xs"
                    >
                      All ({activities.length})
                    </Button>
                    <Button
                      type="button"
                      variant={activityFilter === "photo_download" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActivityFilter("photo_download")}
                      className="h-8 text-xs"
                    >
                      Downloads
                    </Button>
                    <Button
                      type="button"
                      variant={activityFilter === "selfie_search" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActivityFilter("selfie_search")}
                      className="h-8 text-xs"
                    >
                      Selfie Searches
                    </Button>
                    <Button
                      type="button"
                      variant={activityFilter === "pin_attempt" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActivityFilter("pin_attempt")}
                      className="h-8 text-xs"
                    >
                      PIN Entries
                    </Button>
                  </div>
                </div>

                {filteredActivities.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border p-12 text-center text-xs sm:text-sm text-muted-foreground bg-card">
                    No activity records found for this filter.
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border divide-y divide-border bg-card shadow-sm overflow-hidden">
                    {filteredActivities.map((act) => {
                      const guestName = act.guestAccessId?.guestName || act.metadata?.name || "Guest";
                      const guestPhone = act.guestAccessId?.guestPhone || act.metadata?.phone || "";

                      return (
                        <div key={act._id} className="p-4 flex items-start gap-3.5 hover:bg-muted/20 transition-colors">
                          <div className="mt-0.5">
                            {act.type === "photo_download" ? (
                              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                                <Download className="h-4 w-4" />
                              </div>
                            ) : act.type === "selfie_search" ? (
                              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                                <ScanFace className="h-4 w-4" />
                              </div>
                            ) : act.type === "pin_success" ? (
                              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                                <CheckCircle2 className="h-4 w-4" />
                              </div>
                            ) : act.type === "pin_failure" ? (
                              <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
                                <XCircle className="h-4 w-4" />
                              </div>
                            ) : (
                              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-500">
                                <Eye className="h-4 w-4" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 space-y-0.5 text-xs sm:text-sm">
                            <div className="flex flex-wrap items-center justify-between gap-1">
                              <span className="font-semibold text-foreground">
                                {guestName} {guestPhone ? `(${guestPhone})` : ""}
                              </span>
                              <span className="text-[11px] text-muted-foreground font-mono">
                                {formatTimestamp(act.timestamp)}
                              </span>
                            </div>

                            <p className="text-xs text-muted-foreground">
                              {act.type === "photo_download" && `Downloaded photo "${act.metadata?.photoName || "Photo"}"`}
                              {act.type === "selfie_search" &&
                                `Performed AI facial search (${act.metadata?.matchCount || 0} faces matched)`}
                              {act.type === "pin_success" && "Entered correct PIN"}
                              {act.type === "pin_failure" && "Entered incorrect PIN"}
                              {act.type === "page_view" && "Viewed event landing page"}
                              {act.type === "whatsapp_send_matched" && "Dispatched matched photos to WhatsApp"}
                            </p>

                            {act.ip && (
                              <div className="text-[10px] text-muted-foreground/80 font-mono">
                                IP: {act.ip}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
