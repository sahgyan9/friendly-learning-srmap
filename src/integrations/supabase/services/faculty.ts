import { supabase } from "@/integrations/supabase/client";

export interface Faculty {
  id: string;
  name: string;
  designation: string | null;
  department: string;
  school: string | null;
  email: string | null;
  profile_image: string | null;
  avg_rating: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
}

export interface FacultyRating {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface MyFacultyRating {
  id: string;
  faculty_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export const facultyService = {
  async listFaculty(): Promise<Faculty[]> {
    const { data, error } = await supabase
      .from("faculty")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return (data || []) as Faculty[];
  },

  async getFaculty(id: string): Promise<Faculty | null> {
    const { data, error } = await supabase
      .from("faculty")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data as Faculty | null;
  },

  async getFacultyRatings(facultyId: string): Promise<FacultyRating[]> {
    const { data, error } = await supabase.rpc("get_faculty_ratings", {
      p_faculty_id: facultyId,
    });
    if (error) throw error;
    return (data || []) as FacultyRating[];
  },

  async getMyRating(facultyId: string, userId: string): Promise<MyFacultyRating | null> {
    const { data, error } = await supabase
      .from("faculty_ratings")
      .select("*")
      .eq("faculty_id", facultyId)
      .eq("reviewer_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data as MyFacultyRating | null;
  },

  async submitRating(params: {
    facultyId: string;
    userId: string;
    rating: number;
    comment?: string | null;
  }) {
    const { error } = await supabase.from("faculty_ratings").upsert(
      {
        faculty_id: params.facultyId,
        reviewer_id: params.userId,
        rating: params.rating,
        comment: params.comment || null,
      },
      { onConflict: "faculty_id,reviewer_id" }
    );
    if (error) throw error;
  },

  async deleteMyRating(facultyId: string, userId: string) {
    const { error } = await supabase
      .from("faculty_ratings")
      .delete()
      .eq("faculty_id", facultyId)
      .eq("reviewer_id", userId);
    if (error) throw error;
  },

  async createFaculty(payload: Partial<Faculty>) {
    const { data, error } = await supabase
      .from("faculty")
      .insert({
        name: payload.name!,
        department: payload.department!,
        designation: payload.designation || null,
        school: payload.school || null,
        email: payload.email || null,
        profile_image: payload.profile_image || null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as Faculty;
  },

  async updateFaculty(id: string, payload: Partial<Faculty>) {
    const { error } = await supabase
      .from("faculty")
      .update({
        name: payload.name,
        department: payload.department,
        designation: payload.designation,
        school: payload.school,
        email: payload.email,
        profile_image: payload.profile_image,
      })
      .eq("id", id);
    if (error) throw error;
  },

  async deleteFaculty(id: string) {
    const { error } = await supabase.from("faculty").delete().eq("id", id);
    if (error) throw error;
  },
};
