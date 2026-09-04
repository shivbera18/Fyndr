import React, { useEffect, useState, useMemo } from "react";
import { API_URL } from "../../utils/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import {
  Calendar,
  Users,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Search,
  MessageCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  Smartphone,
  Laptop,
  Tablet,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { cn } from "../../lib/utils";

interface TopEventItem {
  eventId: string;
  eventName: string;
  guestsCount: number;
  verifiedCount: number;
  downloadsCount: number;
  searchesCount: number;
}

interface RecentLeadItem {
  _id: string;
  guestName: string;
  guestPhone: string;
  eventId: string;
  eventName: string;
  verified: boolean;
  attempts: number;
  failedAttempts: number;
  searchesCount: number;
  downloadsCount: number;
  device?: {
    type?: string;
    os?: string;
    browser?: string;
  };
  lastSeenAt?: string;
  firstSeenAt?: string;
}

interface StudioOverviewData {
  totalEvents: number;
  totalGuests: number;
  verifiedGuests: number;
  totalDownloads: number;
  topEvents: TopEventItem[];
  recentLeads: RecentLeadItem[];
}

interface StudioAnalyticsProps {
  userId: string;
}

export const StudioAnalytics: React.FC<StudioAnalyticsProps> = ({ userId }) => {
  const [data, setData] = useState<StudioOverviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "verified" | "failed">("all");

  const fetchOverview = async () => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_URL}/api/analytics/studio/overview?userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Graceful error handle
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (userId) {
      setLoading(true);
      void fetchOverview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleRefresh = () => {
    setRefreshing(true);
    void fetchOverview();
  };

  const filteredLeads = useMemo(() => {
    if (!data?.recentLeads) return [];
    return data.recentLeads.filter((lead) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        (lead.guestName && lead.guestName.toLowerCase().includes(q)) ||
        (lead.guestPhone && lead.guestPhone.includes(q)) ||
        (lead.eventName && lead.eventName.toLowerCase().includes(q));

      if (!matchQuery) return false;
      if (statusFilter === "verified") return lead.verified;
      if (statusFilter === "failed") return !lead.verified;
      return true;
    });
  }, [data?.recentLeads, searchQuery, statusFilter]);

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Loading studio analytics &amp; guest directory…</p>
      </div>
    );
  }

  const verifiedRate =
    data && data.totalGuests > 0 ? Math.round((data.verifiedGuests / data.totalGuests) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Studio Analytics Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Studio Intelligence
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-0.5">
            Studio Analytics &amp; Guest Leads
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Track visitor outreach, lead acquisition, and photo downloads across all your events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="min-h-[44px] flex items-center gap-1.5"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>

          <a
            href={`${API_URL}/api/analytics/studio/export-leads?userId=${encodeURIComponent(userId)}`}
            download
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="sm" variant="secondary" className="min-h-[44px] flex items-center gap-1.5">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              Export All Studio Leads
            </Button>
          </a>
        </div>
      </div>

      {/* 4 Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 space-y-1.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Events</span>
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-foreground">
              {data?.totalEvents || 0}
            </div>
            <p className="text-xs text-muted-foreground">Active event albums</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-1.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Guest Leads</span>
              <Users className="h-4 w-4 text-sky-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-foreground">
              {data?.totalGuests || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {data?.verifiedGuests || 0} verified ({verifiedRate}% success)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-1.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Downloads</span>
              <Download className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-foreground">
              {data?.totalDownloads || 0}
            </div>
            <p className="text-xs text-muted-foreground">High-res photos saved by guests</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-1.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Engagement</span>
              <TrendingUp className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-foreground">
              {data && data.totalGuests > 0 ? (data.totalDownloads / data.totalGuests).toFixed(1) : "0"}
            </div>
            <p className="text-xs text-muted-foreground">Avg. downloads per guest</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Events */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Top Active Events by Guest Attendance</CardTitle>
          <CardDescription>
            Albums with the highest guest logins, selfie searches, and photo downloads.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(!data?.topEvents || data.topEvents.length === 0) ? (
            <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
              No active events with guest interactions yet.
            </div>
          ) : (
            <div className="space-y-3">
              {data.topEvents.map((ev, idx) => {
                const maxGuests = data.topEvents[0]?.guestsCount || 1;
                const pct = Math.min(100, Math.round((ev.guestsCount / maxGuests) * 100));

                return (
                  <div key={ev.eventId} className="space-y-1.5 p-3 rounded-lg bg-muted/40 border border-border">
                    <div className="flex items-center justify-between text-sm">
                      <div className="font-semibold text-foreground flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                        <span>{ev.eventName}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{ev.guestsCount} guests</span>
                        <span>{ev.downloadsCount} downloads</span>
                        <span>{ev.searchesCount} searches</span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div style={{ width: `${pct}%` }} className="h-full bg-primary rounded-full transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Studio Guest Leads Directory */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Global Studio Leads Directory</CardTitle>
              <CardDescription>
                Consolidated contacts captured from guest access forms across all events.
              </CardDescription>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
                className="h-8 text-xs"
              >
                All
              </Button>
              <Button
                type="button"
                variant={statusFilter === "verified" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("verified")}
                className="h-8 text-xs"
              >
                Verified
              </Button>
              <Button
                type="button"
                variant={statusFilter === "failed" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("failed")}
                className="h-8 text-xs text-destructive"
              >
                Failed PIN
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or event…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>

          {filteredLeads.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
              {searchQuery ? "No guest leads match your filter." : "No guest leads recorded yet."}
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted text-muted-foreground text-xs uppercase tracking-wider border-b border-border">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Guest Lead</th>
                      <th className="px-4 py-3 font-semibold">Event</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Attempts</th>
                      <th className="px-4 py-3 font-semibold">Downloads</th>
                      <th className="px-4 py-3 font-semibold">Device</th>
                      <th className="px-4 py-3 font-semibold">Last Seen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredLeads.map((lead) => {
                      const cleanPhone = getCleanPhone(lead.guestPhone);
                      const hasWarnings = (lead.failedAttempts || 0) >= 3;

                      return (
                        <tr key={lead._id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">{lead.guestName || "Anonymous"}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <span>{lead.guestPhone}</span>
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

                          <td className="px-4 py-3 text-xs font-medium text-foreground">
                            {lead.eventName}
                          </td>

                          <td className="px-4 py-3">
                            {lead.verified ? (
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
                              <span>{lead.attempts || 1} total</span>
                              {hasWarnings && (
                                <Badge variant="destructive" className="text-[10px] px-1 py-0 gap-0.5">
                                  <AlertTriangle className="h-2.5 w-2.5" />
                                  {lead.failedAttempts} fails
                                </Badge>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3 font-mono text-xs">
                            <span className={cn(lead.downloadsCount > 0 ? "font-bold text-emerald-600" : "text-muted-foreground")}>
                              {lead.downloadsCount || 0}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              {lead.device?.type === "mobile" ? (
                                <Smartphone className="h-3.5 w-3.5 text-primary" />
                              ) : lead.device?.type === "tablet" ? (
                                <Tablet className="h-3.5 w-3.5 text-amber-500" />
                              ) : (
                                <Laptop className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                              <span>{lead.device?.os || "Unknown"}</span>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {formatTime(lead.lastSeenAt || lead.firstSeenAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudioAnalytics;
