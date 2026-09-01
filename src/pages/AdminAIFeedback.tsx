import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  getAdminSearchLogs,
  getAdminSearchStats,
  AdminSearchLogEntry,
  AdminSearchStats
} from "@/integrations/supabase/services/admin";
import AdminPageWrapper from "@/components/admin/AdminPageWrapper";
import AdminHeader from "@/components/admin/AdminHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  ThumbsUp, 
  ThumbsDown, 
  MoreHorizontal, 
  CheckCircle, 
  Check, 
  PlusCircle, 
  BrainCircuit, 
  Search, 
  RefreshCw, 
  TrendingUp, 
  ExternalLink, 
  MessageSquare, 
  Sparkles, 
  User, 
  UserCheck, 
  Globe, 
  Users, 
  Layers
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";

type FeedbackRecord = {
  id: string;
  query: string;
  response: { summary?: unknown } | null;
  is_helpful: boolean;
  status: string;
  created_at: string;
};

type SearchQueryRecord = {
  query_hash: string;
  query_text: string;
  hit_count: number;
  created_at: string;
  last_used_at: string;
};

export default function AdminAIFeedback() {
  const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([]);
  const [searchLogs, setSearchLogs] = useState<AdminSearchLogEntry[]>([]);
  const [searchStats, setSearchStats] = useState<AdminSearchStats | null>(null);
  const [searchQueries, setSearchQueries] = useState<SearchQueryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState<"all" | "authenticated" | "anonymous" | "zero_results">("all");
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState<"all" | "new" | "reviewed" | "actioned" | "helpful" | "unhelpful">("all");
  const [querySort, setQuerySort] = useState<"recent" | "hits">("recent");

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch search logs with user attribution
      const logs = await getAdminSearchLogs({
        limit: 100,
        offset: 0,
        filter: "",
        userType: "all",
      });
      setSearchLogs(logs);

      // 2. Fetch search stats
      const stats = await getAdminSearchStats();
      setSearchStats(stats);

      // 3. Fetch feedback
      const { data: feedbackData, error: feedbackError } = await supabase
        .from("ai_overview_feedback" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (feedbackError) {
        console.error("Error fetching feedback:", feedbackError);
      } else {
        setFeedbacks((feedbackData as unknown as FeedbackRecord[]) || []);
      }

      // 4. Fetch search query cache
      const { data: queryData, error: queryError } = await supabase
        .from("search_query_cache" as any)
        .select("query_hash, query_text, hit_count, created_at, last_used_at")
        .order("last_used_at", { ascending: false });

      if (queryError) {
        console.error("Error fetching search queries:", queryError);
      } else {
        setSearchQueries((queryData as unknown as SearchQueryRecord[]) || []);
      }
    } catch (err) {
      console.error("Failed to load admin AI feedback data:", err);
      toast.error("Failed to load AI feedback and search log data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("ai_overview_feedback" as any)
        .update({ status: newStatus })
        .eq("id", id);
        
      if (!error) {
        setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f));
        toast.success(`Feedback marked as ${newStatus}`);
      } else {
        console.error("Failed to update status", error);
        toast.error("Failed to update status");
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      toast.error("Error updating status");
    }
  };

  const totalFeedbacks = feedbacks.length;
  const pendingReview = feedbacks.filter(f => f.status === 'new').length;
  const helpfulCount = feedbacks.filter(f => f.is_helpful).length;
  const helpfulPercentage = totalFeedbacks > 0 ? Math.round((helpfulCount / totalFeedbacks) * 100) : 0;
  
  const totalUniqueQueries = searchQueries.length;
  const totalSearchHits = searchStats?.total_searches ?? searchQueries.reduce((acc, q) => acc + (q.hit_count || 1), 0);
  const authenticatedSearches = searchStats?.authenticated_searches ?? searchLogs.filter(l => !l.is_anonymous).length;
  const anonymousSearches = searchStats?.anonymous_searches ?? searchLogs.filter(l => l.is_anonymous).length;
  const uniqueSearchers = searchStats?.unique_searchers ?? new Set(searchLogs.map(l => l.user_id).filter(Boolean)).size;

  // Filtered search logs with user attribution
  const filteredSearchLogs = searchLogs.filter(item => {
    // 1. User type filter
    if (userTypeFilter === "authenticated" && item.is_anonymous) return false;
    if (userTypeFilter === "anonymous" && !item.is_anonymous) return false;
    if (userTypeFilter === "zero_results" && item.result_count > 0) return false;

    // 2. Text filter across query, student name, email, and college ID
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      item.query_text.toLowerCase().includes(term) ||
      (item.user_name && item.user_name.toLowerCase().includes(term)) ||
      (item.user_email && item.user_email.toLowerCase().includes(term)) ||
      (item.user_college_id && item.user_college_id.toLowerCase().includes(term)) ||
      (item.user_department && item.user_department.toLowerCase().includes(term))
    );
  });

  // Filtered feedback
  const filteredFeedbacks = feedbacks.filter(item => {
    const matchesSearch = searchFilter.trim() === "" || 
      item.query.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (item.response?.summary && String(item.response.summary).toLowerCase().includes(searchFilter.toLowerCase()));
    
    if (!matchesSearch) return false;

    if (feedbackStatusFilter === "all") return true;
    if (feedbackStatusFilter === "helpful") return item.is_helpful;
    if (feedbackStatusFilter === "unhelpful") return !item.is_helpful;
    return item.status === feedbackStatusFilter;
  });

  // Filtered and sorted topic queries
  const filteredTopicQueries = searchQueries
    .filter(item => {
      return searchFilter.trim() === "" || item.query_text.toLowerCase().includes(searchFilter.toLowerCase());
    })
    .sort((a, b) => {
      if (querySort === "hits") {
        return (b.hit_count || 1) - (a.hit_count || 1);
      }
      return new Date(b.last_used_at || b.created_at).getTime() - new Date(a.last_used_at || a.created_at).getTime();
    });

  const getRoleBadgeVariant = (role: string) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      case "mentor":
        return "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20";
      case "alumni":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "student":
        return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <AdminPageWrapper>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <AdminHeader
          title="CampusBrain Search Logs & User Attribution"
          description="Monitor real student search queries, see which students searched for specific campus topics, and evaluate AI Overview feedback."
        />
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={loading}
          className="self-start sm:self-center gap-1.5 shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-card/60 backdrop-blur-xl border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
              <span>Total Search Runs</span>
              <Search className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalSearchHits}</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalUniqueQueries} distinct campus topics
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-xl border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
              <span>User Attribution</span>
              <UserCheck className="h-4 w-4 text-violet-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {authenticatedSearches} <span className="text-xs font-normal text-muted-foreground">/ {totalSearchHits}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {anonymousSearches} guest / anonymous queries
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-xl border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
              <span>Active Student Searchers</span>
              <Users className="h-4 w-4 text-sky-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">{uniqueSearchers}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Distinct signed-in students</p>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-xl border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
              <span>AI Overview Rating</span>
              <ThumbsUp className="h-4 w-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{helpfulPercentage}%</div>
            <p className="text-xs text-muted-foreground mt-0.5">{helpfulCount} helpful of {totalFeedbacks} ratings</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Container */}
      <Tabs defaultValue="user-logs" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList className="bg-muted/80 p-1">
            <TabsTrigger value="user-logs" className="gap-2 text-xs sm:text-sm">
              <UserCheck className="h-4 w-4" />
              Student Search Logs ({searchLogs.length})
            </TabsTrigger>
            <TabsTrigger value="topics" className="gap-2 text-xs sm:text-sm">
              <Layers className="h-4 w-4" />
              Topic Cache ({totalUniqueQueries})
            </TabsTrigger>
            <TabsTrigger value="feedback" className="gap-2 text-xs sm:text-sm">
              <BrainCircuit className="h-4 w-4" />
              AI Overview Feedback ({totalFeedbacks})
            </TabsTrigger>
          </TabsList>

          {/* Search Filter Bar */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by query, student name, or email..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        {/* Tab 1: Search Logs with User Attribution */}
        <TabsContent value="user-logs">
          <Card className="bg-card/70 backdrop-blur-xl border-border/60 shadow-xs">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Live Search Log & User Attribution
                </CardTitle>
                <CardDescription className="text-xs">
                  Review search queries with full user identity attribution for signed-in students and guest tracking.
                </CardDescription>
              </div>

              {/* User Type Filters */}
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  variant={userTypeFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUserTypeFilter("all")}
                  className="text-xs h-7"
                >
                  All ({searchLogs.length})
                </Button>
                <Button
                  variant={userTypeFilter === "authenticated" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUserTypeFilter("authenticated")}
                  className="text-xs h-7 gap-1"
                >
                  <User className="h-3 w-3" />
                  Students ({searchLogs.filter(l => !l.is_anonymous).length})
                </Button>
                <Button
                  variant={userTypeFilter === "anonymous" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUserTypeFilter("anonymous")}
                  className="text-xs h-7 gap-1"
                >
                  <Globe className="h-3 w-3" />
                  Guests ({searchLogs.filter(l => l.is_anonymous).length})
                </Button>
                <Button
                  variant={userTypeFilter === "zero_results" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUserTypeFilter("zero_results")}
                  className="text-xs h-7"
                >
                  Zero Results ({searchLogs.filter(l => l.result_count === 0).length})
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <div className="rounded-md border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[260px]">Student / User</TableHead>
                      <TableHead className="w-[280px]">CampusBrain Query</TableHead>
                      <TableHead className="w-[110px] text-center">Results</TableHead>
                      <TableHead className="w-[160px]">Time</TableHead>
                      <TableHead className="w-[140px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                          Loading search logs...
                        </TableCell>
                      </TableRow>
                    ) : filteredSearchLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                          {searchFilter ? `No search logs match "${searchFilter}".` : "No search events recorded yet."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSearchLogs.map((item) => (
                        <TableRow key={item.id} className="hover:bg-accent/40 transition-colors">
                          {/* Student Attribution Column */}
                          <TableCell>
                            {item.is_anonymous || !item.user_id ? (
                              <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0 border border-border">
                                  <Globe className="h-4 w-4" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-medium text-muted-foreground">Anonymous Guest</span>
                                    <Badge variant="outline" className="text-3xs px-1.5 py-0">Guest</Badge>
                                  </div>
                                  <span className="text-3xs text-muted-foreground/70 block">Unauthenticated</span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2.5">
                                <Avatar className="h-8 w-8 shrink-0 border border-border/80">
                                  <AvatarImage src={item.user_avatar || undefined} alt={item.user_name} />
                                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                                    {item.user_name.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <Link
                                      to={`/profile/${item.user_id}`}
                                      className="text-xs font-medium text-foreground hover:text-primary hover:underline truncate max-w-[140px] block"
                                      title={item.user_name}
                                    >
                                      {item.user_name}
                                    </Link>
                                    <span className={`inline-flex items-center px-1.5 py-0 text-3xs font-semibold rounded border uppercase tracking-wider ${getRoleBadgeVariant(item.user_role)}`}>
                                      {item.user_role}
                                    </span>
                                  </div>
                                  <div className="text-3xs text-muted-foreground truncate max-w-[160px]" title={item.user_email || item.user_department || ""}>
                                    {item.user_email || (item.user_department ? `${item.user_department}` : "Student")}
                                  </div>
                                </div>
                              </div>
                            )}
                          </TableCell>

                          {/* Query Column */}
                          <TableCell className="font-medium text-sm">
                            <span className="text-foreground font-medium block">
                              "{item.query_text}"
                            </span>
                          </TableCell>

                          {/* Results Count Column */}
                          <TableCell className="text-center">
                            {item.result_count === 0 ? (
                              <Badge variant="destructive" className="text-2xs px-2 py-0.5 font-mono">
                                0 results
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-2xs px-2 py-0.5 font-mono">
                                {item.result_count} {item.result_count === 1 ? 'result' : 'results'}
                              </Badge>
                            )}
                          </TableCell>

                          {/* Timestamp Column */}
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            <span title={format(new Date(item.created_at), "PPpp")}>
                              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                            </span>
                          </TableCell>

                          {/* Actions Column */}
                          <TableCell className="text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                asChild
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary"
                                title="Run search on platform"
                              >
                                <Link to={`/search?q=${encodeURIComponent(item.query_text)}`}>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  <span>Test</span>
                                </Link>
                              </Button>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-7 w-7 p-0">
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[200px]">
                                  {item.user_id && (
                                    <>
                                      <DropdownMenuItem asChild>
                                        <Link to={`/profile/${item.user_id}`}>
                                          <User className="mr-2 h-4 w-4" />
                                          View Student Profile
                                        </Link>
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                    </>
                                  )}
                                  <DropdownMenuLabel>Fill Content Gap</DropdownMenuLabel>
                                  <DropdownMenuItem asChild>
                                    <Link to="/communities?create=true">
                                      <PlusCircle className="mr-2 h-4 w-4" />
                                      Create Group
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link to="/opportunities?create=true">
                                      <PlusCircle className="mr-2 h-4 w-4" />
                                      Create Opportunity
                                    </Link>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Aggregated Topic Cache */}
        <TabsContent value="topics">
          <Card className="bg-card/70 backdrop-blur-xl border-border/60 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  CampusBrain Topic Embedding Cache
                </CardTitle>
                <CardDescription className="text-xs">
                  Unique search queries, vector embedding hit counts, and popularity metrics.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={querySort === "recent" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuerySort("recent")}
                  className="text-xs h-7"
                >
                  Most Recent
                </Button>
                <Button
                  variant={querySort === "hits" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuerySort("hits")}
                  className="text-xs h-7"
                >
                  Most Popular
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <div className="rounded-md border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[340px]">Campus Topic</TableHead>
                      <TableHead className="w-[100px] text-center">Searches</TableHead>
                      <TableHead className="w-[160px]">Last Searched</TableHead>
                      <TableHead className="w-[160px]">First Discovered</TableHead>
                      <TableHead className="w-[140px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                          Loading topic cache...
                        </TableCell>
                      </TableRow>
                    ) : filteredTopicQueries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                          {searchFilter ? `No topics match "${searchFilter}".` : "No topic queries cached yet."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTopicQueries.map((item) => (
                        <TableRow key={item.query_hash} className="hover:bg-accent/40 transition-colors">
                          <TableCell className="font-medium text-sm">
                            <span className="text-foreground font-medium block">
                              "{item.query_text}"
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant={item.hit_count > 3 ? "default" : "secondary"}
                              className="text-2xs font-mono px-2 py-0.5"
                            >
                              {item.hit_count} {item.hit_count === 1 ? 'hit' : 'hits'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(item.last_used_at || item.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                asChild
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary"
                                title="Run search on platform"
                              >
                                <Link to={`/search?q=${encodeURIComponent(item.query_text)}`}>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  <span>Test</span>
                                </Link>
                              </Button>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-7 w-7 p-0">
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[200px]">
                                  <DropdownMenuLabel>Fill Content Gap</DropdownMenuLabel>
                                  <DropdownMenuItem asChild>
                                    <Link to="/communities?create=true">
                                      <PlusCircle className="mr-2 h-4 w-4" />
                                      Create Group
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link to="/opportunities?create=true">
                                      <PlusCircle className="mr-2 h-4 w-4" />
                                      Create Opportunity
                                    </Link>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: AI Overview Feedback Log */}
        <TabsContent value="feedback">
          <Card className="bg-card/70 backdrop-blur-xl border-border/60 shadow-xs">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4 text-primary" />
                  AI Overview Feedback Log
                </CardTitle>
                <CardDescription className="text-xs">
                  Student ratings and helpfulness votes on Campus AI generated summaries.
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  variant={feedbackStatusFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFeedbackStatusFilter("all")}
                  className="text-xs h-7"
                >
                  All ({feedbacks.length})
                </Button>
                <Button
                  variant={feedbackStatusFilter === "new" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFeedbackStatusFilter("new")}
                  className="text-xs h-7"
                >
                  New ({feedbacks.filter(f => f.status === 'new').length})
                </Button>
                <Button
                  variant={feedbackStatusFilter === "helpful" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFeedbackStatusFilter("helpful")}
                  className="text-xs h-7"
                >
                  Helpful ({feedbacks.filter(f => f.is_helpful).length})
                </Button>
                <Button
                  variant={feedbackStatusFilter === "unhelpful" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFeedbackStatusFilter("unhelpful")}
                  className="text-xs h-7"
                >
                  Needs Work ({feedbacks.filter(f => !f.is_helpful).length})
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <div className="rounded-md border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[140px]">Date</TableHead>
                      <TableHead className="w-[240px]">Student Query</TableHead>
                      <TableHead>AI Summary Preview</TableHead>
                      <TableHead className="w-[80px] text-center">Vote</TableHead>
                      <TableHead className="w-[110px]">Status</TableHead>
                      <TableHead className="w-[80px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                          Loading feedback data...
                        </TableCell>
                      </TableRow>
                    ) : filteredFeedbacks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                          {searchFilter ? `No feedback entries match "${searchFilter}".` : "No AI feedback recorded yet."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredFeedbacks.map((item) => (
                        <TableRow key={item.id} className="hover:bg-accent/40 transition-colors">
                          <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            <span className="text-foreground">"{item.query}"</span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[340px]">
                            <p className="line-clamp-2">
                              {item.response?.summary ? String(item.response.summary) : "No summary available"}
                            </p>
                          </TableCell>
                          <TableCell className="text-center">
                            {item.is_helpful ? (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
                                <ThumbsUp className="h-3.5 w-3.5" />
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400">
                                <ThumbsDown className="h-3.5 w-3.5" />
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={item.status === 'new' ? 'secondary' : item.status === 'reviewed' ? 'outline' : 'default'}
                              className="text-3xs uppercase font-semibold"
                            >
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-[200px]">
                                <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => updateStatus(item.id, 'reviewed')}>
                                  <Check className="mr-2 h-4 w-4" />
                                  Mark as Reviewed
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatus(item.id, 'actioned')}>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Mark as Actioned
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem asChild>
                                  <Link to={`/search?q=${encodeURIComponent(item.query)}`}>
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Test in Search
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link to="/communities?create=true">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Create Community
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link to="/opportunities?create=true">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Create Opportunity
                                  </Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminPageWrapper>
  );
}
