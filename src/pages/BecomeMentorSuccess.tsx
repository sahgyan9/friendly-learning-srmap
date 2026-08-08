
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, FolderGit2, Home } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { getMentorVerification } from "@/integrations/supabase/services/mentor-verification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Landed on right after a first-time mentor application, never linked to
 * directly. If someone opens this URL without an approved application behind
 * it — a stale bookmark, a refresh after the row changes — it sends them back
 * to the real status page rather than showing a success screen for nothing.
 */
const BecomeMentorSuccess = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) return;

    getMentorVerification(user.id).then(({ data }) => {
      if (!data || data.status !== "approved") {
        navigate("/become-mentor", { replace: true });
        return;
      }
      setChecking(false);
    });
  }, [user, navigate]);

  if (!user || checking) {
    return (
      <div className="min-h-screen bg-background">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-lg mx-auto text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/60">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-3">You're a mentor now 🎉</h1>
          <p className="text-muted-foreground mb-8">
            Your profile is live. Students looking for help in your department can find and
            message you right away.
          </p>

          <Card className="text-left">
            <CardHeader>
              <CardTitle className="text-base">What's next</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Add a project or two to your profile — it's the first thing students look at
                when deciding who to message.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button onClick={() => navigate(`/mentor/${user.id}`)} className="flex-1">
                  <FolderGit2 className="h-4 w-4 mr-2" />
                  Add a project
                </Button>
                <Button variant="outline" onClick={() => navigate("/")} className="flex-1">
                  <Home className="h-4 w-4 mr-2" />
                  Go to homepage
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BecomeMentorSuccess;
