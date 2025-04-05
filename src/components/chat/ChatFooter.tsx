
import React from "react";
import { Link } from "react-router-dom";
import Logo from "../Logo";

const ChatFooter = () => {
  return (
    <footer className="py-8 bg-background border-t border-border">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <Link to="/" className="flex items-center">
              <Logo showText={true} />
            </Link>
            <p className="text-sm text-muted-foreground mt-1">
              Connecting students with mentors at SRM AP
            </p>
          </div>
          
          <div className="flex space-x-6">
            <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">
              About
            </Link>
            <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">
              Contact
            </Link>
            <Link to="/mentors" className="text-muted-foreground hover:text-primary transition-colors">
              Mentors
            </Link>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Friendly Learning. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default ChatFooter;
