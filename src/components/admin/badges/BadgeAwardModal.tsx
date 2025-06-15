
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
import { awardBadge } from "@/integrations/supabase/services/badges";
import { getUserByEmail } from "@/integrations/supabase/services/admin";
import { useAuth } from "@/context/AuthContext";

const awardSchema = z.object({
  userEmail: z.string().email("Invalid email address"),
  badgeTypeId: z.string().min(1, "Badge type is required"),
  notes: z.string().optional(),
});

type AwardFormData = z.infer<typeof awardSchema>;

interface BadgeAwardModalProps {
  badgeTypes: any[];
  onClose: () => void;
  onSuccess: () => void;
}

const BadgeAwardModal = ({ badgeTypes, onClose, onSuccess }: BadgeAwardModalProps) => {
  const [awarding, setAwarding] = useState(false);
  const [searchedUser, setSearchedUser] = useState(null);
  const { user } = useAuth();

  const form = useForm<AwardFormData>({
    resolver: zodResolver(awardSchema),
    defaultValues: {
      userEmail: "",
      badgeTypeId: "",
      notes: "",
    },
  });

  const searchUser = async (email: string) => {
    if (!email) return;
    try {
      const users = await getUserByEmail(email);
      if (users && users.length > 0) {
        setSearchedUser(users[0]);
      } else {
        setSearchedUser(null);
      }
    } catch (error) {
      console.error('Error searching user:', error);
      setSearchedUser(null);
    }
  };

  const onSubmit = async (data: AwardFormData) => {
    if (!searchedUser || !user) return;

    try {
      setAwarding(true);
      await awardBadge({
        user_id: searchedUser.id,
        badge_type_id: data.badgeTypeId,
        awarded_by: user.id,
        notes: data.notes || null,
      });
      onSuccess();
    } catch (error) {
      console.error('Error awarding badge:', error);
    } finally {
      setAwarding(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Award Badge</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="userEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter user email"
                      {...field}
                      onBlur={() => searchUser(field.value)}
                    />
                  </FormControl>
                  {searchedUser && (
                    <p className="text-sm text-green-600">
                      Found: {searchedUser.name} ({searchedUser.email})
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="badgeTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Badge Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a badge" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {badgeTypes.map((badge) => (
                        <SelectItem key={badge.id} value={badge.id}>
                          {badge.icon} {badge.name}
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
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={awarding || !searchedUser}
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
