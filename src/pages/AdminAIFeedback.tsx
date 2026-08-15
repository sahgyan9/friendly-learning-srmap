import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
  AlertCircle,
  Search,
  RefreshCw,
  TrendingUp,
  ExternalLink,
  MessageSquare,
  Sparkles
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

type FeedbackRecord = {
  id: string;
  query: string;
  response: any;
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
  const [searchQueries, setSearchQueries] = useState<SearchQueryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState<"all" | "new" | "reviewed" | "actioned" | "helpful" | "unhelpful">("all");
  const [querySort, setQuerySort] = useState<"recent" | "hits">("recent");

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch feedback
      const { data: feedbackData, error: feedbackError } = await supabase
        .from("ai_overview_feedback" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (feedbackError) {
        console.error("Error fetching feedback:", feedbackError);
      } else {
        setFeedbacks((feedbackData as unknown as FeedbackRecord[]) || []);
      }

      // Fetch search query cache
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
      toast.error("Failed to load AI feedback data");
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
  const totalSearchHits = searchQueries.reduce((acc, q) => acc + (q.hit_count || 1), 0);

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

  // Filtered and sorted search queries
  const filteredQueries = searchQueries
    .filter(item => {
      return searchFilter.trim() === "" || item.query_text.toLowerCase().includes(searchFilter.toLowerCase());
    })
    .sort((a, b) => {
      if (querySort === "hits") {
        return (b.hit_count || 1) - (a.hit_count || 1);
      }
      return new Date(b.last_used_at || b.created_at).getTime() - new Date(a.last_used_at || a.created_at).getTime();
    });

  return (
    <AdminPageWrapper>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <AdminHeader
          title="AI Overview & Query Analytics"
          description="Review real student searches, evaluate Campus AI Overview feedback, identify missing campus topics, and take action to improve results."
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
              <span>Total Student Searches</span>
              <Search className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalSearchHits}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Across {totalUniqueQueries} unique topics</p>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-xl border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
              <span>Feedback Responses</span>
              <MessageSquare className="h-4 w-4 text-violet-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalFeedbacks}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Ratings submitted on AI Overviews</p>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-xl border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
              <span>Helpful Rating</span>
              <ThumbsUp className="h-4 w-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{helpfulPercentage}%</div>
            <p className="text-xs text-muted-foreground mt-0.5">{helpfulCount} positive of {totalFeedbacks} votes</p>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-xl border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
              <span>Pending Review</span>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingReview}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Awaiting admin assessment</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Container */}
      <Tabs defaultValue="queries" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList className="bg-muted/80 p-1">
            <TabsTrigger value="queries" className="gap-2 text-xs sm:text-sm">
              <TrendingUp className="h-4 w-4" />
              Student Search Queries ({totalUniqueQueries})
            </TabsTrigger>
            <TabsTrigger value="feedback" className="gap-2 text-xs sm:text-sm">
              <BrainCircuit className="h-4 w-4" />
              AI Overview Feedback ({totalFeedbacks})
            </TabsTrigger>
          </TabsList>

          {/* Search Filter Bar */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter queries & summaries..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        {/* Tab 1: Live Student Search Queries */}
        <TabsContent value="queries">
          <Card className="bg-card/70 backdrop-blur-xl border-border/60 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Live Student Queries
                </CardTitle>
                <CardDescription className="text-xs">
                  Discover what topics, faculty, skills, and questions SRM AP students are searching for in real time.
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
                      <TableHead className="w-[340px]">Student Search Query</TableHead>
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
                          Loading student queries...
                        </TableCell>
                      </TableRow>
                    ) : filteredQueries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                          {searchFilter ? `No search queries match "${searchFilter}".` : "No student searches recorded yet."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredQueries.map((item) => (
                        <TableRow key={item.query_hash} className="hover:bg-accent/40 transition-colors">
                          <TableCell className="font-medium text-sm">
                            <span className="text-foreground font-medium block">
                              "{item.query_text}"
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant={item.hit_count > 3 ? "default" : "secondary"}
                              className="text-[11px] font-mono px-2 py-0.5"
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

        {/* Tab 2: AI Overview Feedback Log */}
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
                              {item.response?.summary || "No summary available"}
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
                              className="text-[10px] uppercase font-semibold"
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
