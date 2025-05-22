
import { useState } from "react";
import { Loader2, X } from "lucide-react";
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
import { useToast } from "@/components/ui/use-toast";
import { removeAdminPrivilege } from "@/integrations/supabase/services/admin";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  profile_image?: string;
}

interface AdminUsersListProps {
  adminUsers: AdminUser[];
  isLoading: boolean;
  onUserRemoved: () => void;
}

const AdminUsersList = ({ adminUsers, isLoading, onUserRemoved }: AdminUsersListProps) => {
  const [processingUser, setProcessingUser] = useState<string | null>(null);
  const { toast } = useToast();

  const handleRemoveAdmin = async (userId: string) => {
    try {
      setProcessingUser(userId);
      await removeAdminPrivilege(userId);
      toast({
        title: "Success",
        description: "Admin privileges have been revoked",
      });
      onUserRemoved();
    } catch (error) {
      console.error("Error removing admin privileges:", error);
      toast({
        title: "Error",
        description: "Failed to revoke admin privileges",
        variant: "destructive",
      });
    } finally {
      setProcessingUser(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (adminUsers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No admin users found
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {adminUsers.map((admin) => (
            <TableRow key={admin.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={admin.profile_image || ""}
                      alt={admin.name}
                    />
                    <AvatarFallback>
                      {admin.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{admin.name}</span>
                </div>
              </TableCell>
              <TableCell>{admin.email}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRemoveAdmin(admin.id)}
                  disabled={processingUser === admin.id}
                >
                  {processingUser === admin.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Remove Admin"
                  )}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default AdminUsersList;
