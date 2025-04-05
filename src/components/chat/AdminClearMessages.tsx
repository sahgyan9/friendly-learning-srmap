
import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface AdminClearMessagesProps {
  onSuccess?: () => void;
}

const AdminClearMessages = ({ onSuccess }: AdminClearMessagesProps) => {
  const [isClearing, setIsClearing] = useState(false);
  
  const handleClearMessages = async () => {
    if (!confirm("Are you sure you want to delete ALL messages? This action cannot be undone.")) {
      return;
    }
    
    setIsClearing(true);
    try {
      // Using a type assertion to tell TypeScript that this is a valid RPC function
      const { error } = await supabase.rpc('delete_all_messages' as any);
      
      if (error) {
        console.error("Error clearing messages:", error);
        toast.error("Failed to clear messages");
        return;
      }
      
      console.log("Messages cleared successfully");
      toast.success("All messages have been cleared");
      
      // Call the success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error("Exception clearing messages:", err);
      toast.error("An error occurred while clearing messages");
    } finally {
      setIsClearing(false);
    }
  };
  
  return (
    <Button 
      variant="destructive"
      onClick={handleClearMessages}
      disabled={isClearing}
      className="flex items-center gap-2"
    >
      {isClearing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
      Clear All Messages
    </Button>
  );
};

export default AdminClearMessages;
