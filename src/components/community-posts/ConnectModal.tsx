import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BadgeCheck, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { getInitials } from '@/utils/user-utils';
import { getOrCreateConversation } from '@/integrations/supabase/services/chat/conversation.service';
import { sendMessage } from '@/integrations/supabase/services/chat/message.service';
import type { CommunityPost } from '@/integrations/supabase/services/community-posts';

interface ConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: CommunityPost;
}

function getDefaultIcebreaker(post: CommunityPost): string {
  const firstName = post.author.name.trim().split(/\s+/)[0] || 'there';
  if (post.post_type === 'hackathon') {
    return `Hey ${firstName}! Saw your post regarding "${post.title}". I'd love to join your hackathon team — here's what I work on: `;
  }
  if (post.post_type === 'study-help') {
    return `Hey ${firstName}! Saw your post asking about "${post.title}". I'm taking this course too / happy to study together!`;
  }
  if (post.post_type === 'project') {
    return `Hey ${firstName}! Interested in collaborating on your project "${post.title}". Let's connect!`;
  }
  return `Hey ${firstName}! Saw your post "${post.title}" on the campus feed. Would love to connect!`;
}

export function ConnectModal({ open, onOpenChange, post }: ConnectModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [message, setMessage] = useState(() => getDefaultIcebreaker(post));
  const [isSending, setIsSending] = useState(false);

  // Reset icebreaker whenever opened for a different post
  useEffect(() => {
    if (open) {
      setMessage(getDefaultIcebreaker(post));
      setIsSending(false);
    }
  }, [open, post]);

  const handleSend = async () => {
    if (!user) {
      toast.info('Please sign in to message this student');
      navigate('/signin', { state: { from: location } });
      return;
    }

    if (user.id === post.author.id) {
      toast.error('You cannot message yourself');
      return;
    }

    const trimmed = message.trim();
    if (!trimmed) {
      toast.error('Please enter a message');
      return;
    }

    setIsSending(true);
    try {
      const { data: conversation, error: convError } = await getOrCreateConversation(
        user.id,
        post.author.id
      );

      if (convError || !conversation) {
        console.error('Error getting/creating conversation:', convError);
        toast.error('Failed to start conversation. Please try again.');
        return;
      }

      const { error: sendError } = await sendMessage(
        conversation.id,
        user.id,
        post.author.id,
        trimmed
      );

      if (sendError) {
        console.error('Error sending message:', sendError);
        toast.error('Failed to send message. Opening conversation anyway...');
      } else {
        toast.success('Message sent! Opening chat...');
      }

      onOpenChange(false);
      navigate(`/messages/${conversation.id}`);
    } catch (err) {
      console.error('Unexpected error in ConnectModal:', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const isCollaborative =
    post.post_type === 'hackathon' ||
    post.post_type === 'project' ||
    post.post_type === 'study-help';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-2">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <span>{isCollaborative ? 'Team Up with' : 'Connect with'} {post.author.name}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Starts a private direct message thread on Friendly Learning.
          </DialogDescription>
        </DialogHeader>

        {/* Author preview banner */}
        <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/40 p-3">
          <Avatar className="h-11 w-11 ring-1 ring-border shrink-0">
            <AvatarImage src={post.author.profile_image ?? undefined} alt={post.author.name} />
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {getInitials(post.author.name)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm truncate text-foreground">
                {post.author.name}
              </span>
              {post.author.is_mentor && (
                <BadgeCheck className="h-4 w-4 text-primary shrink-0" />
              )}
            </div>
            <p className="text-2xs text-muted-foreground truncate">
              {post.author.department || (post.author.is_mentor ? 'Verified Mentor' : 'SRM AP Student')}
            </p>
            <p className="text-3xs text-primary/80 truncate mt-0.5 font-medium">
              Re: &ldquo;{post.title}&rdquo;
            </p>
          </div>
        </div>

        {/* Pre-seeded message textarea */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">
            Your opening message
          </label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="text-sm leading-relaxed resize-none"
            placeholder="Introduce yourself and how you would like to collaborate..."
          />
          <p className="text-3xs text-muted-foreground">
            Feel free to personalize this note before sending.
          </p>
        </div>

        <DialogFooter className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSend}
            disabled={isSending || !message.trim()}
            className="gap-1.5 font-medium shadow-xs"
          >
            {isSending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Sending…</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Send & Open Chat</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
