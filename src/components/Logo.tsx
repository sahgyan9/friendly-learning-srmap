
import React from 'react';
import { motion } from 'framer-motion';

interface LogoProps {
  className?: string;
  showText?: boolean;
  textColor?: string;
}

const Logo = ({ className = "", showText = true, textColor = "text-gray-700" }: LogoProps) => {
  return (
    <motion.div
      className={`flex items-center ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="relative h-8 w-10 md:h-9 md:w-12"
        whileHover={{ rotate: 5, scale: 1.05 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <img
          src="/lovable-uploads/df76e963-f250-4f25-8f7b-3917f857fe63.png"
          alt="Friendly Learning - SRM AP Student Mentorship Platform Logo"
          className="h-full w-auto object-contain"
          loading="eager"
          width="48"
          height="36"
        />
      </motion.div>

      {showText && (
        <motion.div
          className="ml-1 flex items-center"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <span className="text-xl font-bold text-primary tracking-tight">Friendly</span>
          <span className={`text-xl font-bold ${textColor} tracking-tight`}>Learning</span>
          <span className="text-sm font-medium text-primary ml-1 tracking-tight">SRMAP</span>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Logo;
