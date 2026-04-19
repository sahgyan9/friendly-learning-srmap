import { useEffect, useState, useMemo } from "react";
import { facultyService, type Faculty } from "@/integrations/supabase/services/faculty";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";

const empty: Partial<Faculty> = {
  name: "",
  designation: "",
  department: "",
  school: "",
  email: "",
  profile_image: "",
};

const AdminFaculty = () => {
  const [list, setList] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Faculty | null>(null);
  const [form, setForm] = useState<Partial<Faculty>>(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setList(await facultyService.listFaculty());
    } catch (e: any) {
      toast.error(e.message || "Failed to load faculty");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.department.toLowerCase().includes(q) ||
        (f.designation || "").toLowerCase().includes(q)
    );
  }, [list, search]);

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (f: Faculty) => {
    setEditing(f);
    setForm({
      name: f.name,
      designation: f.designation || "",
      department: f.department,
      school: f.school || "",
      email: f.email || "",
      profile_image: f.profile_image || "",
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name?.trim() || !form.department?.trim()) {
      toast.error("Name and department are required");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await facultyService.updateFaculty(editing.id, form);
        toast.success("Faculty updated");
      } else {
        await facultyService.createFaculty(form);
        toast.success("Faculty added");
      }
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (f: Faculty) => {
    if (!confirm(`Delete ${f.name}? This will also remove all their ratings.`)) return;
    try {
      await facultyService.deleteFaculty(f.id);
      toast.success("Faculty deleted");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Faculty Management</h1>
            <p className="text-sm text-muted-foreground">Add, edit, or remove faculty entries.</p>
          </div>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" /> Add faculty
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="pl-9"
          />
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-center">Ratings</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No faculty found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{f.designation || "—"}</TableCell>
                    <TableCell className="text-sm">{f.department}</TableCell>
                    <TableCell className="text-center text-sm">
                      {f.rating_count > 0 ? `${Number(f.avg_rating).toFixed(1)} (${f.rating_count})` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(f)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(f)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit faculty" : "Add faculty"}</DialogTitle>
            <DialogDescription>
              You can also manage faculty directly in the Supabase dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Name *</Label>
              <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Designation</Label>
              <Input
                value={form.designation || ""}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                placeholder="e.g. Associate Professor"
              />
            </div>
            <div>
              <Label>Department *</Label>
              <Input
                value={form.department || ""}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="e.g. Computer Science & Engineering"
              />
            </div>
            <div>
              <Label>School</Label>
              <Input
                value={form.school || ""}
                onChange={(e) => setForm({ ...form, school: e.target.value })}
                placeholder="e.g. School of Engineering & Sciences"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email || ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Profile image URL</Label>
              <Input
                value={form.profile_image || ""}
                onChange={(e) => setForm({ ...form, profile_image: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminFaculty;
