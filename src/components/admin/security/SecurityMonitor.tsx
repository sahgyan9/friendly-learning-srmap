
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Activity, AlertTriangle, Clock } from "lucide-react";
import { getAdminAuditLogs } from "@/integrations/supabase/services/admin";

interface AuditLog {
  id: string;
  action: string;
  created_at: string;
  details?: unknown;
  admin_user?: { name: string; email: string } | null;
  target_user?: { name: string; email: string } | null;
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
      return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
    return <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
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
    return (
      <div className="space-y-3" role="status" aria-label="Loading security activity">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="mb-6 grid grid-cols-1 divide-y divide-border rounded-lg border border-border md:grid-cols-3 md:divide-x md:divide-y-0">
            <div className="p-4">
              <dt className="text-sm text-muted-foreground">Actions, last 24 hours</dt>
              <dd className="mt-1 text-2xl font-semibold tabular">
                {auditLogs.filter(log => log.created_at > new Date(Date.now() - 24*60*60*1000).toISOString()).length}
              </dd>
            </div>
            <div className="p-4">
              <dt className="text-sm text-muted-foreground">Admin role changes</dt>
              <dd className="mt-1 text-2xl font-semibold tabular">
                {auditLogs.filter(log => log.action.includes('admin') || log.action.includes('promote')).length}
              </dd>
            </div>
            <div className="p-4">
              <dt className="text-sm text-muted-foreground">Admins with activity</dt>
              <dd className="mt-1 text-2xl font-semibold tabular">
                {new Set(auditLogs.map(log => log.admin_user?.email).filter(Boolean)).size}
              </dd>
            </div>
          </dl>

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
                  <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted">
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
