import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { awardBadge, BadgeType } from "@/integrations/supabase/services/badges";
import { useAuth } from "@/context/AuthContext";
import { AlertCircle, CheckCircle2 } from "lucide-react";

const awardSchema = z.object({
  userQuery: z.string().min(1, "Please enter an email or name to search"),
  badgeTypeId: z.string().min(1, "Badge type is required"),
  notes: z.string().optional(),
});

type AwardFormData = z.infer<typeof awardSchema>;

interface SearchedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  profile_image?: string;
  department?: string;
  is_admin?: boolean;
}

interface BadgeAwardModalProps {
  badgeTypes: BadgeType[];
  onClose: () => void;
  onSuccess: () => void;
}

const BadgeAwardModal = ({ badgeTypes, onClose, onSuccess }: BadgeAwardModalProps) => {
  const [awarding, setAwarding] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchedUser | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const { user } = useAuth();

  const form = useForm<AwardFormData>({
    resolver: zodResolver(awardSchema),
    defaultValues: {
      userQuery: "",
      badgeTypeId: "",
      notes: "",
    },
  });

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      setErrorMessage("");
      
      
      const { getUserByEmail } = await import("@/integrations/supabase/services/admin");
      const users = await getUserByEmail(query.trim());
      
      
      if (users && users.length > 0) {
        // Filter to show mentors and users with both roles first
        const mentorUsers = users.filter(u => u.role === 'mentor' || u.role === 'both');
        const otherUsers = users.filter(u => u.role !== 'mentor' && u.role !== 'both');
        
        setSearchResults([...mentorUsers, ...otherUsers]);
      } else {
        setSearchResults([]);
        setErrorMessage("No users found matching your search");
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setErrorMessage("Failed to search for users. Please try again.");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleUserSelect = (selectedUser: SearchedUser) => {
    setSelectedUser(selectedUser);
    setSearchResults([]);
    setErrorMessage("");
  };

  const onSubmit = async (data: AwardFormData) => {
    if (!selectedUser || !user) {
      setErrorMessage("Please select a user and ensure you are logged in");
      return;
    }

    try {
      setAwarding(true);
      setErrorMessage("");
      setSuccessMessage("");
      

      const result = await awardBadge({
        user_id: selectedUser.id,
        badge_type_id: data.badgeTypeId,
        awarded_by: user.id,
        notes: data.notes || null,
      });

      
      const selectedBadge = badgeTypes.find(b => b.id === data.badgeTypeId);
      setSuccessMessage(`Successfully awarded "${selectedBadge?.name}" badge to ${selectedUser.name}!`);
      
      // Reset form after short delay
      setTimeout(() => {
        onSuccess();
      }, 1500);
      
    } catch (error) {
      console.error('Error awarding badge:', error);
      let errorMsg = "Failed to award badge";
      
      if (error instanceof Error) {
        errorMsg = error.message;
        // Provide more specific error messages based on common issues
        if (error.message.includes('PGRST201')) {
          errorMsg = "Database query error. Please contact support.";
        } else if (error.message.includes('violates row-level security')) {
          errorMsg = "Permission denied. Please ensure you have admin privileges.";
        } else if (error.message.includes('duplicate')) {
          errorMsg = "This user already has this badge.";
        }
      }
      
      setErrorMessage(errorMsg);
    } finally {
      setAwarding(false);
    }
  };

  const handleQueryChange = (value: string) => {
    form.setValue("userQuery", value);
    if (value.length >= 2) {
      searchUsers(value);
    } else {
      setSearchResults([]);
      setSelectedUser(null);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Award Badge</DialogTitle>
        </DialogHeader>

        {errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/40">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-200">{successMessage}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="userQuery"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Search User (by email or name)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter email or name to search"
                      {...field}
                      onChange={(e) => handleQueryChange(e.target.value)}
                      disabled={awarding}
                    />
                  </FormControl>
                  <FormMessage />
                  
                  {searching && (
                    <div className="text-sm text-muted-foreground">Searching...</div>
                  )}
                  
                  {searchResults.length > 0 && (
                    <div className="border rounded-md max-h-48 overflow-y-auto">
                      {searchResults.map((user) => (
                        <div
                          key={user.id}
                          className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                          onClick={() => handleUserSelect(user)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.profile_image || ""} alt={user.name} />
                              <AvatarFallback>
                                {user.name.split(" ").map(n => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <Badge variant={user.role === 'mentor' || user.role === 'both' ? 'default' : 'secondary'}>
                                {user.role}
                              </Badge>
                              {user.is_admin && (
                                <Badge variant="destructive" className="text-xs">Admin</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {selectedUser && (
                    <div className="p-3 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-md">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={selectedUser.profile_image || ""} alt={selectedUser.name} />
                          <AvatarFallback>
                            {selectedUser.name.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-green-800 dark:text-green-200">Selected: {selectedUser.name}</div>
                          <div className="text-sm text-green-600 dark:text-green-400">{selectedUser.email}</div>
                        </div>
                        <Badge variant={selectedUser.role === 'mentor' || selectedUser.role === 'both' ? 'default' : 'secondary'}>
                          {selectedUser.role}
                        </Badge>
                      </div>
                    </div>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="badgeTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Badge Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={awarding}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a badge" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {badgeTypes.map((badge) => (
                        <SelectItem key={badge.id} value={badge.id}>
                          <span className="flex items-center gap-2">
                            <span>{badge.icon}</span>
                            <span>{badge.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {badge.category}
                            </Badge>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Reason for awarding this badge..."
                      {...field}
                      disabled={awarding}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={awarding}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={awarding || !selectedUser || !form.watch("badgeTypeId")}
              >
                {awarding ? "Awarding..." : "Award Badge"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default BadgeAwardModal;
