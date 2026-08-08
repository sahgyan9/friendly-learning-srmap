
import { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { motion } from "framer-motion";

interface AdminCardProps {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

const AdminCard = ({ title, description, children, footer, className }: AdminCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      {/* min-w-0: without it, a wide child (the admin-users table, sized by
          its own nowrap "Remove Admin" button) sets this card's min-content
          width, and a CSS grid track sizes to that instead of the column's
          share of the row — which is what pushed AdminSettings' two-card
          grid past a 360px viewport. */}
      <Card className={`${className} min-w-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-slate-200 dark:border-slate-700 shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden group`}>
        {/* Animated gradient border effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />
        <div className="absolute inset-[1px] bg-white dark:bg-slate-900 rounded-lg" />

        {/* Content */}
        <div className="relative z-10">
          <CardHeader>
            <CardTitle className="text-2xl bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
              {title}
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
          {footer && <CardFooter>{footer}</CardFooter>}
        </div>
      </Card>
    </motion.div>
  );
};

export default AdminCard;
