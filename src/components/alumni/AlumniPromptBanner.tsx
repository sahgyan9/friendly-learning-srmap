import { useCallback, useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { hasGraduated } from "@/lib/college-id";
import { getAlumniStatus, type AlumniStatus } from "@/integrations/supabase/services/alumni";
import AlumniConfirmModal from "./AlumniConfirmModal";

/**
 * Asks a mentor whose graduation year has passed whether they have graduated.
 *
 * A banner rather than an interruption. The monthly job also drops a
 * notification in the bell, but someone who is on their profile page is already
 * in the right frame of mind, and a modal that opens itself on arrival would be
 * hostile — especially since the honest answer may be "not yet".
 *
 * Shown only to mentors: a student who is not listed has nothing to convert.
 */
const AlumniPromptBanner = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<AlumniStatus | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await getAlumniStatus(user.id);
    setStatus(data);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!status?.isMentor) return null;
  if (status.confirmedAt) return null;
  if (!hasGraduated(status.graduationYear)) return null;

  return (
    <>
      <Card className="mb-6 border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-semibold">Have you graduated?</h3>
              <p className="text-sm text-muted-foreground">
                Your profile says you finish in {status.graduationYear}. Confirm and students
                will see you as an alumni mentor — the people they ask about placements and
                careers.
              </p>
            </div>
          </div>
          <Button onClick={() => setModalOpen(true)} className="shrink-0">
            Confirm
          </Button>
        </CardContent>
      </Card>

      <AlumniConfirmModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        graduationYear={status.graduationYear}
        onConfirmed={load}
      />
    </>
  );
};

export default AlumniPromptBanner;
