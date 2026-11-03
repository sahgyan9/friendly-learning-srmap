
import { useState } from "react";
import { Search, Check, UserPlus } from "lucide-react";
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
import { toast } from "sonner";
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
      toast.error("Search failed", {
        description: "Could not look up users. Try again.",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSetAdmin = async (userId: string) => {
    try {
      setProcessingUser(userId);
      await setUserAsAdmin(userId);
      toast.success("Admin access granted");
      onUserAdded();
      setSearchResults([]);
      setSearchEmail("");
    } catch (error) {
      console.error("Error setting user as admin:", error);
      toast.error("Could not grant admin access", {
        description: "The change was not saved. Try again.",
      });
    } finally {
      setProcessingUser(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="email"
            placeholder="name@srmap.edu.in"
            aria-label="User email"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            className="pl-9"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Button onClick={handleSearch} isLoading={isSearching} disabled={!searchEmail.trim()}>
          Search
        </Button>
      </div>

      {searchResults.length > 0 && (
        <div className="animate-fade-up overflow-hidden rounded-lg border border-border">
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
              {searchResults.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.profile_image || ""} alt={user.name} />
                        <AvatarFallback className="bg-secondary text-xs text-secondary-foreground">
                          {user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate font-medium text-foreground">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell className="text-right">
                    {user.is_admin ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-success" />
                        Already admin
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleSetAdmin(user.id)}
                        isLoading={processingUser === user.id}
                      >
                        {processingUser !== user.id && <UserPlus className="h-4 w-4" />}
                        Make admin
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
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          No user found for <span className="font-medium text-foreground">{searchEmail}</span>. Check
          the spelling, or ask them to sign up first.
        </p>
      )}
    </div>
  );
};

export default UserSearchForm;
