import { useState } from "react";
import { GraduationCap } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSrmDobNag } from "@/components/onboarding/SrmDobNagContext";
import { ImportSrmPortalDialog } from "@/components/profile/ImportSrmPortal";

/**
 * The nag itself — short, not a wizard. "Link now" hands off to the same
 * captcha-confirmed dialog used everywhere else; "Remind me later" just
 * closes (see SrmDobNagContext for why that doesn't touch any DB flag).
 */
export function SrmDobNag() {
  const { open, dismissNag } = useSrmDobNag();
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && dismissNag()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <GraduationCap className="h-4.5 w-4.5" />
              </div>
              <DialogTitle>Link your SRM portal</DialogTitle>
            </div>
            <DialogDescription className="pt-1">
              Used to securely link your SRM portal — enables automatic syncing of your
              CGPA, semester and coursework, so you never have to re-import it yourself.
              Stored encrypted, never shown to anyone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={dismissNag}>
              Remind me later
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                dismissNag();
                setLinkDialogOpen(true);
              }}
            >
              Link now
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ImportSrmPortalDialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen} />
    </>
  );
}

export default SrmDobNag;
