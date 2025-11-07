
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
import { useToast } from "@/components/ui/use-toast";
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
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
          <Input
            placeholder="Search by email..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            className="pl-10 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={handleSearch}
            disabled={isSearching}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all"
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
            className="border rounded-xl overflow-hidden border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50"
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-950/30 dark:hover:to-pink-950/30">
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-100">User</TableHead>
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-100">Email</TableHead>
                  <TableHead className="text-right font-semibold text-slate-900 dark:text-slate-100">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchResults.map((user, index) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Avatar className="h-10 w-10 ring-2 ring-purple-500/20 dark:ring-purple-400/20">
                            <AvatarImage
                              src={user.profile_image || ""}
                              alt={user.name}
                            />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                              {user.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                        </motion.div>
                        <span className="font-medium text-slate-900 dark:text-slate-100">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-700 dark:text-slate-300">{user.email}</TableCell>
                    <TableCell className="text-right">
                      {user.is_admin ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg"
                        >
                          <Check className="h-4 w-4" />
                          <span className="text-sm font-medium">Admin</span>
                          <motion.div
                            animate={{ rotate: [0, 360] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                          >
                            <Sparkles className="h-3 w-3" />
                          </motion.div>
                        </motion.div>
                      ) : (
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleSetAdmin(user.id)}
                            disabled={processingUser === user.id}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all"
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
            className="text-center py-12 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700"
          >
            <Search className="h-16 w-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
            <p className="text-slate-600 dark:text-slate-400">
              No users found matching "<span className="font-semibold text-purple-600 dark:text-purple-400">{searchEmail}</span>"
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserSearchForm;
