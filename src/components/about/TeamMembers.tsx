import { useEffect, useState } from 'react';
import { getTeamMembers, TeamMember } from '@/integrations/supabase/services/team-members';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Mail } from 'lucide-react';
import { motion } from 'framer-motion';

interface TeamMembersProps {
  teamMembers?: TeamMember[];
  isAdmin?: boolean;
  onEdit?: (member: TeamMember) => void;
  onMembersUpdated?: () => void;
}

const TeamMembers = ({ teamMembers, isAdmin, onEdit, onMembersUpdated }: TeamMembersProps) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // If teamMembers are provided as props, use those
    if (teamMembers) {
      setMembers(teamMembers);
      setIsLoading(false);
      return;
    }

    // Otherwise, load team members from the database
    const loadTeamMembers = async () => {
      try {
        const { data, error } = await getTeamMembers();
        if (error) {
          throw error;
        }
        setMembers(data || []);
      } catch (err) {
        console.error('Error loading team members:', err);
        toast({
          title: 'Error',
          description: 'Failed to load team members.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTeamMembers();
  }, [toast, teamMembers]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { duration: 0.5 }
    }
  };

  if (isLoading) {
    return (
      <div className="py-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold">Our Team</h2>
          <p className="text-muted-foreground mt-2">Loading team members...</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex flex-col items-center">
                <div className="w-32 h-32 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-24 mt-4"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32 mt-2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="py-12">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Our Team</h2>
          <p className="text-muted-foreground mt-2">Our dedicated professionals working to improve education.</p>
        </div>
        <div className="text-center py-16">
          <p className="text-muted-foreground">Team member information will be available soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold">Our Team</h2>
        <p className="text-muted-foreground mt-2">Meet the dedicated professionals behind Friendly Learning.</p>
      </div>
      
      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {members.map((member) => (
          <motion.div key={member.id} variants={itemVariants}>
            <Card className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <Avatar className="w-32 h-32 mb-4">
                  <AvatarImage src={member.image_url || ''} alt={member.name} />
                  <AvatarFallback className="text-2xl bg-primary/10">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                
                <h3 className="text-xl font-semibold">{member.name}</h3>
                <p className="text-muted-foreground mb-2">{member.position}</p>
                
                {member.email && (
                  <div className="flex items-center text-sm mt-2">
                    <Mail className="w-4 h-4 mr-1 text-muted-foreground" />
                    <a href={`mailto:${member.email}`} className="text-primary hover:underline">
                      {member.email}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default TeamMembers;
