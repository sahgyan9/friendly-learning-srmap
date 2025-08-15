
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Activity, AlertTriangle, Clock } from "lucide-react";
import { getAdminAuditLogs } from "@/integrations/supabase/services/admin";

interface AuditLog {
  id: string;
  action: string;
  created_at: string;
  details?: any;
  admin_user?: { name: string; email: string };
  target_user?: { name: string; email: string };
}

const SecurityMonitor = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    try {
      const logs = await getAdminAuditLogs(50);
      setAuditLogs(logs || []);
    } catch (error) {
      console.error("Error loading audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('admin') || action.includes('promote')) {
      return <Shield className="h-4 w-4 text-red-500" />;
    }
    if (action.includes('verification') || action.includes('badge')) {
      return <Activity className="h-4 w-4 text-blue-500" />;
    }
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  };

  const getActionBadge = (action: string) => {
    if (action.includes('admin') || action.includes('promote')) {
      return <Badge variant="destructive">Critical</Badge>;
    }
    if (action.includes('verification')) {
      return <Badge variant="default">Verification</Badge>;
    }
    if (action.includes('badge')) {
      return <Badge variant="secondary">Badge</Badge>;
    }
    return <Badge variant="outline">Other</Badge>;
  };

  const formatActionDescription = (log: AuditLog) => {
    const action = log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const target = log.target_user ? ` on ${log.target_user.name}` : '';
    return `${action}${target}`;
  };

  if (loading) {
    return <div className="animate-pulse">Loading security monitor...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Activity Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {auditLogs.filter(log => log.created_at > new Date(Date.now() - 24*60*60*1000).toISOString()).length}
              </div>
              <div className="text-sm text-green-700">Actions (24h)</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {auditLogs.filter(log => log.action.includes('admin') || log.action.includes('promote')).length}
              </div>
              <div className="text-sm text-red-700">Critical Actions</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {new Set(auditLogs.map(log => log.admin_user?.email)).size}
              </div>
              <div className="text-sm text-blue-700">Active Admins</div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Activity
            </h3>
            
            {auditLogs.length === 0 ? (
              <p className="text-muted-foreground">No audit logs found.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      {getActionIcon(log.action)}
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {formatActionDescription(log)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          by {log.admin_user?.name || 'System'} • {new Date(log.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getActionBadge(log.action)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityMonitor;
