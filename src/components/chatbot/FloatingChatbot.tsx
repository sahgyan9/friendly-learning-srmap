
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import ChatbotModal from "./ChatbotModal";

const FloatingChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <motion.div
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-4 lg:bottom-6 lg:right-6 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Button
            onClick={() => setIsOpen(true)}
            // blue-600 rather than blue-500: white on blue-500 is 3.68:1,
            // under the 4.5:1 needed for text this size.
            className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            size="icon"
          >
            <span className="font-bold text-sm">AI</span>
          </Button>
        </motion.div>
      </motion.div>

      <ChatbotModal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </>
  );
};

export default FloatingChatbot;
