
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Search, Loader2, Check, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getAdminUsers,
  getUserByEmail,
  setUserAsAdmin,
  removeAdminPrivilege,
} from "@/integrations/supabase/services/admin";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "@/integrations/supabase/types";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  profile_image?: string;
}

const AdminSettings = () => {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [processingUser, setProcessingUser] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAdminUsers();
  }, []);

  const fetchAdminUsers = async () => {
    try {
      setIsLoading(true);
      const data = await getAdminUsers();
      setAdminUsers(data);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      toast({
        title: "Error",
        description: "Failed to load admin users",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchEmail.trim()) return;

    try {
      setIsSearching(true);
      setSearchResults([]);
      const users = await getUserByEmail(searchEmail.trim());
      setSearchResults(users);
    } catch (error) {
      console.error("Error searching for users:", error);
      toast({
        title: "Error",
        description: "Failed to search for users",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSetAdmin = async (userId: string) => {
    try {
      setProcessingUser(userId);
      await setUserAsAdmin(userId);
      toast({
        title: "Success",
        description: "User has been granted admin privileges",
      });
      fetchAdminUsers();
      setSearchResults([]);
      setSearchEmail("");
    } catch (error) {
      console.error("Error setting user as admin:", error);
      toast({
        title: "Error",
        description: "Failed to grant admin privileges",
        variant: "destructive",
      });
    } finally {
      setProcessingUser(null);
    }
  };

  const handleRemoveAdmin = async (userId: string) => {
    try {
      setProcessingUser(userId);
      await removeAdminPrivilege(userId);
      toast({
        title: "Success",
        description: "Admin privileges have been revoked",
      });
      fetchAdminUsers();
    } catch (error) {
      console.error("Error removing admin privileges:", error);
      toast({
        title: "Error",
        description: "Failed to revoke admin privileges",
        variant: "destructive",
      });
    } finally {
      setProcessingUser(null);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col gap-2 mb-8">
            <h1 className="text-3xl font-bold">Admin Settings</h1>
            <p className="text-muted-foreground">
              Manage admin users and system settings
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Current Admin Users */}
            <Card>
              <CardHeader>
                <CardTitle>Current Admin Users</CardTitle>
                <CardDescription>
                  Users with administrative privileges
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : adminUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No admin users found
                  </div>
                ) : (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {adminUsers.map((admin) => (
                          <TableRow key={admin.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage
                                    src={admin.profile_image || ""}
                                    alt={admin.name}
                                  />
                                  <AvatarFallback>
                                    {admin.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{admin.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>{admin.email}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRemoveAdmin(admin.id)}
                                disabled={processingUser === admin.id}
                              >
                                {processingUser === admin.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  "Remove Admin"
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add Admin User */}
            <Card>
              <CardHeader>
                <CardTitle>Add Admin User</CardTitle>
                <CardDescription>
                  Search for users by email to grant admin access
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-6">
                  <Input
                    placeholder="Search by email..."
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                  <Button onClick={handleSearch} disabled={isSearching}>
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {searchResults.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage
                                    src={user.profile_image || ""}
                                    alt={user.name}
                                  />
                                  <AvatarFallback>
                                    {user.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{user.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell className="text-right">
                              {user.is_admin ? (
                                <span className="text-sm text-green-600 flex items-center justify-end">
                                  <Check className="h-4 w-4 mr-1" /> Admin
                                </span>
                              ) : (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleSetAdmin(user.id)}
                                  disabled={processingUser === user.id}
                                >
                                  {processingUser === user.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Make Admin"
                                  )}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {searchEmail && !isSearching && searchResults.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No users found matching "{searchEmail}"
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminSettings;
