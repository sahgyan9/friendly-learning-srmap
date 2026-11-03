
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminRecoveryManager from "@/components/admin/security/AdminRecoveryManager";
import SecurityMonitor from "@/components/admin/security/SecurityMonitor";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Key, Activity } from "lucide-react";

const AdminSecurity = () => {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdminLayout>
        <div className="space-y-6">
          <div className="border-b border-border pb-6">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Security</h1>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">
              Admin recovery codes and recent security events.
            </p>
          </div>

          <Tabs defaultValue="recovery" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-auto">
              <TabsTrigger value="recovery" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Recovery codes
              </TabsTrigger>
              <TabsTrigger value="monitor" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Activity
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="recovery" className="space-y-4">
              <AdminRecoveryManager />
            </TabsContent>
            
            <TabsContent value="monitor" className="space-y-4">
              <SecurityMonitor />
            </TabsContent>
          </Tabs>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
};

export default AdminSecurity;
