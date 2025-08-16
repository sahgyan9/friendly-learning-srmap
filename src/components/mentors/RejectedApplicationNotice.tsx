
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Edit, FileText, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { getMentorVerification } from "@/integrations/supabase/services/mentor-verification";
import { useAuth } from "@/context/AuthContext";

const RejectedApplicationNotice = () => {
  const { user } = useAuth();
  const [rejectedApplication, setRejectedApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkForRejectedApplication = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await getMentorVerification(user.id);
        if (data && data.status === 'rejected') {
          setRejectedApplication(data);
        }
      } catch (error) {
        console.error('Error checking for rejected application:', error);
      } finally {
        setLoading(false);
      }
    };

    checkForRejectedApplication();
  }, [user]);

  if (loading || !rejectedApplication) {
    return null;
  }

  return (
    <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 mb-6">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200">
                Mentor Application Needs Attention
              </h3>
              <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                Rejected
              </Badge>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Admin Feedback:
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {rejectedApplication.rejection_reason}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild className="flex-1 sm:flex-none">
                <Link to="/become-mentor?edit=true">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit & Resubmit Application
                </Link>
              </Button>
              
              <Button variant="outline" asChild>
                <Link to="/profile">
                  <FileText className="h-4 w-4 mr-2" />
                  View Profile
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                💡 <strong>Good news:</strong> Your previous information has been saved. You can edit your application and resubmit it without starting from scratch.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RejectedApplicationNotice;
