
import { useState, useEffect } from "react";
import {
  getTeamMembers,
  deleteTeamMember,
  TeamMember,
} from "@/integrations/supabase/services/team-members";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlusCircle, Edit, Trash2, Loader2 } from "lucide-react";
import TeamMemberForm from "@/components/about/TeamMemberForm";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const TeamMembersAdmin = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { session } = useAuth();

  useEffect(() => {
    // Redirect if not logged in
    if (!session) {
      navigate("/signin", { replace: true });
      toast({
        title: "Authentication required",
        description: "You need to be signed in to access this page",
        variant: "destructive",
      });
      return;
    }
    
    fetchTeamMembers();
  }, [session, navigate, toast]);

  const fetchTeamMembers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await getTeamMembers();
      
      if (error) {
        throw error;
      }
      
      setTeamMembers(data || []);
    } catch (err) {
      console.error("Error fetching team members:", err);
      toast({
        title: "Error",
        description: "Failed to load team members.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (member: TeamMember) => {
    setSelectedMember(member);
    setShowForm(true);
  };

  const handleDelete = (member: TeamMember) => {
    setSelectedMember(member);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedMember) return;
    
    try {
      setIsDeleting(true);
      const { error } = await deleteTeamMember(selectedMember.id);
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Success",
        description: "Team member deleted successfully!",
      });
      
      fetchTeamMembers();
      setShowDeleteDialog(false);
    } catch (err) {
      console.error("Error deleting team member:", err);
      toast({
        title: "Error",
        description: "Failed to delete team member.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFormComplete = () => {
    setShowForm(false);
    setSelectedMember(null);
    fetchTeamMembers();
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container px-4 md:px-6">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Manage Team Members</h1>
            <Button onClick={() => setShowForm(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Team Member
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-lg">
              <h3 className="text-xl font-medium">No team members found</h3>
              <p className="text-muted-foreground mt-2 mb-6">
                Add team members to display them on the about page
              </p>
              <Button onClick={() => setShowForm(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add First Team Member
              </Button>
            </div>
          ) : (
            <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.image_url || ''} alt={member.name} />
                            <AvatarFallback>
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span>{member.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{member.position}</TableCell>
                      <TableCell>{member.email || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(member)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(member)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedMember ? 'Edit Team Member' : 'Add Team Member'}
            </DialogTitle>
            <DialogDescription>
              {selectedMember
                ? 'Update team member information'
                : 'Add a new team member to display on the about page'}
            </DialogDescription>
          </DialogHeader>
          <TeamMemberForm
            member={selectedMember || undefined}
            onComplete={handleFormComplete}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedMember?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default TeamMembersAdmin;
