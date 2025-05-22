
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { isUserAdmin } from "@/integrations/supabase/services/admin";
import { getTeamMembers, TeamMember } from "@/integrations/supabase/services/team-members";
import TeamMemberForm from "@/components/about/TeamMemberForm";
import TeamMembers from "@/components/about/TeamMembers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminCard from "@/components/admin/AdminCard";

const TeamMembersAdmin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  
  useEffect(() => {
    // Check if user is admin and load team members
    const checkAdminAndLoadData = async () => {
      if (!user) {
        navigate('/signin');
        return;
      }
      
      try {
        setIsLoading(true);
        // Check admin status
        const adminStatus = await isUserAdmin(user.id);
        setIsAdmin(adminStatus);
        
        if (!adminStatus) {
          navigate('/unauthorized');
          toast({
            title: "Access Denied",
            description: "You don't have permission to access this page.",
            variant: "destructive",
          });
          return;
        }
        
        // Load team members
        const { data, error } = await getTeamMembers();
        if (error) {
          throw error;
        }
        
        if (data) {
          setTeamMembers(data);
        }
      } catch (error) {
        console.error("Error loading admin data:", error);
        toast({
          title: "Error",
          description: "Failed to load team members data.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAdminAndLoadData();
  }, [user, navigate, toast]);
  
  const handleAddMember = () => {
    setEditingMember(null);
    setShowAddMemberForm(true);
  };
  
  const handleEditMember = (member: TeamMember) => {
    setEditingMember(member);
    setShowAddMemberForm(true);
  };
  
  const handleFormClose = () => {
    setShowAddMemberForm(false);
    setEditingMember(null);
  };
  
  const handleMemberUpdated = () => {
    // Reload team members after update
    const loadMembers = async () => {
      try {
        const { data, error } = await getTeamMembers();
        if (error) {
          throw error;
        }
        
        if (data) {
          setTeamMembers(data);
        }
      } catch (error) {
        console.error("Error reloading team members:", error);
        toast({
          title: "Error",
          description: "Failed to reload team members.",
          variant: "destructive",
        });
      }
    };
    
    loadMembers();
    setShowAddMemberForm(false);
    setEditingMember(null);
  };
  
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">Loading team members...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }
  
  return (
    <AdminLayout>
      <AdminHeader
        title="Team Members Management"
        description="Manage team members shown on the about page"
        action={
          <Button onClick={handleAddMember}>
            <Plus className="mr-2 h-4 w-4" />
            Add Team Member
          </Button>
        }
      />
      
      <AdminCard
        title="Current Team Members"
        description="Team members currently displayed on the about page"
      >
        {teamMembers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No team members found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add your first team member using the button above
            </p>
          </div>
        ) : (
          <TeamMembers 
            teamMembers={teamMembers} 
            isAdmin={true} 
            onEdit={handleEditMember} 
            onMembersUpdated={handleMemberUpdated}
          />
        )}
      </AdminCard>
      
      <Dialog open={showAddMemberForm} onOpenChange={setShowAddMemberForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMember ? "Edit Team Member" : "Add Team Member"}
            </DialogTitle>
            <DialogDescription>
              {editingMember
                ? "Update team member information"
                : "Add a new team member to the about page"}
            </DialogDescription>
          </DialogHeader>
          <TeamMemberForm
            member={editingMember}
            onComplete={handleMemberUpdated}
          />
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default TeamMembersAdmin;
