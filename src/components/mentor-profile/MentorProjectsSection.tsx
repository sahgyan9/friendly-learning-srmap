import { motion } from "framer-motion";
import { FolderGit2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EnhancedMentor } from "@/utils/mentor-enhancements";

interface MentorProjectsSectionProps {
  mentor: EnhancedMentor;
}

export default function MentorProjectsSection({ mentor }: MentorProjectsSectionProps) {
  if (!mentor.projects || mentor.projects.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
          <FolderGit2 className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Featured Projects</h2>
          <p className="text-xs text-muted-foreground">Portfolio builds and code repositories</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
        {mentor.projects.map((proj) => (
          <div
            key={proj.id}
            className="flex flex-col justify-between rounded-xl border border-border/60 bg-background/60 p-4 hover:border-blue-500/40 hover:shadow-md transition-all group"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                  {proj.title}
                </h3>
                {proj.link && (
                  <a
                    href={proj.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                {proj.description}
              </p>
            </div>

            {proj.tags && proj.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-3 border-t border-border/40 mt-3">
                {proj.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-[10px] px-1.5 py-0.5 bg-muted/30 text-muted-foreground border-border/50"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
