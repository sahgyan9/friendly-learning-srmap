
import { useState } from "react";
import { Shield } from "lucide-react";
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
import { toast } from "sonner";
import { removeAdminPrivilege } from "@/integrations/supabase/services/admin";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "@/components/ui/alert-dialog";

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

  const handleRemoveAdmin = async (userId: string) => {
    try {
      setProcessingUser(userId);
      await removeAdminPrivilege(userId);
      toast.success("Admin access removed");
      onUserRemoved();
    } catch (error) {
      console.error("Error removing admin privileges:", error);
      toast.error("Could not remove admin access", {
        description: "The change was not saved. Try again.",
      });
    } finally {
      setProcessingUser(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2" role="status" aria-label="Loading admins">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    );
  }

  if (adminUsers.length === 0) {
    return (
      <div className="py-10 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
          <Shield className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="font-medium text-foreground">No admins</p>
        <p className="mt-1 text-sm text-muted-foreground">Add one with the search form.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {adminUsers.map((admin) => (
            <TableRow key={admin.id}>
              <TableCell>
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={admin.profile_image || ""} alt={admin.name} />
                    <AvatarFallback className="bg-secondary text-xs text-secondary-foreground">
                      {admin.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate font-medium text-foreground">{admin.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{admin.email}</TableCell>
              <TableCell className="text-right">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      isLoading={processingUser === admin.id}
                    >
                      Remove
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove admin access for {admin.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        They will lose access to the admin console immediately. You can add them again later.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleRemoveAdmin(admin.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Remove access
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
  );
};

export default AdminUsersList;
