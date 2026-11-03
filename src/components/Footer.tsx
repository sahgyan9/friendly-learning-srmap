
import React from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo";

const Footer = () => {
  return (
    <footer className="py-8 bg-background border-t border-border">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <Link to="/" className="flex items-center">
              <Logo showText={true} />
            </Link>
            <p className="mt-2 text-sm text-muted-foreground">
              Mentors, faculty and teammates for SRM AP students.
            </p>
          </div>

          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link to="/about" className="text-muted-foreground transition-colors duration-150 hover:text-foreground">
              About
            </Link>
            <Link to="/contact" className="text-muted-foreground transition-colors duration-150 hover:text-foreground">
              Contact
            </Link>
            <Link to="/mentors" className="text-muted-foreground transition-colors duration-150 hover:text-foreground">
              Mentors
            </Link>
            <Link to="/how-verification-works" className="text-muted-foreground transition-colors duration-150 hover:text-foreground">
              How verification works
            </Link>
            <Link to="/srm-ap-student-portal" className="text-muted-foreground transition-colors duration-150 hover:text-foreground">
              SRM AP Student Portal
            </Link>
            <Link to="/your-data" className="text-muted-foreground transition-colors duration-150 hover:text-foreground">
              Your data
            </Link>
          </nav>
        </div>

        <div className="mt-8 space-y-1 border-t border-border pt-6 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Friendly Learning SRMAP. All rights reserved.</p>
          {/* Product red line: SRM University-AP is a location in this copy, never an
              issuer or endorser. Same wording as the SRM portal import dialog
              (src/components/profile/ImportSrmPortal.tsx) so it reads consistently
              wherever it appears. */}
          <p>Independent student project — not affiliated with or endorsed by SRM University AP.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
