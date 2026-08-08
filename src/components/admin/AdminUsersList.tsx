
import { useState } from "react";
import { Loader2, X, Shield, Crown } from "lucide-react";
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
import { motion, AnimatePresence } from "framer-motion";

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
      toast.success("Success", {
        description: "Admin privileges have been revoked",
      });
      onUserRemoved();
    } catch (error) {
      console.error("Error removing admin privileges:", error);
      toast.error("Error", {
        description: "Failed to revoke admin privileges",
      });
    } finally {
      setProcessingUser(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <motion.div
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <Loader2 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
        </motion.div>
      </div>
    );
  }

  if (adminUsers.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <Shield className="h-16 w-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
        <p className="text-slate-600 dark:text-slate-400">No admin users found</p>
      </motion.div>
    );
  }

  return (
    <div className="border rounded-xl overflow-hidden border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50">
      <Table>
        <TableHeader>
          <TableRow className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-950/30 dark:hover:to-pink-950/30">
            <TableHead className="font-semibold text-slate-900 dark:text-slate-100">User</TableHead>
            <TableHead className="font-semibold text-slate-900 dark:text-slate-100">Email</TableHead>
            <TableHead className="text-right font-semibold text-slate-900 dark:text-slate-100">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <AnimatePresence>
            {adminUsers.map((admin, index) => (
              <motion.tr
                key={admin.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Avatar className="h-10 w-10 ring-2 ring-purple-500/20 dark:ring-purple-400/20">
                        <AvatarImage
                          src={admin.profile_image || ""}
                          alt={admin.name}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                          {admin.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                    </motion.div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-slate-100">{admin.name}</span>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.05 + 0.2 }}
                      >
                        <Crown className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
                      </motion.div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-slate-700 dark:text-slate-300">{admin.email}</TableCell>
                <TableCell className="text-right">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveAdmin(admin.id)}
                      disabled={processingUser === admin.id}
                      className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 shadow-lg hover:shadow-xl transition-all"
                    >
                      {processingUser === admin.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <X className="h-4 w-4 mr-1" />
                          Remove Admin
                        </>
                      )}
                    </Button>
                  </motion.div>
                </TableCell>
              </motion.tr>
            ))}
          </AnimatePresence>
        </TableBody>
      </Table>
    </div>
  );
};

export default AdminUsersList;
