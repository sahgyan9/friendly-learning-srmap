
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldOff } from "lucide-react";

const Unauthorized = () => {
  return (
    <div className="min-h-screen bg-background">

      <div className="container px-4 md:px-6 pt-24 pb-16">
        <div className="max-w-md mx-auto text-center py-12">
          <div className="bg-card p-8 rounded-xl shadow-sm border">
            <div className="inline-block p-4 bg-destructive/10 rounded-full mb-4">
              <ShieldOff className="h-8 w-8 text-destructive" />
            </div>
            
            <h1 className="text-2xl font-bold mb-3">Access Denied</h1>
            
            <p className="text-muted-foreground mb-6">
              You don't have permission to access this page. Please contact an administrator if you believe this is an error.
            </p>
            
            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link to="/">Go to Home</Link>
              </Button>
              
              <Button variant="outline" asChild className="w-full">
                <Link to="/contact">Contact Support</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
