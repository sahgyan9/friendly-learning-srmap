
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  /** Narrows the approved tab to mentors who have not been welcomed yet. */
  unwelcomedOnly?: boolean;
  onUnwelcomedOnlyChange?: (value: boolean) => void;
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
  unwelcomedOnly = false,
  onUnwelcomedOnlyChange,
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

        {/* Applications approve themselves now, so the approved tab is every
            mentor who ever joined. Without a way to narrow it, finding who is
            still owed a welcome means reading the whole list every time. */}
        {selectedStatus === "approved" && onUnwelcomedOnlyChange && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={unwelcomedOnly ? "default" : "outline"}
              onClick={() => onUnwelcomedOnlyChange(!unwelcomedOnly)}
              className="gap-1.5"
            >
              <Mail className="h-3.5 w-3.5" />
              Not welcomed yet
              {unwelcomedCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 tabular-nums">
                  {unwelcomedCount}
                </Badge>
              )}
            </Button>

            {unwelcomedOnly && (
              <span className="text-xs text-muted-foreground">
                Showing only mentors with no welcome recorded.
              </span>
            )}
          </div>
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
