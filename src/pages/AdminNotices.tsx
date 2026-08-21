import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminHeader from "@/components/admin/AdminHeader";
import NoticeList from "@/components/admin/notices/NoticeList";
import NoticeCreationForm from "@/components/admin/notices/NoticeCreationForm";
import { useNotices } from "@/hooks/useNotices";

const AdminNotices = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { notices, loading, refetch } = useNotices();

  const handleNoticeCreated = () => {
    setShowCreateForm(false);
    refetch();
    toast.success("Notice published — it will show up in Ask AI shortly.");
  };

  return (
    <AdminLayout>
      <AdminHeader
        title="Notices"
        description="Publish official circulars and notices so they're searchable in Ask AI"
        action={
          !showCreateForm && (
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Notice
            </Button>
          )
        }
      />

      {showCreateForm ? (
        <NoticeCreationForm
          onCancel={() => setShowCreateForm(false)}
          onSuccess={handleNoticeCreated}
        />
      ) : (
        <NoticeList notices={notices} loading={loading} onRefetch={refetch} />
      )}
    </AdminLayout>
  );
};

export default AdminNotices;
