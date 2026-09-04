import React, { useEffect, useState, useMemo } from "react";
import { API_URL } from "../../utils/api";
import { ResponsiveModal } from "../../components/ui/responsive-modal";
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

interface EventAnalyticsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventName: string;
}

export const EventAnalyticsModal: React.FC<EventAnalyticsModalProps> = ({
  open,
  onOpenChange,
  eventId,
  eventName,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [guests, setGuests] = useState<GuestItem[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activeTab, setActiveTab] = useState<"leads" | "timeline" | "activity">("leads");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "verified" | "failed">("all");

  const fetchData = async () => {
    if (!eventId) return;
    try {
      const [sumRes, guestsRes, timelineRes, actRes] = await Promise.all([
        fetch(`${API_URL}/api/analytics/event/${eventId}/summary`),
        fetch(`${API_URL}/api/analytics/event/${eventId}/guests?limit=200`),
        fetch(`${API_URL}/api/analytics/event/${eventId}/timeline`),
        fetch(`${API_URL}/api/analytics/event/${eventId}/activity`),
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
    } catch {
      // Graceful error handle
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (open && eventId) {
      setLoading(true);
      void fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, eventId]);

  const handleRefresh = () => {
    setRefreshing(true);
    void fetchData();
  };

  const filteredGuests = useMemo(() => {
    return guests.filter((g) => {
      const matchSearch =
        !searchQuery.trim() ||
        (g.guestName && g.guestName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (g.guestPhone && g.guestPhone.includes(searchQuery.trim()));

      if (!matchSearch) return false;
      if (statusFilter === "verified") return g.verified;
      if (statusFilter === "failed") return !g.verified;
      return true;
    });
  }, [guests, searchQuery, statusFilter]);

  // Device Breakdown statistics computed from loaded guests
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

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + ", " + d.toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  const getCleanPhone = (phone: string) => {
    return phone.replace(/[^0-9]/g, "");
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      className="sm:max-w-4xl max-h-[90vh] overflow-y-auto"
      title={`Event Analytics — ${eventName}`}
      description="Live guest attendance ledger, PIN verification logs, and photo download engagement."
    >
      <div className="space-y-6 pt-2 pb-6">
        {/* Top Header Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="min-h-[40px] flex items-center gap-1.5"
            >
              <RefreshCw className={cn("h-4 w-4", (refreshing || loading) && "animate-spin")} />
              {refreshing ? "Refreshing…" : "Refresh"}
            </Button>
            <a
              href={`${API_URL}/api/analytics/event/${eventId}/export-csv`}
              download
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="sm" variant="secondary" className="min-h-[40px] flex items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                Export CSV Leads
              </Button>
            </a>
          </div>

          {/* Sub-Tabs */}
          <div className="flex items-center rounded-lg bg-muted p-1 border border-border text-sm">
            <button
              type="button"
              onClick={() => setActiveTab("leads")}
              className={cn(
                "px-3 py-1.5 rounded-md font-medium transition-colors text-xs sm:text-sm",
                activeTab === "leads" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Guest Leads ({guests.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("timeline")}
              className={cn(
                "px-3 py-1.5 rounded-md font-medium transition-colors text-xs sm:text-sm",
                activeTab === "timeline" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Traffic & Devices
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("activity")}
              className={cn(
                "px-3 py-1.5 rounded-md font-medium transition-colors text-xs sm:text-sm",
                activeTab === "activity" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Live Feed
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">Loading event metrics…</p>
          </div>
        ) : (
          <>
            {/* 4 KPI Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-4 space-y-1">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-semibold uppercase tracking-wider">Total Visitors</span>
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {summary?.totalVisitors || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {summary?.uniqueGuests || 0} registered leads ({summary?.verifiedGuests || 0} verified)
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-1">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-semibold uppercase tracking-wider">Access Attempts</span>
                    <KeyRound className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {summary?.totalAttempts || 0}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    {(summary?.failedAttempts || 0) > 0 ? (
                      <span className="text-destructive font-medium flex items-center gap-0.5">
                        <AlertTriangle className="h-3 w-3" />
                        {summary?.failedAttempts} failed attempts
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-medium">100% correct PIN</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-1">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-semibold uppercase tracking-wider">Downloads</span>
                    <Download className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {summary?.totalDownloads || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {summary?.uniquePhotosDownloaded || 0} unique ({summary?.downloadConversionRate || 0}% rate)
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-1">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-semibold uppercase tracking-wider">Face Searches</span>
                    <ScanFace className="h-4 w-4 text-indigo-500" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {summary?.totalSearches || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {summary?.searchSuccessRate || 0}% found matching faces
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* TAB 1: GUEST LEADS LEDGER */}
            {activeTab === "leads" && (
              <div className="space-y-4">
                {/* Search & Status Filters */}
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search guest by name or mobile…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-10"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant={statusFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("all")}
                      className="h-9 text-xs"
                    >
                      All ({guests.length})
                    </Button>
                    <Button
                      type="button"
                      variant={statusFilter === "verified" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("verified")}
                      className="h-9 text-xs"
                    >
                      Verified ({guests.filter((g) => g.verified).length})
                    </Button>
                    <Button
                      type="button"
                      variant={statusFilter === "failed" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("failed")}
                      className="h-9 text-xs text-destructive"
                    >
                      Failed PIN ({guests.filter((g) => !g.verified).length})
                    </Button>
                  </div>
                </div>

                {/* Ledger Table */}
                {filteredGuests.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-10 text-center space-y-2">
                    <Users className="h-8 w-8 mx-auto text-muted-foreground" />
                    <h3 className="font-semibold text-foreground">No guest leads found</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      {searchQuery
                        ? "Try clearing your search keyword."
                        : "Guests will automatically appear here once they access the gallery link with their PIN."}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-muted text-muted-foreground text-xs uppercase tracking-wider border-b border-border">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Guest Lead</th>
                            <th className="px-4 py-3 font-semibold">Verification</th>
                            <th className="px-4 py-3 font-semibold">Attempts</th>
                            <th className="px-4 py-3 font-semibold">Searches</th>
                            <th className="px-4 py-3 font-semibold">Downloads</th>
                            <th className="px-4 py-3 font-semibold">Device</th>
                            <th className="px-4 py-3 font-semibold">Last Seen</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredGuests.map((g) => {
                            const cleanPhone = getCleanPhone(g.guestPhone);
                            const hasWarnings = (g.failedAttempts || 0) >= 3;

                            return (
                              <tr key={g._id} className="hover:bg-muted/50 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="font-medium text-foreground">{g.guestName || "Anonymous"}</div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                    <span>{g.guestPhone}</span>
                                    {cleanPhone && (
                                      <a
                                        href={`https://wa.me/${cleanPhone}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-0.5"
                                        title="Chat on WhatsApp"
                                      >
                                        <MessageCircle className="h-3 w-3" />
                                        WhatsApp
                                      </a>
                                    )}
                                  </div>
                                </td>

                                <td className="px-4 py-3">
                                  {g.verified ? (
                                    <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/10 gap-1 font-medium">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Verified
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive" className="gap-1 font-medium">
                                      <XCircle className="h-3 w-3" />
                                      Incorrect PIN
                                    </Badge>
                                  )}
                                </td>

                                <td className="px-4 py-3 font-mono text-xs">
                                  <div className="flex items-center gap-1.5">
                                    <span>{g.attempts || 1} total</span>
                                    {hasWarnings && (
                                      <Badge variant="destructive" className="text-[10px] px-1 py-0 gap-0.5">
                                        <AlertTriangle className="h-2.5 w-2.5" />
                                        {g.failedAttempts} fails
                                      </Badge>
                                    )}
                                    {!hasWarnings && (g.failedAttempts || 0) > 0 && (
                                      <span className="text-destructive font-semibold">({g.failedAttempts} fail)</span>
                                    )}
                                  </div>
                                </td>

                                <td className="px-4 py-3 font-mono text-xs">
                                  {g.searchesCount || 0}
                                </td>

                                <td className="px-4 py-3 font-mono text-xs">
                                  <span className={cn(g.downloadsCount > 0 ? "font-bold text-emerald-600" : "text-muted-foreground")}>
                                    {g.downloadsCount || 0}
                                  </span>
                                </td>

                                <td className="px-4 py-3 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    {g.device?.type === "mobile" ? (
                                      <Smartphone className="h-3.5 w-3.5 text-primary" />
                                    ) : g.device?.type === "tablet" ? (
                                      <Tablet className="h-3.5 w-3.5 text-amber-500" />
                                    ) : (
                                      <Laptop className="h-3.5 w-3.5 text-muted-foreground" />
                                    )}
                                    <span>{g.device?.os || "Unknown"} · {g.device?.browser || "Web"}</span>
                                  </div>
                                </td>

                                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                  {formatTime(g.lastSeenAt || g.firstSeenAt)}
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

            {/* TAB 2: TIMELINE & DEVICE DISTRIBUTION */}
            {activeTab === "timeline" && (
              <div className="space-y-6">
                {/* Device Breakdown Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border p-4 bg-card flex flex-col items-center text-center">
                    <Smartphone className="h-6 w-6 text-primary mb-1" />
                    <div className="text-lg font-bold">{deviceStats.mobilePct}%</div>
                    <span className="text-xs text-muted-foreground">Mobile ({deviceStats.mobile})</span>
                  </div>
                  <div className="rounded-xl border border-border p-4 bg-card flex flex-col items-center text-center">
                    <Laptop className="h-6 w-6 text-indigo-500 mb-1" />
                    <div className="text-lg font-bold">{deviceStats.desktopPct}%</div>
                    <span className="text-xs text-muted-foreground">Desktop ({deviceStats.desktop})</span>
                  </div>
                  <div className="rounded-xl border border-border p-4 bg-card flex flex-col items-center text-center">
                    <Tablet className="h-6 w-6 text-amber-500 mb-1" />
                    <div className="text-lg font-bold">{deviceStats.tabletPct}%</div>
                    <span className="text-xs text-muted-foreground">Tablet ({deviceStats.tablet})</span>
                  </div>
                </div>

                {/* Timeline Chart */}
                <div className="rounded-xl border border-border p-4 sm:p-6 bg-card space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">Traffic & Activity Timeline</h3>
                      <p className="text-xs text-muted-foreground">Hourly volume of page views, searches, and downloads</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-medium">
                      <span className="flex items-center gap-1 text-sky-500">
                        <span className="h-2 w-2 rounded-full bg-sky-500" /> Views
                      </span>
                      <span className="flex items-center gap-1 text-indigo-500">
                        <span className="h-2 w-2 rounded-full bg-indigo-500" /> Searches
                      </span>
                      <span className="flex items-center gap-1 text-emerald-500">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" /> Downloads
                      </span>
                    </div>
                  </div>

                  {timeline.length === 0 ? (
                    <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                      No traffic data recorded in this period yet.
                    </div>
                  ) : (
                    <div className="space-y-2 pt-2">
                      {timeline.slice(-12).map((item, idx) => {
                        const total = (item.views || 0) + (item.searches || 0) + (item.downloads || 0) || 1;
                        const vPct = Math.round(((item.views || 0) / total) * 100);
                        const sPct = Math.round(((item.searches || 0) / total) * 100);
                        const dPct = Math.round(((item.downloads || 0) / total) * 100);

                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground font-mono">
                              <span>{item.time}</span>
                              <span>{item.views} views · {item.searches} search · {item.downloads} dl</span>
                            </div>
                            <div className="h-3 w-full rounded-full bg-muted overflow-hidden flex">
                              {item.views > 0 && (
                                <div style={{ width: `${vPct}%` }} className="h-full bg-sky-500" title={`Views: ${item.views}`} />
                              )}
                              {item.searches > 0 && (
                                <div style={{ width: `${sPct}%` }} className="h-full bg-indigo-500" title={`Searches: ${item.searches}`} />
                              )}
                              {item.downloads > 0 && (
                                <div style={{ width: `${dPct}%` }} className="h-full bg-emerald-500" title={`Downloads: ${item.downloads}`} />
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

            {/* TAB 3: REAL-TIME ACTIVITY FEED */}
            {activeTab === "activity" && (
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground flex items-center justify-between pb-1">
                  <span>Last 50 real-time actions logged for this event</span>
                  <span className="font-mono">{activities.length} events</span>
                </div>

                {activities.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                    No recent activity logged.
                  </div>
                ) : (
                  <div className="rounded-xl border border-border divide-y divide-border max-h-[420px] overflow-y-auto">
                    {activities.map((act) => {
                      const guestName = act.guestAccessId?.guestName || act.metadata?.name || "Guest";
                      const guestPhone = act.guestAccessId?.guestPhone || act.metadata?.phone || "";

                      return (
                        <div key={act._id} className="p-3.5 flex items-start gap-3 hover:bg-muted/40 transition-colors text-xs">
                          <div className="mt-0.5">
                            {act.type === "pin_success" ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : act.type === "pin_failure" ? (
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                            ) : act.type === "photo_download" ? (
                              <Download className="h-4 w-4 text-emerald-600" />
                            ) : act.type === "selfie_search" ? (
                              <ScanFace className="h-4 w-4 text-indigo-500" />
                            ) : act.type === "photo_view" ? (
                              <Eye className="h-4 w-4 text-sky-500" />
                            ) : (
                              <Activity className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>

                          <div className="flex-1 space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-foreground">
                                {guestName} {guestPhone && <span className="font-normal text-muted-foreground">({guestPhone})</span>}
                              </span>
                              <span className="text-muted-foreground text-[11px] font-mono">
                                {formatTime(act.timestamp)}
                              </span>
                            </div>

                            <p className="text-muted-foreground">
                              {act.type === "pin_success" && "Unlocked the album gallery successfully with PIN."}
                              {act.type === "pin_failure" && `Attempted incorrect PIN: "${act.metadata?.pinAttempted || "******"}"`}
                              {act.type === "selfie_search" && `Searched photos via face selfie — found ${act.metadata?.matchCount || 0} match(es) (${act.metadata?.latencyMs || 0}ms)`}
                              {act.type === "photo_download" && `Downloaded photo "${act.metadata?.photoName || "image.jpg"}"`}
                              {act.type === "photo_view" && `Previewed photo "${act.metadata?.photoName || "image.jpg"}"`}
                              {act.type === "retake_selfie" && "Retook selfie photo for matching"}
                              {act.type === "page_view" && "Visited the guest access portal"}
                            </p>
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
      </div>
    </ResponsiveModal>
  );
};

export default EventAnalyticsModal;
