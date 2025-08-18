
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getMentorVerification } from "@/integrations/supabase/services/mentor-verification";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { UserPlus, Eye, Edit, CheckCircle } from "lucide-react";

interface SmartBecomeMentorButtonProps {
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

const SmartBecomeMentorButton = ({ className, variant = "default", size = "default" }: SmartBecomeMentorButtonProps) => {
  const { user, isMentor } = useAuth();
  const navigate = useNavigate();
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkApplicationStatus();
    } else {
      setLoading(false);
    }
  }, [user]);

  const checkApplicationStatus = async () => {
    try {
      const { data } = await getMentorVerification(user.id);
      setApplicationStatus(data?.status || null);
    } catch (error) {
      console.error('Error checking application status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    if (!user) {
      navigate('/signin');
      return;
    }

    if (applicationStatus === 'rejected') {
      navigate('/become-mentor?edit=true');
    } else {
      navigate('/become-mentor');
    }
  };

  const getButtonContent = () => {
    if (loading) {
      return {
        icon: <UserPlus className="h-4 w-4 mr-2" />,
        text: "Loading...",
        disabled: true
      };
    }

    if (!user) {
      return {
        icon: <UserPlus className="h-4 w-4 mr-2" />,
        text: "Become a Mentor",
        disabled: false
      };
    }

    if (isMentor && applicationStatus === 'approved') {
      return {
        icon: <CheckCircle className="h-4 w-4 mr-2" />,
        text: "View Mentor Profile",
        disabled: false
      };
    }

    switch (applicationStatus) {
      case 'pending':
        return {
          icon: <Eye className="h-4 w-4 mr-2" />,
          text: "View Application Status",
          disabled: false
        };
      case 'approved':
        return {
          icon: <CheckCircle className="h-4 w-4 mr-2" />,
          text: "View Mentor Profile",
          disabled: false
        };
      case 'rejected':
        return {
          icon: <Edit className="h-4 w-4 mr-2" />,
          text: "Edit Application",
          disabled: false
        };
      default:
        return {
          icon: <UserPlus className="h-4 w-4 mr-2" />,
          text: "Become a Mentor",
          disabled: false
        };
    }
  };

  const buttonContent = getButtonContent();

  return (
    <Button
      onClick={handleClick}
      disabled={buttonContent.disabled}
      className={className}
      variant={variant}
      size={size}
    >
      {buttonContent.icon}
      {buttonContent.text}
    </Button>
  );
};

export default SmartBecomeMentorButton;
