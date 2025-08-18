
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getMentorVerification } from "@/integrations/supabase/services/mentor-verification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, XCircle, Edit, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MentorApplicationStatus {
  hasApplication: boolean;
  status: string | null;
  applicationData: any;
}

interface MentorApplicationStatusCheckerProps {
  onStatusChange?: (status: MentorApplicationStatus) => void;
  showCard?: boolean;
}

const MentorApplicationStatusChecker = ({ onStatusChange, showCard = true }: MentorApplicationStatusCheckerProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<MentorApplicationStatus>({
    hasApplication: false,
    status: null,
    applicationData: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkApplicationStatus();
    } else {
      setLoading(false);
    }
  }, [user]);

  const checkApplicationStatus = async () => {
    try {
      const { data } = await getMentorVerification(user.id);
      
      const applicationStatus = {
        hasApplication: !!data,
        status: data?.status || null,
        applicationData: data
      };
      
      setStatus(applicationStatus);
      onStatusChange?.(applicationStatus);
    } catch (error) {
      console.error('Error checking application status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: <Clock className="h-5 w-5 text-amber-600" />,
          badge: <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">Under Review</Badge>,
          title: "Application Under Review",
          description: "Your mentor application is being reviewed by our team.",
          cardClass: "border-amber-200 bg-amber-50 dark:bg-amber-900/20",
          action: (
            <Button onClick={() => navigate('/become-mentor')} variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              View Status
            </Button>
          )
        };
      case 'approved':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-600" />,
          badge: <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">Approved</Badge>,
          title: "Application Approved",
          description: "Congratulations! You're now a verified mentor.",
          cardClass: "border-green-200 bg-green-50 dark:bg-green-900/20",
          action: (
            <Button onClick={() => navigate('/profile')} size="sm">
              <Eye className="h-4 w-4 mr-2" />
              View Profile
            </Button>
          )
        };
      case 'rejected':
        return {
          icon: <XCircle className="h-5 w-5 text-red-600" />,
          badge: <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200">Needs Attention</Badge>,
          title: "Application Needs Updates",
          description: "Your application needs improvements. You can edit and resubmit it.",
          cardClass: "border-red-200 bg-red-50 dark:bg-red-900/20",
          action: (
            <Button onClick={() => navigate('/become-mentor?edit=true')} size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit Application
            </Button>
          )
        };
      default:
        return null;
    }
  };

  if (loading || !status.hasApplication || !showCard) {
    return null;
  }

  const statusDisplay = getStatusDisplay(status.status!);
  
  if (!statusDisplay) {
    return null;
  }

  return (
    <Card className={`mb-6 ${statusDisplay.cardClass}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center space-x-3">
            {statusDisplay.icon}
            <div>
              <h3 className="text-lg font-semibold">{statusDisplay.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{statusDisplay.description}</p>
            </div>
          </span>
          <div className="flex items-center space-x-2">
            {statusDisplay.badge}
            {statusDisplay.action}
          </div>
        </CardTitle>
      </CardHeader>
      {status.status === 'rejected' && status.applicationData?.rejection_reason && (
        <CardContent>
          <div className="bg-white dark:bg-gray-800 p-3 rounded border">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Admin Feedback:
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {status.applicationData.rejection_reason}
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default MentorApplicationStatusChecker;
