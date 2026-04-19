import { useEffect, useMemo, useState } from "react";
import { facultyService, type Faculty } from "@/integrations/supabase/services/faculty";
import FacultyCard from "@/components/faculty/FacultyCard";
import FacultyFilters from "@/components/faculty/FacultyFilters";
import SEOHead from "@/components/SEOHead";
import { Skeleton } from "@/components/ui/skeleton";
import { GraduationCap } from "lucide-react";

const Faculty = () => {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState<string | null>(null);

  useEffect(() => {
    facultyService
      .listFaculty()
      .then(setFaculty)
      .finally(() => setLoading(false));
  }, []);

  const departments = useMemo(
    () => Array.from(new Set(faculty.map((f) => f.department))).sort(),
    [faculty]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return faculty.filter((f) => {
      if (department && f.department !== department) return false;
      if (!q) return true;
      return (
        f.name.toLowerCase().includes(q) ||
        f.department.toLowerCase().includes(q) ||
        (f.designation || "").toLowerCase().includes(q)
      );
    });
  }, [faculty, search, department]);

  return (
    <>
      <SEOHead
        title="Rate SRMAP Faculty Anonymously | Friendly Learning"
        description="Browse SRM University AP faculty by department and share anonymous ratings and reviews to help fellow students."
      />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Faculty</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Rate and review your SRMAP faculty anonymously. Your honest feedback helps fellow students choose courses and mentors.
          </p>
        </header>

        <div className="mb-6">
          <FacultyFilters
            search={search}
            onSearchChange={setSearch}
            departments={departments}
            selected={department}
            onSelect={setDepartment}
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground">No faculty match your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((f) => (
              <FacultyCard key={f.id} faculty={f} />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Faculty;
