
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminRecoveryManager from "@/components/admin/security/AdminRecoveryManager";
import SecurityMonitor from "@/components/admin/security/SecurityMonitor";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Shield, Key, Activity } from "lucide-react";

const AdminSecurity = () => {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Security Management</h1>
              <p className="text-muted-foreground">
                Manage admin access, recovery codes, and monitor security activities
              </p>
            </div>
          </div>

          <Tabs defaultValue="recovery" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="recovery" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Recovery Codes
              </TabsTrigger>
              <TabsTrigger value="monitor" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Security Monitor
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
