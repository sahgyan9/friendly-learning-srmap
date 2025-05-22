
import { useState } from "react";
import { Search, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { setUserAsAdmin } from "@/integrations/supabase/services/admin";

interface User {
  id: string;
  name: string;
  email: string;
  profile_image?: string;
  is_admin?: boolean;
}

interface UserSearchFormProps {
  onUserAdded: () => void;
}

const UserSearchForm = ({ onUserAdded }: UserSearchFormProps) => {
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [processingUser, setProcessingUser] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchEmail.trim()) return;

    try {
      setIsSearching(true);
      setSearchResults([]);
      const { getUserByEmail } = await import("@/integrations/supabase/services/admin");
      const users = await getUserByEmail(searchEmail.trim());
      setSearchResults(users);
    } catch (error) {
      console.error("Error searching for users:", error);
      toast({
        title: "Error",
        description: "Failed to search for users",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSetAdmin = async (userId: string) => {
    try {
      setProcessingUser(userId);
      await setUserAsAdmin(userId);
      toast({
        title: "Success",
        description: "User has been granted admin privileges",
      });
      onUserAdded();
      setSearchResults([]);
      setSearchEmail("");
    } catch (error) {
      console.error("Error setting user as admin:", error);
      toast({
        title: "Error",
        description: "Failed to grant admin privileges",
        variant: "destructive",
      });
    } finally {
      setProcessingUser(null);
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <Input
          placeholder="Search by email..."
          value={searchEmail}
          onChange={(e) => setSearchEmail(e.target.value)}
          className="flex-1"
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Button onClick={handleSearch} disabled={isSearching}>
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>

      {searchResults.length > 0 && (
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
              {searchResults.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={user.profile_image || ""}
                          alt={user.name}
                        />
                        <AvatarFallback>
                          {user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="text-right">
                    {user.is_admin ? (
                      <span className="text-sm text-green-600 flex items-center justify-end">
                        <Check className="h-4 w-4 mr-1" /> Admin
                      </span>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleSetAdmin(user.id)}
                        disabled={processingUser === user.id}
                      >
                        {processingUser === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Make Admin"
                        )}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {searchEmail && !isSearching && searchResults.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No users found matching "{searchEmail}"
        </div>
      )}
    </div>
  );
};

export default UserSearchForm;
