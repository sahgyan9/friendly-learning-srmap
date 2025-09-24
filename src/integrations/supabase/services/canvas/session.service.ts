import { supabase } from "@/integrations/supabase/client";
import {
    CanvasSession,
    CanvasSessionInsert,
    CanvasSessionUpdate,
    CanvasParticipantWithUser,
    CreateSessionData,
    JoinSessionData
} from "@/types/canvas";

/**
 * Create a new canvas session
 */
export async function createCanvasSession(
    sessionData: CreateSessionData,
    mentorId: string
) {
    try {
        console.log("Creating canvas session:", { mentorId, sessionData });

        const { data, error } = await supabase.rpc('create_canvas_session', {
            p_mentor_id: mentorId,
            p_title: sessionData.title
        });

        if (error) {
            console.error('Error creating canvas session:', error);
            return { data: null, error };
        }

        // Update additional settings if provided
        if (sessionData.maxParticipants || sessionData.backgroundColor) {
            const updateData: CanvasSessionUpdate = {};
            if (sessionData.maxParticipants) updateData.max_participants = sessionData.maxParticipants;
            if (sessionData.backgroundColor) updateData.background_color = sessionData.backgroundColor;

            const { error: updateError } = await supabase
                .from('canvas_sessions')
                .update(updateData)
                .eq('id', data.id);

            if (updateError) {
                console.error('Error updating session settings:', updateError);
            }
        }

        console.log('Canvas session created successfully:', data);
        return { data, error: null };
    } catch (err) {
        console.error('Exception in createCanvasSession:', err);
        return { data: null, error: err as Error };
    }
}

/**
 * Join a canvas session using session code
 */
export async function joinCanvasSession(
    sessionData: JoinSessionData,
    userId: string
) {
    try {
        console.log("Joining canvas session:", { userId, sessionCode: sessionData.sessionCode });

        const { data, error } = await supabase.rpc('join_canvas_session', {
            p_session_code: sessionData.sessionCode,
            p_user_id: userId
        });

        if (error) {
            console.error('Error joining canvas session:', error);
            return { data: null, error };
        }

        console.log('Successfully joined canvas session:', data);
        return { data, error: null };
    } catch (err) {
        console.error('Exception in joinCanvasSession:', err);
        return { data: null, error: err as Error };
    }
}

/**
 * Get canvas session by ID
 */
export async function getCanvasSession(sessionId: string) {
    try {
        console.log("Fetching canvas session:", sessionId);

        const { data, error } = await supabase
            .from('canvas_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (error) {
            console.error('Error fetching canvas session:', error);
            return { data: null, error };
        }

        return { data, error: null };
    } catch (err) {
        console.error('Exception in getCanvasSession:', err);
        return { data: null, error: err as Error };
    }
}

/**
 * Get canvas session by session code
 */
export async function getCanvasSessionByCode(sessionCode: string) {
    try {
        console.log("Fetching canvas session by code:", sessionCode);

        const { data, error } = await supabase
            .from('canvas_sessions')
            .select('*')
            .eq('session_code', sessionCode)
            .eq('is_active', true)
            .single();

        if (error) {
            console.error('Error fetching canvas session by code:', error);
            return { data: null, error };
        }

        return { data, error: null };
    } catch (err) {
        console.error('Exception in getCanvasSessionByCode:', err);
        return { data: null, error: err as Error };
    }
}

/**
 * Get all canvas sessions for a mentor
 */
export async function getMentorCanvasSessions(mentorId: string) {
    try {
        console.log("Fetching mentor canvas sessions:", mentorId);

        const { data, error } = await supabase
            .from('canvas_sessions')
            .select('*')
            .eq('mentor_id', mentorId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching mentor canvas sessions:', error);
            return { data: null, error };
        }

        return { data, error: null };
    } catch (err) {
        console.error('Exception in getMentorCanvasSessions:', err);
        return { data: null, error: err as Error };
    }
}

/**
 * Get session participants with user details
 */
export async function getCanvasSessionParticipants(sessionId: string): Promise<{
    data: CanvasParticipantWithUser[] | null;
    error: Error | null;
}> {
    try {
        console.log("Fetching canvas session participants:", sessionId);

        const { data, error } = await supabase.rpc('get_canvas_session_participants', {
            p_session_id: sessionId
        });

        if (error) {
            console.error('Error fetching canvas session participants:', error);
            return { data: null, error };
        }

        return { data, error: null };
    } catch (err) {
        console.error('Exception in getCanvasSessionParticipants:', err);
        return { data: null, error: err as Error };
    }
}

/**
 * Update canvas session settings
 */
export async function updateCanvasSession(
    sessionId: string,
    updates: CanvasSessionUpdate
) {
    try {
        console.log("Updating canvas session:", { sessionId, updates });

        const { data, error } = await supabase
            .from('canvas_sessions')
            .update(updates)
            .eq('id', sessionId)
            .select()
            .single();

        if (error) {
            console.error('Error updating canvas session:', error);
            return { data: null, error };
        }

        return { data, error: null };
    } catch (err) {
        console.error('Exception in updateCanvasSession:', err);
        return { data: null, error: err as Error };
    }
}

/**
 * End a canvas session
 */
export async function endCanvasSession(sessionId: string) {
    try {
        console.log("Ending canvas session:", sessionId);

        const { data, error } = await supabase
            .from('canvas_sessions')
            .update({ is_active: false })
            .eq('id', sessionId)
            .select()
            .single();

        if (error) {
            console.error('Error ending canvas session:', error);
            return { data: null, error };
        }

        // Mark all participants as inactive
        await supabase
            .from('canvas_participants')
            .update({ is_active: false })
            .eq('session_id', sessionId);

        return { data, error: null };
    } catch (err) {
        console.error('Exception in endCanvasSession:', err);
        return { data: null, error: err as Error };
    }
}

/**
 * Leave a canvas session
 */
export async function leaveCanvasSession(sessionId: string, userId: string) {
    try {
        console.log("Leaving canvas session:", { sessionId, userId });

        const { error } = await supabase
            .from('canvas_participants')
            .update({ is_active: false })
            .eq('session_id', sessionId)
            .eq('user_id', userId);

        if (error) {
            console.error('Error leaving canvas session:', error);
            return { error };
        }

        return { error: null };
    } catch (err) {
        console.error('Exception in leaveCanvasSession:', err);
        return { error: err as Error };
    }
}