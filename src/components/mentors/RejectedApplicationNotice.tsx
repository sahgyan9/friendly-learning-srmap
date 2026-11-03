
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Pencil, X } from "lucide-react";
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
    <section
      className="mb-6 rounded-xl border border-amber-500/40 bg-amber-50 p-5 dark:bg-amber-950/20"
      role="status"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">Your mentor application needs changes</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Your previous answers are saved. Edit them and resubmit; you do not need to start over.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Feedback from the reviewer</p>
            <p className="mt-1 text-sm leading-relaxed text-foreground">
              {rejectedApplication.rejection_reason}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild>
              <Link to="/become-mentor?edit=true">
                <Pencil />
                Edit and resubmit
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/profile">View profile</Link>
            </Button>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="-mr-2 -mt-2 shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X />
        </Button>
      </div>
    </section>
  );
};

export default RejectedApplicationNotice;
