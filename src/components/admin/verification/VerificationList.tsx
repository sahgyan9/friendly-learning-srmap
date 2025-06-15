
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, XCircle, Clock, User } from "lucide-react";
import { updateVerificationStatus } from "@/integrations/supabase/services/mentor-verification";
import { useAuth } from "@/context/AuthContext";
import { formatDistanceToNow } from "date-fns";

interface VerificationListProps {
  verifications: any[];
  loading: boolean;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  onStatusUpdate: () => void;
}

const VerificationList = ({ 
  verifications, 
  loading, 
  selectedStatus, 
  onStatusChange, 
  onStatusUpdate 
}: VerificationListProps) => {
  const [updating, setUpdating] = useState<string | null>(null);
  const { user } = useAuth();

  const handleStatusUpdate = async (verificationId: string, status: 'approved' | 'rejected', reason?: string) => {
    if (!user) return;

    try {
      setUpdating(verificationId);
      await updateVerificationStatus(verificationId, status, user.id, reason);
      onStatusUpdate();
    } catch (error) {
      console.error('Error updating verification status:', error);
    } finally {
      setUpdating(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

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
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedStatus} className="space-y-4">
          {verifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <User className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 text-center">
                  No {selectedStatus} mentor applications found
                </p>
              </CardContent>
            </Card>
          ) : (
            verifications.map((verification) => (
              <Card key={verification.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage src={verification.user?.profile_image} />
                        <AvatarFallback>
                          {verification.user?.name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">
                          {verification.user?.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {verification.user?.email} • {verification.user?.department}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(verification.status)}>
                        {getStatusIcon(verification.status)}
                        <span className="ml-1 capitalize">{verification.status}</span>
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Submitted {formatDistanceToNow(new Date(verification.submitted_at))} ago
                      </p>
                      {verification.application_data && (
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                          <p className="text-sm">{verification.application_data.bio || 'No bio provided'}</p>
                        </div>
                      )}
                    </div>

                    {verification.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleStatusUpdate(verification.id, 'approved')}
                          disabled={updating === verification.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleStatusUpdate(verification.id, 'rejected', 'Application needs review')}
                          disabled={updating === verification.id}
                          variant="destructive"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    )}

                    {verification.status === 'rejected' && verification.rejection_reason && (
                      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                        <p className="text-sm text-red-700 dark:text-red-300">
                          <strong>Rejection Reason:</strong> {verification.rejection_reason}
                        </p>
                      </div>
                    )}

                    {verification.reviewed_at && verification.reviewed_by_user && (
                      <div className="text-xs text-muted-foreground">
                        Reviewed by {verification.reviewed_by_user.name} on{' '}
                        {new Date(verification.reviewed_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VerificationList;
