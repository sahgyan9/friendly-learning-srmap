
import React from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo";

const Footer = () => {
  return (
    <footer className="py-8 bg-background border-t border-border">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <Link to="/" className="flex items-center">
              <Logo showText={true} />
            </Link>
            <p className="text-sm text-muted-foreground mt-1">
              <strong className="font-bold">Friendly Learning SRMAP</strong> - Connecting students with mentors at <strong className="font-bold">SRM AP</strong>
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">
              About
            </Link>
            <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">
              Contact
            </Link>
            <Link to="/mentors" className="text-muted-foreground hover:text-primary transition-colors">
              Mentors
            </Link>
            <Link to="/how-verification-works" className="text-muted-foreground hover:text-primary transition-colors">
              How Verification Works
            </Link>
            <Link to="/srm-ap-student-portal" className="text-muted-foreground hover:text-primary transition-colors">
              SRM AP Student Portal
            </Link>
            <Link to="/your-data" className="text-muted-foreground hover:text-primary transition-colors">
              Your Data
            </Link>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground space-y-1">
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
