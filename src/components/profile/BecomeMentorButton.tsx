
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const BecomeMentorButton = () => {
  const navigate = useNavigate();
  
  return (
    <div className="py-4 border-t border-border">
      <p className="text-sm text-muted-foreground mb-3">
        Want to help other students? Apply to become a mentor!
      </p>
      <Button 
        type="button" 
        variant="outline" 
        onClick={() => navigate('/become-mentor')}
      >
        Become a Mentor
      </Button>
    </div>
  );
};

export default BecomeMentorButton;
