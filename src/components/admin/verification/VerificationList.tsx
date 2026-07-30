
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, User } from "lucide-react";
import VerificationDetailsCard from "./VerificationDetailsCard";

interface VerificationListProps {
  verifications: any[];
  loading: boolean;
  selectedStatus: string;
  /** Drives the count on the review tab; applications approve themselves, so
   *  this is the only number that represents outstanding work. */
  flaggedCount?: number;
  onStatusChange: (status: string) => void;
  onStatusUpdate: () => void;
}

const VerificationList = ({
  verifications,
  loading,
  selectedStatus,
  flaggedCount = 0,
  onStatusChange,
  onStatusUpdate
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
