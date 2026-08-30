import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Award,
  CalendarCheck2,
  Compass,
  LogOut,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getInitials } from "@/utils/user-utils";
import { type ReactNode, useCallback, useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWelcomeTour } from "@/components/onboarding/WelcomeTourContext";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useSwipeToDismiss } from "@/hooks/useSwipeToDismiss";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AccountMenuEntry {
  key: string;
  icon: LucideIcon;
  iconClassName?: string;
  label: string;
  badge?: ReactNode;
  to?: string;
  onClick?: () => void;
  itemClassName?: string;
}

const rowInner = (entry: AccountMenuEntry) => (
  <>
    <span className="flex min-w-0 items-center gap-2">
      <entry.icon className={cn("h-4 w-4 shrink-0", entry.iconClassName)} aria-hidden />
      <span className="truncate">{entry.label}</span>
    </span>
    {entry.badge}
  </>
);

/**
 * `variant="sheet"` is for the copy of this menu that lives inside the
 * mobile dock's "More" sheet, beside the appearance toggle.
 *
 * That trigger sits low on the screen already, and Radix's dropdown flips
 * upward when there isn't room below — which for a trigger that low landed
 * the menu mid-screen, well outside where a thumb holding the phone one-handed
 * can reach. A bottom sheet has no such problem: it always resolves to the
 * same edge, however little room is left under the trigger, and it can be
 * dragged shut the same way the Alerts and More sheets already are.
 *
 * The header's own copy of this menu keeps the dropdown — its trigger is
 * already at the top of the screen, so there's nothing to fix there, and a
 * dropdown is the right shape for a mouse-and-keyboard desktop visitor.
 */
const NavbarProfileMenu = ({ variant = "dropdown" }: { variant?: "dropdown" | "sheet" }) => {
  const { user, profile, signOut, loading, isAdmin } = useAuth();
  const { openTour } = useWelcomeTour();
  const { isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [isRealMentor, setIsRealMentor] = useState(false);
  const [mentorSlug, setMentorSlug] = useState<string | null>(null);
  const [checkingMentorStatus, setCheckingMentorStatus] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isHighlightingInstall, setIsHighlightingInstall] = useState(false);
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => {
    setMenuOpen(false);
    setIsHighlightingInstall(false);
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
  }, []);

  const swipe = useSwipeToDismiss(close);

  useEffect(() => {
    const handleHighlight = () => {
      setMenuOpen(true);
      setIsHighlightingInstall(true);

      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }

      autoCloseTimerRef.current = setTimeout(() => {
        setIsHighlightingInstall(false);
        setMenuOpen(false);
      }, 4500);
    };

    window.addEventListener("fl:highlight-pwa-install", handleHighlight);
    return () => {
      window.removeEventListener("fl:highlight-pwa-install", handleHighlight);
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    checkMentorStatus();
  }, [user, profile]);

  const checkMentorStatus = async () => {
    if (!user) {
      setCheckingMentorStatus(false);
      return;
    }

    try {
      // maybeSingle, not single: a student simply has no mentors row, and
      // single() turns that ordinary case into a 406 plus a console error on
      // every page load — noise that buries real failures in the API log.
      const { data, error } = await supabase
        .from('mentors')
        .select('department, slug')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking mentor status:', error);
        setIsRealMentor(false);
        setMentorSlug(null);
      } else {
        // Only consider as real mentor if not in General department and department exists
        const isApprovedMentor = data &&
          data.department &&
          data.department !== 'General' &&
          data.department.trim() !== '';

        setIsRealMentor(Boolean(isApprovedMentor));
        setMentorSlug(data?.slug || null);
      }
    } catch (error) {
      console.error('Error checking mentor status:', error);
      setIsRealMentor(false);
      setMentorSlug(null);
    } finally {
      setCheckingMentorStatus(false);
    }
  };

  if (loading || checkingMentorStatus) return null;
  if (!user) return null;

  const handleInstallClick = async () => {
    close();
    if (isIOS) {
      toast.info("On iPhone/iPad: Tap Safari's Share button (⎋) → 'Add to Home Screen'");
    } else {
      const accepted = await promptInstall();
      if (accepted) {
        toast.success("App installed!");
      } else {
        toast.info("Look for the install icon (⊕) in your browser address bar or menu (⋮) → 'Install Friendly Learning'");
      }
    }
  };

  const primaryEntries: AccountMenuEntry[] = [
    isRealMentor
      ? { key: "public-profile", icon: User, label: "My Public Profile", to: `/mentor/${mentorSlug || user.id}` }
      : {
          key: "setup-profile",
          icon: Sparkles,
          label: "Set Up Public Profile",
          to: "/profile/setup",
          itemClassName: "text-primary focus:text-primary font-medium",
          badge: (
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">
              10s
            </span>
          ),
        },
    { key: "attendance", icon: CalendarCheck2, iconClassName: "text-primary", label: "Attendance", to: "/attendance" },
    { key: "settings", icon: Settings, label: "Account Settings", to: "/profile" },
    ...(isAdmin
      ? [
          {
            key: "admin",
            icon: ShieldCheck,
            label: "Admin Dashboard",
            to: "/admin",
            itemClassName: "text-violet-600 dark:text-violet-400 focus:text-violet-600",
          } satisfies AccountMenuEntry,
        ]
      : []),
    ...(isRealMentor
      ? [
          {
            key: "certificate",
            icon: Award,
            iconClassName: "text-amber-500",
            label: "My Certificate",
            to: "/certificate",
          } satisfies AccountMenuEntry,
        ]
      : []),
    ...(!isInstalled
      ? [
          {
            key: "install",
            icon: Smartphone,
            label: "Install Friendly Learning",
            onClick: handleInstallClick,
            itemClassName: cn(
              "text-primary focus:text-primary font-medium transition-all duration-300",
              isHighlightingInstall && "bg-primary/15 ring-1 ring-primary/40 font-semibold rounded-md animate-pulse",
            ),
            badge: isHighlightingInstall ? (
              <span className="text-[10px] bg-primary text-primary-foreground font-semibold px-1.5 py-0.5 rounded-full shadow-xs">
                Here!
              </span>
            ) : undefined,
          } satisfies AccountMenuEntry,
        ]
      : []),
    { key: "tour", icon: Compass, label: "Take the tour", onClick: () => { close(); openTour(); } },
  ];

  const signOutEntry: AccountMenuEntry = {
    key: "sign-out",
    icon: LogOut,
    label: "Sign out",
    onClick: () => { close(); signOut(); },
    itemClassName: "text-red-500 focus:text-red-500",
  };

  const trigger = (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "rounded-full p-0 h-10 w-10 transition-all duration-300",
        isHighlightingInstall && "ring-2 ring-primary ring-offset-2 ring-offset-background animate-pulse"
      )}
    >
      <Avatar>
        <AvatarImage src={profile?.profile_image} />
        <AvatarFallback>{getInitials(profile?.name)}</AvatarFallback>
      </Avatar>
    </Button>
  );

  if (variant === "sheet") {
    const sheetRowClass =
      "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm text-left hover:bg-muted transition-colors";

    return (
      <Sheet open={menuOpen} onOpenChange={(next) => (next ? setMenuOpen(true) : close())}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent
          side="bottom"
          ref={swipe.scrollerRef}
          style={swipe.style}
          {...swipe.handlers}
          className="rounded-t-3xl max-h-[85vh] overflow-y-auto overscroll-contain p-0 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] border-t border-border/80 bg-background/95 backdrop-blur-xl"
        >
          <div className="sticky top-0 z-10 flex flex-col items-center pt-3 pb-2 bg-background/95 backdrop-blur">
            <div className="h-1.5 w-12 rounded-full bg-muted-foreground/25 mb-2" />
            <div className="flex w-full items-center justify-between px-5">
              <div className="min-w-0">
                <SheetTitle className="truncate text-base font-semibold">
                  {profile?.name || "My Account"}
                </SheetTitle>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
              <SheetClose className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </SheetClose>
            </div>
          </div>

          <div className="px-3 pb-2 pt-1 space-y-0.5">
            {primaryEntries.map((entry) =>
              entry.to ? (
                <Link
                  key={entry.key}
                  to={entry.to}
                  onClick={close}
                  className={cn(sheetRowClass, entry.itemClassName)}
                >
                  {rowInner(entry)}
                </Link>
              ) : (
                <button
                  key={entry.key}
                  type="button"
                  onClick={entry.onClick}
                  className={cn(sheetRowClass, entry.itemClassName)}
                >
                  {rowInner(entry)}
                </button>
              ),
            )}
          </div>

          <div className="border-t border-border/60 px-3 py-2">
            <button
              type="button"
              onClick={signOutEntry.onClick}
              className={cn(sheetRowClass, signOutEntry.itemClassName)}
            >
              {rowInner(signOutEntry)}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <DropdownMenu
      open={menuOpen}
      onOpenChange={(next) => (next ? setMenuOpen(true) : close())}
    >
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <div className="font-semibold text-sm truncate">{profile?.name || 'My Account'}</div>
          <div className="text-[11px] text-muted-foreground font-normal truncate">{user.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {primaryEntries.map((entry) => (
          <DropdownMenuItem
            key={entry.key}
            asChild={Boolean(entry.to)}
            onClick={entry.to ? undefined : entry.onClick}
            className={cn("cursor-pointer flex items-center gap-2", entry.itemClassName)}
          >
            {entry.to ? (
              <Link to={entry.to} onClick={close} className="flex w-full items-center justify-between">
                {rowInner(entry)}
              </Link>
            ) : (
              <span className="flex w-full items-center justify-between">{rowInner(entry)}</span>
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={signOutEntry.onClick}
          className={cn("cursor-pointer flex items-center gap-2", signOutEntry.itemClassName)}
        >
          {rowInner(signOutEntry)}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NavbarProfileMenu;
