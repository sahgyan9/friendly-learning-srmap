
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface PageHeaderProps {
  isPopulating: boolean;
  onPopulateDatabase: () => void;
}

const PageHeader = ({ isPopulating, onPopulateDatabase }: PageHeaderProps) => {
  return (
    <div className="text-center mb-12">
      <h1 className="text-4xl font-bold mb-4">Find Your Mentor</h1>
      <p className="text-muted-foreground max-w-2xl mx-auto">
        Browse our extensive list of qualified mentors or use the search to find 
        someone with the specific skills you need.
      </p>
      
      <div className="mt-4">
        <Button 
          onClick={onPopulateDatabase}
          variant="outline"
          disabled={isPopulating}
          className="flex items-center gap-2"
        >
          {isPopulating && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPopulating ? "Populating Database..." : "Populate Mentor Database"}
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          Click to add sample mentors to the database for AI Search
        </p>
      </div>
    </div>
  );
};

export default PageHeader;
