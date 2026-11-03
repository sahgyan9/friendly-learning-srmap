import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  fetchMarketplacePosts, 
  deleteMarketplacePost,
  syncSRMAPEvents,
  MarketplacePost 
} from '@/integrations/supabase/services/marketplace';
import { toast } from 'sonner';
import { Edit, Trash2, Plus, Eye, RefreshCw, Inbox } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import MarketplacePostForm from '@/components/marketplace/MarketplacePostForm';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminHeader from '@/components/admin/AdminHeader';

const MarketplaceAdmin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState<MarketplacePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<MarketplacePost | undefined>(undefined);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSyncingEvents, setIsSyncingEvents] = useState(false);

  useEffect(() => {
    // Force redirect if not authenticated
    if (!user) {
      navigate('/signin', { state: { from: '/admin/marketplace' } });
      return;
    }

    loadPosts();
  }, [user, navigate]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await fetchMarketplacePosts();
      setPosts(data);
    } catch (error) {
      console.error('Error loading posts:', error);
      toast.error('Could not load posts', {
        description: 'Refresh the page to try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setSelectedPost(undefined);
    setIsDialogOpen(true);
  };

  const handleEdit = (post: MarketplacePost) => {
    setSelectedPost(post);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(id);
      await deleteMarketplacePost(id);
      setPosts(posts.filter(post => post.id !== id));
      toast.success('Post deleted', {
        description: 'It no longer appears on the events page.',
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Could not delete post', {
        description: 'Try again in a moment.',
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleFormComplete = () => {
    setIsDialogOpen(false);
    loadPosts();
  };

  const handleView = (id: string) => {
    navigate(`/events?post=${id}`);
  };

  const getCategoryDisplay = (category: string) => {
    switch (category) {
      case 'news': return 'University News';
      case 'events': return 'Events';
      case 'ads': return 'Advertisements';
      case 'courses': return 'Course Materials';
      default: return category;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleSyncEvents = async () => {
    try {
      setIsSyncingEvents(true);
      const res = await syncSRMAPEvents();
      toast.success('Events synced', {
        description: `${res.synced} events updated from the SRM AP portal.`,
      });
    } catch (error) {
      console.error('Error syncing events:', error);
      toast.error('Sync failed', {
        description: error instanceof Error ? error.message : 'Failed to sync events from SRMAP.',
      });
    } finally {
      setIsSyncingEvents(false);
    }
  };

  return (
    <AdminLayout>
      <AdminHeader 
        title="Marketplace & Events"
        description="Manage marketplace posts and sync university events"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={handleSyncEvents}
              isLoading={isSyncingEvents}
            >
              {!isSyncingEvents && <RefreshCw className="h-4 w-4" />}
              {isSyncingEvents ? "Syncing" : "Sync events"}
            </Button>
            <Button onClick={handleAddNew}>
              <Plus className="h-4 w-4" />
              New post
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="flex flex-col gap-2 rounded-md border p-4" aria-busy="true" aria-label="Loading posts">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-muted-foreground">
            <Inbox className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">No posts yet</p>
            <p className="text-sm text-muted-foreground">Create a post to list it on the events page.</p>
          </div>
          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4" />
            New post
          </Button>
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium">{post.title}</TableCell>
                  <TableCell>{getCategoryDisplay(post.category)}</TableCell>
                  <TableCell>{post.author}</TableCell>
                  <TableCell>{formatDate(post.date)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`View ${post.title}`}
                      onClick={() => handleView(post.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${post.title}`}
                      onClick={() => handleEdit(post)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${post.title}`}
                          className="text-muted-foreground hover:text-destructive"
                          isLoading={isDeleting === post.id}
                        >
                          {isDeleting !== post.id && <Trash2 className="h-4 w-4" />}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this post?</AlertDialogTitle>
                          <AlertDialogDescription>
                            "{post.title}" will be removed from the events page. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleDelete(post.id)}
                          >
                            Delete post
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AdminLayout>
  );
};

export default MarketplaceAdmin;
