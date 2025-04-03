
import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { motion } from "framer-motion";

const DarkModeToggle = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  useEffect(() => {
    // Check if user prefers dark mode or has previously set it
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const storedTheme = localStorage.getItem('theme');
    const initialDarkMode = storedTheme === 'dark' || (!storedTheme && prefersDark);
    
    setIsDarkMode(initialDarkMode);
    applyTheme(initialDarkMode);
  }, []);
  
  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    applyTheme(newDarkMode);
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
  };
  
  const applyTheme = (dark: boolean) => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };
  
  return (
    <Toggle 
      pressed={isDarkMode}
      onPressedChange={toggleTheme} 
      className="relative h-10 w-10 rounded-full border border-input bg-background hover:bg-accent hover:text-accent-foreground"
      aria-label="Toggle dark mode"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ 
          scale: 1, 
          opacity: 1,
          rotate: isDarkMode ? 180 : 0,
        }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-center"
      >
        {isDarkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </motion.div>
    </Toggle>
  );
};

export default DarkModeToggle;
