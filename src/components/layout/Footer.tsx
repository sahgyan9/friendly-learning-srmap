
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="py-8 bg-white border-t border-gray-200">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <Link to="/" className="text-xl font-bold text-primary tracking-tight flex items-center">
              <span className="mr-1">Friendly</span>
              <span className="text-gray-700">Learning</span>
            </Link>
            <p className="text-sm text-muted-foreground mt-1">
              Connecting students with mentors at SRM AP
            </p>
          </div>
          
          <div className="flex space-x-6">
            <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">
              About
            </Link>
            <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">
              Terms
            </Link>
            <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">
              Contact
            </Link>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Friendly Learning. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
