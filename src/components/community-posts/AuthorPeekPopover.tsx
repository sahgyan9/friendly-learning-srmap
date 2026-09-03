import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { BadgeCheck, MessageSquare, UserCheck, GraduationCap } from 'lucide-react';
import { getInitials } from '@/utils/user-utils';
import type { CommunityPost } from '@/integrations/supabase/services/community-posts';

interface AuthorPeekPopoverProps {
  author: CommunityPost['author'];
  children: React.ReactNode;
  onMessageClick?: () => void;
}

export function AuthorPeekPopover({ author, children, onMessageClick }: AuthorPeekPopoverProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleMessage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
    if (onMessageClick) {
      onMessageClick();
    } else {
      navigate(`/messages?mentor=${author.id}`);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        {children}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        className="w-72 p-4 shadow-xl border-border/80 rounded-2xl z-50 bg-popover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-primary/20 shrink-0">
              <AvatarImage src={author.profile_image ?? undefined} alt={author.name} />
              <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                {getInitials(author.name)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="font-bold text-sm truncate text-foreground">
                  {author.name}
                </span>
                {author.is_mentor && (
                  <BadgeCheck className="h-4 w-4 text-primary shrink-0" />
                )}
              </div>

              <p className="text-2xs text-muted-foreground truncate">
                {author.department || (author.is_mentor ? "Verified Mentor" : "SRM AP Student")}
              </p>

              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-3xs font-medium text-muted-foreground">
                {author.is_mentor ? (
                  <>
                    <GraduationCap className="h-3 w-3 text-primary" />
                    <span>Senior Mentor</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    <span>SRM AP Student</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              onClick={handleMessage}
              className="flex-1 gap-1.5 h-8 text-xs font-semibold shadow-xs"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Message</span>
            </Button>

            {author.is_mentor && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium hover:bg-muted"
                onClick={() => setOpen(false)}
              >
                <Link to={`/mentor/${author.id}`}>
                  Profile
                </Link>
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
