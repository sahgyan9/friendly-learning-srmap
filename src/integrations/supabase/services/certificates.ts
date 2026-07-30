import { supabase } from "@/integrations/supabase/client";

export interface MyCertificateStatus {
  certificate_id: string | null;
  certificate_number: string | null;
  issued_at: string | null;
  revoked: boolean;
  is_mentor: boolean;
  students_helped: number;
  students_required: number;
  badges: number;
  reviews: number;
  average_rating: number | null;
  mentor_since: string | null;
}

export interface PublicCertificate {
  certificate_number: string;
  issued_at: string;
  revoked: boolean;
  name: string;
  department: string | null;
  university: string | null;
  is_alumni: boolean;
  graduation_year: number | null;
  students_helped: number;
  badges: number;
  reviews: number;
  average_rating: number | null;
  mentor_since: string | null;
}

/** Progress and, if earned, the certificate held by the signed-in user. */
export const getMyCertificateStatus = async () => {
  const { data, error } = await supabase.rpc("my_certificate_status");

  if (error) {
    console.error("Error loading certificate status:", error);
    return { data: null, error };
  }

  const row = (data ?? [])[0] as MyCertificateStatus | undefined;
  return { data: row ?? null, error: null };
};

/**
 * Issues the certificate if the bar has been cleared, and returns the id either
 * way. Safe to call on every page load: it takes no arguments, acts only on the
 * caller, and returns the existing certificate rather than a second one.
 */
export const issueCertificateIfEarned = async () => {
  const { data, error } = await supabase.rpc("issue_certificate_if_earned");

  if (error) {
    console.error("Error issuing certificate:", error);
    return { data: null, error };
  }

  return { data: (data as string | null) ?? null, error: null };
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Public lookup behind the verification link. Works signed out, by design. */
export const getCertificate = async (certificateId: string) => {
  // A mistyped link is not a lookup. Without this the id goes to PostgREST, the
  // uuid cast fails, and a 400 is logged for what is really just a typo.
  if (!UUID_PATTERN.test(certificateId ?? "")) {
    return { data: null, error: null };
  }

  const { data, error } = await supabase.rpc("get_certificate", {
    p_certificate_id: certificateId,
  });

  if (error) {
    console.error("Error verifying certificate:", error);
    return { data: null, error };
  }

  const row = (data ?? [])[0] as PublicCertificate | undefined;
  return { data: row ?? null, error: null };
};
