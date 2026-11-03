import { useEffect, useState } from 'react';
import { getTeamMembers, TeamMember } from '@/integrations/supabase/services/team-members';
import { toast } from 'sonner';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Mail } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface TeamMembersProps {
  teamMembers?: TeamMember[];
  isAdmin?: boolean;
  onEdit?: (member: TeamMember) => void;
  onMembersUpdated?: () => void;
}

const TeamMembers = ({ teamMembers, isAdmin, onEdit, onMembersUpdated }: TeamMembersProps) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
        toast.error('Could not load team members.');
      } finally {
        setIsLoading(false);
      }
    };

    loadTeamMembers();
  }, [teamMembers]);

  const heading = (
    <div className="mb-8 max-w-2xl">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">The team</h2>
      <p className="mt-2 text-muted-foreground">The students who build and run Friendly Learning.</p>
    </div>
  );

  if (isLoading) {
    return (
      <section className="border-t border-border py-16" aria-busy="true">
        <div className="container mx-auto max-w-4xl px-4 md:px-6">
          {heading}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (members.length === 0) {
    return (
      <section className="border-t border-border py-16">
        <div className="container mx-auto max-w-4xl px-4 md:px-6">
          {heading}
          <p className="text-sm text-muted-foreground">Team profiles have not been added yet.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="border-t border-border py-16">
      <div className="container mx-auto max-w-4xl px-4 md:px-6">
        {heading}
        <ul className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member, i) => (
            <li
              key={member.id}
              className="flex min-w-0 items-center gap-4 animate-fade-up"
              style={{ animationDelay: `${Math.min(i, 5) * 35}ms` }}
            >
              <Avatar className="h-16 w-16 shrink-0 border border-border">
                <AvatarImage src={member.image_url || ''} alt={member.name} className="object-cover" />
                <AvatarFallback className="bg-secondary text-lg font-medium text-secondary-foreground">
                  {member.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-foreground">{member.name}</h3>
                <p className="truncate text-sm text-muted-foreground">{member.position}</p>
                {member.email && (
                  <a
                    href={`mailto:${member.email}`}
                    className="mt-1 inline-flex max-w-full items-center gap-1.5 text-sm text-primary underline-offset-2 hover:underline"
                  >
                    <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{member.email}</span>
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default TeamMembers;
