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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ThumbsUp, 
  ThumbsDown, 
  MoreHorizontal, 
  CheckCircle, 
  Check, 
  PlusCircle, 
  BrainCircuit, 
  MessageSquare,
  AlertCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type FeedbackRecord = {
  id: string;
  query: string;
  response: any;
  is_helpful: boolean;
  status: string;
  created_at: string;
};

export default function AdminAIFeedback() {
  const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeedback = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ai_overview_feedback" as any)
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching feedback:", error);
    } else {
      setFeedbacks(data as unknown as FeedbackRecord[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from("ai_overview_feedback" as any)
      .update({ status: newStatus })
      .eq("id", id);
      
    if (!error) {
      setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f));
    } else {
      console.error("Failed to update status", error);
    }
  };

  const totalQueries = feedbacks.length;
  const pendingReview = feedbacks.filter(f => f.status === 'new').length;
  const helpfulCount = feedbacks.filter(f => f.is_helpful).length;
  const helpfulPercentage = totalQueries > 0 ? Math.round((helpfulCount / totalQueries) * 100) : 0;

  return (
    <AdminPageWrapper>
      <AdminHeader
        title="AI Overview Feedback"
        description="Review how students are interacting with the AI Search, identify missing campus resources, and take action to improve results."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Total AI Queries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQueries}</div>
          </CardContent>
        </Card>
        <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <ThumbsUp className="h-4 w-4" />
              Helpful Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{helpfulPercentage}%</div>
          </CardContent>
        </Card>
        <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingReview}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BrainCircuit className="h-5 w-5 text-primary" />
            Feedback Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                <TableRow>
                  <TableHead className="w-[180px]">Date</TableHead>
                  <TableHead className="w-[250px]">Student Query</TableHead>
                  <TableHead>AI Summary Preview</TableHead>
                  <TableHead className="w-[100px] text-center">Vote</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading feedback data...
                    </TableCell>
                  </TableRow>
                ) : feedbacks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No AI feedback recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  feedbacks.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        "{item.query}"
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                        {item.response?.summary || "No summary available"}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.is_helpful ? (
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={item.status === 'new' ? 'secondary' : item.status === 'reviewed' ? 'outline' : 'default'}
                          className="text-[10px] uppercase"
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
                            <DropdownMenuLabel>Quick Actions (Fill Gap)</DropdownMenuLabel>
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
    </AdminPageWrapper>
  );
}
