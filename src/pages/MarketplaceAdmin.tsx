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
  MarketplacePost 
} from '@/integrations/supabase/services/marketplace';
import { useToast } from '@/components/ui/use-toast';
import { Edit, Trash2, Plus, Loader2, Eye } from 'lucide-react';
import MarketplacePostForm from '@/components/marketplace/MarketplacePostForm';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminHeader from '@/components/admin/AdminHeader';

const MarketplaceAdmin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [posts, setPosts] = useState<MarketplacePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<MarketplacePost | undefined>(undefined);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

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
      toast({
        title: 'Error',
        description: 'Failed to load marketplace posts',
        variant: 'destructive',
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
      toast({
        title: 'Success',
        description: 'Post deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete post',
        variant: 'destructive',
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
    navigate(`/marketplace?post=${id}`);
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

  return (
    <AdminLayout>
      <AdminHeader 
        title="Marketplace Management"
        description="Create and manage marketplace posts"
        action={
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Post
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">No posts found</p>
          <p className="text-sm text-muted-foreground mt-2">
            Click the "Add New Post" button to create your first marketplace post
          </p>
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
                      onClick={() => handleView(post.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(post)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(post.id)}
                      disabled={isDeleting === post.id}
                    >
                      {isDeleting === post.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
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
