import { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import AdminLayout from "./AdminLayout";
import { Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface AdminPageWrapperProps {
  children: ReactNode;
  loading?: boolean;
}

/**
 * A wrapper component for admin pages that handles loading states
 * and provides consistent layout.
 * 
 * This component should be used with ProtectedRoute in App.tsx
 * to ensure proper authentication and authorization.
 */
const AdminPageWrapper = ({ children, loading = false }: AdminPageWrapperProps) => {
  const { loading: authLoading } = useAuth();
  
  const isLoading = loading || authLoading;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-6">
            <motion.div
              animate={{
                rotate: 360,
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear",
              }}
              className="relative"
            >
              <Loader2 className="h-12 w-12 text-purple-600 dark:text-purple-400" />
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute inset-0"
              >
                <Sparkles className="h-12 w-12 text-pink-600 dark:text-pink-400" />
              </motion.div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                Loading...
              </p>
            </motion.div>
            
            <motion.div
              className="flex gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </motion.div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {children}
    </AdminLayout>
  );
};

export default AdminPageWrapper;
