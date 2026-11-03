
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldOff } from "lucide-react";

const Unauthorized = () => {
  return (
    <div className="min-h-screen bg-background">
      <main className="container px-4 py-24 md:px-6 md:py-32">
        <div className="mx-auto max-w-md text-center animate-fade-up">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground">
            <ShieldOff className="h-5 w-5" aria-hidden />
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-foreground">You do not have access to this page</h1>
          <p className="mt-4 text-muted-foreground">
            This page needs a role your account does not have. If you think that is wrong, contact us and say which page you tried to open.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild>
              <Link to="/">Go to the homepage</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/contact">Contact us</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Unauthorized;
