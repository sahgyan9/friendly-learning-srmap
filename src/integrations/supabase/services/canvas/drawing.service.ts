import { supabase } from "@/integrations/supabase/client";
import {
    CanvasDrawing,
    CanvasDrawingInsert,
    DrawingData,
    CanvasActionType
} from "@/types/canvas";

/**
 * Save a drawing action to the database
 */
export async function saveDrawingAction(
    sessionId: string,
    userId: string,
    actionType: CanvasActionType,
    drawingData: DrawingData
) {
    try {
        console.log("Saving drawing action:", { sessionId, userId, actionType });

        const drawingInsert: CanvasDrawingInsert = {
            session_id: sessionId,
            user_id: userId,
            action_type: actionType,
            drawing_data: drawingData as any // JSONB type
        };

        const { data, error } = await supabase
            .from('canvas_drawings')
            .insert(drawingInsert)
            .select()
            .single();

        if (error) {
            console.error('Error saving drawing action:', error);
            return { data: null, error };
        }

        console.log('Drawing action saved successfully:', data);
        return { data, error: null };
    } catch (err) {
        console.error('Exception in saveDrawingAction:', err);
        return { data: null, error: err as Error };
    }
}

/**
 * Get all drawing actions for a session
 */
export async function getSessionDrawings(sessionId: string) {
    try {
        console.log("Fetching session drawings:", sessionId);

        const { data, error } = await supabase
            .from('canvas_drawings')
            .select(`
        *,
        users!canvas_drawings_user_id_fkey (
          id,
          name,
          profile_image
        )
      `)
            .eq('session_id', sessionId)
            .order('timestamp', { ascending: true });

        if (error) {
            console.error('Error fetching session drawings:', error);
            return { data: null, error };
        }

        return { data, error: null };
    } catch (err) {
        console.error('Exception in getSessionDrawings:', err);
        return { data: null, error: err as Error };
    }
}

/**
 * Clear all drawings for a session (mentor only)
 */
export async function clearSessionDrawings(sessionId: string, userId: string) {
    try {
        console.log("Clearing session drawings:", { sessionId, userId });

        // First verify the user is the mentor of this session
        const { data: session, error: sessionError } = await supabase
            .from('canvas_sessions')
            .select('mentor_id')
            .eq('id', sessionId)
            .single();

        if (sessionError || !session) {
            console.error('Error verifying session mentor:', sessionError);
            return { data: null, error: sessionError || new Error('Session not found') };
        }

        if (session.mentor_id !== userId) {
            return { data: null, error: new Error('Only the mentor can clear the canvas') };
        }

        // Save a clear action
        const clearAction = await saveDrawingAction(sessionId, userId, 'clear', { clear: true });

        if (clearAction.error) {
            return { data: null, error: clearAction.error };
        }

        return { data: clearAction.data, error: null };
    } catch (err) {
        console.error('Exception in clearSessionDrawings:', err);
        return { data: null, error: err as Error };
    }
}

/**
 * Get drawings since a specific timestamp (for incremental updates)
 */
export async function getDrawingsSince(sessionId: string, timestamp: string) {
    try {
        console.log("Fetching drawings since:", { sessionId, timestamp });

        const { data, error } = await supabase
            .from('canvas_drawings')
            .select(`
        *,
        users!canvas_drawings_user_id_fkey (
          id,
          name,
          profile_image
        )
      `)
            .eq('session_id', sessionId)
            .gt('timestamp', timestamp)
            .order('timestamp', { ascending: true });

        if (error) {
            console.error('Error fetching drawings since timestamp:', error);
            return { data: null, error };
        }

        return { data, error: null };
    } catch (err) {
        console.error('Exception in getDrawingsSince:', err);
        return { data: null, error: err as Error };
    }
}

/**
 * Delete a specific drawing (for undo functionality)
 */
export async function deleteDrawing(drawingId: string, userId: string) {
    try {
        console.log("Deleting drawing:", { drawingId, userId });

        // Only allow users to delete their own drawings
        const { error } = await supabase
            .from('canvas_drawings')
            .delete()
            .eq('id', drawingId)
            .eq('user_id', userId);

        if (error) {
            console.error('Error deleting drawing:', error);
            return { error };
        }

        return { error: null };
    } catch (err) {
        console.error('Exception in deleteDrawing:', err);
        return { error: err as Error };
    }
}

/**
 * Get drawing statistics for a session
 */
export async function getSessionDrawingStats(sessionId: string) {
    try {
        console.log("Fetching session drawing stats:", sessionId);

        const { data, error } = await supabase
            .from('canvas_drawings')
            .select('user_id, action_type')
            .eq('session_id', sessionId);

        if (error) {
            console.error('Error fetching drawing stats:', error);
            return { data: null, error };
        }

        // Process statistics
        const stats = {
            total_actions: data.length,
            unique_contributors: new Set(data.map(d => d.user_id)).size,
            action_breakdown: data.reduce((acc, d) => {
                acc[d.action_type] = (acc[d.action_type] || 0) + 1;
                return acc;
            }, {} as Record<string, number>)
        };

        return { data: stats, error: null };
    } catch (err) {
        console.error('Exception in getSessionDrawingStats:', err);
        return { data: null, error: err as Error };
    }
}