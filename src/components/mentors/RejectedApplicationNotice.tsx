
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Edit, FileText, ArrowRight, X } from "lucide-react";
import { Link } from "react-router-dom";
import { getMentorVerification } from "@/integrations/supabase/services/mentor-verification";
import { useAuth } from "@/context/AuthContext";

const RejectedApplicationNotice = () => {
  const { user } = useAuth();
  const [rejectedApplication, setRejectedApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

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

  if (loading || !rejectedApplication || dismissed) {
    return null;
  }

  return (
    <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 mb-6 shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200">
                  🎯 Your Mentor Application Needs Attention
                </h3>
                <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                  Action Required
                </Badge>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-start space-x-2">
                  <FileText className="h-4 w-4 text-gray-600 dark:text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Admin Feedback:
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {rejectedApplication.rejection_reason}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg" className="flex-1 sm:flex-none bg-amber-600 hover:bg-amber-700">
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

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start space-x-2">
                  <div className="text-blue-500 text-lg">💡</div>
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                      Don't worry, your data is safe!
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                      All your previous information has been saved. You can edit your application and make the suggested improvements without starting from scratch.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setDismissed(true)}
            className="ml-4 text-amber-600 hover:text-amber-700 hover:bg-amber-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RejectedApplicationNotice;
