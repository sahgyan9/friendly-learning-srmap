
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, ShieldCheck, User } from "lucide-react";
import VerificationDetailsCard from "./VerificationDetailsCard";
import type { WelcomeStatusMap } from "@/integrations/supabase/services/welcome-emails";

interface VerificationListProps {
  verifications: any[];
  loading: boolean;
  selectedStatus: string;
  /** Drives the count on the review tab; applications approve themselves, so
   *  this is the only number that represents outstanding work. */
  flaggedCount?: number;
  onStatusChange: (status: string) => void;
  onStatusUpdate: () => void;
  /** Email + welcome state per mentor id, from the admin-only RPC. */
  welcomeStatus?: WelcomeStatusMap;
  /** Drives the pointer to the welcome-emails page. */
  unwelcomedCount?: number;
  onWelcomeSent?: () => void;
}

const VerificationList = ({
  verifications,
  loading,
  selectedStatus,
  flaggedCount = 0,
  onStatusChange,
  onStatusUpdate,
  welcomeStatus,
  unwelcomedCount = 0,
  onWelcomeSent
}: VerificationListProps) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={selectedStatus} onValueChange={onStatusChange}>
        <TabsList>
          <TabsTrigger value="flagged" className="gap-1.5">
            Needs review
            {flaggedCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 tabular-nums">
                {flaggedCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        {/* Chasing outstanding welcomes belongs on /admin/welcome-emails,
            which is built around that one question. This tab keeps the per-row
            state as context while reviewing an application, but not a second
            way of filtering for it that could disagree with the first. */}
        {selectedStatus === "approved" && unwelcomedCount > 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            {unwelcomedCount} {unwelcomedCount === 1 ? "mentor has" : "mentors have"} not been
            welcomed yet —{" "}
            <Link to="/admin/welcome-emails" className="font-medium text-primary hover:underline">
              <Mail className="mr-1 inline h-3.5 w-3.5" />
              send their welcome emails
            </Link>
          </p>
        )}

        <TabsContent value={selectedStatus} className="space-y-4">
          {verifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                {selectedStatus === "flagged" ? (
                  <>
                    <ShieldCheck className="h-12 w-12 text-green-500 mb-4" />
                    <p className="text-center text-muted-foreground">
                      Nothing to review — every application passed its checks.
                    </p>
                  </>
                ) : (
                  <>
                    <User className="h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500 text-center">
                      No {selectedStatus} mentor applications found
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {verifications.map((verification) => (
                <VerificationDetailsCard
                  key={verification.id}
                  verification={verification}
                  onStatusUpdate={onStatusUpdate}
                  welcome={welcomeStatus?.get(verification.user_id)}
                  onWelcomeSent={onWelcomeSent}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VerificationList;
