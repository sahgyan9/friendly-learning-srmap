
import { useState } from "react";
import { Search, Loader2, Check, UserPlus, Sparkles } from "lucide-react";
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
import { motion, AnimatePresence } from "framer-motion";

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
      toast.error("Error", {
        description: "Failed to search for users",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSetAdmin = async (userId: string) => {
    try {
      setProcessingUser(userId);
      await setUserAsAdmin(userId);
      toast.success("Success", {
        description: "User has been granted admin privileges",
      });
      onUserAdded();
      setSearchResults([]);
      setSearchEmail("");
    } catch (error) {
      console.error("Error setting user as admin:", error);
      toast.error("Error", {
        description: "Failed to grant admin privileges",
      });
    } finally {
      setProcessingUser(null);
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search by email..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            className="pl-10 bg-background border-input focus-visible:ring-2 focus-visible:ring-primary transition-all"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={handleSearch}
            disabled={isSearching}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all"
          >
            {isSearching ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="h-4 w-4" />
              </motion.div>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Search
              </>
            )}
          </Button>
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        {searchResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="border rounded-xl overflow-hidden border-border bg-card/50"
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold text-foreground">User</TableHead>
                  <TableHead className="font-semibold text-foreground">Email</TableHead>
                  <TableHead className="text-right font-semibold text-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchResults.map((user, index) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                            <AvatarImage
                              src={user.profile_image || ""}
                              alt={user.name}
                            />
                            <AvatarFallback className="bg-primary/10 text-primary font-medium">
                              {user.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                        </motion.div>
                        <span className="font-medium text-foreground">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell className="text-right">
                      {user.is_admin ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white shadow-sm"
                        >
                          <Check className="h-4 w-4" />
                          <span className="text-sm font-medium">Admin</span>
                          <Sparkles className="h-3 w-3" />
                        </motion.div>
                      ) : (
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleSetAdmin(user.id)}
                            disabled={processingUser === user.id}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all"
                          >
                            {processingUser === user.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <UserPlus className="h-4 w-4 mr-1" />
                                Make Admin
                              </>
                            )}
                          </Button>
                        </motion.div>
                      )}
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </motion.div>
        )}

        {searchEmail && !isSearching && searchResults.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="text-center py-12 bg-card/50 rounded-xl border border-border"
          >
            <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              No users found matching "<span className="font-semibold text-primary">{searchEmail}</span>"
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserSearchForm;
