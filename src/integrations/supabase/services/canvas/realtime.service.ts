import { supabase } from "@/integrations/supabase/client";
import { CanvasDrawing, CanvasParticipant } from "@/types/canvas";

/**
 * Subscribe to canvas drawing updates
 */
export function subscribeToCanvasDrawings(
    sessionId: string,
    onDrawingUpdate: (payload: {
        eventType: 'INSERT' | 'UPDATE' | 'DELETE';
        new?: CanvasDrawing;
        old?: CanvasDrawing;
    }) => void
) {
    console.log("Subscribing to canvas drawings for session:", sessionId);

    const channel = supabase
        .channel(`canvas_drawings:${sessionId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'canvas_drawings',
                filter: `session_id=eq.${sessionId}`
            },
            (payload) => {
                console.log('Canvas drawing update received:', payload);
                onDrawingUpdate({
                    eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
                    new: payload.new as CanvasDrawing,
                    old: payload.old as CanvasDrawing
                });
            }
        )
        .subscribe((status) => {
            console.log('Canvas drawings subscription status:', status);
        });

    return channel;
}

/**
 * Subscribe to canvas participant updates
 */
export function subscribeToCanvasParticipants(
    sessionId: string,
    onParticipantUpdate: (payload: {
        eventType: 'INSERT' | 'UPDATE' | 'DELETE';
        new?: CanvasParticipant;
        old?: CanvasParticipant;
    }) => void
) {
    console.log("Subscribing to canvas participants for session:", sessionId);

    const channel = supabase
        .channel(`canvas_participants:${sessionId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'canvas_participants',
                filter: `session_id=eq.${sessionId}`
            },
            (payload) => {
                console.log('Canvas participant update received:', payload);
                onParticipantUpdate({
                    eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
                    new: payload.new as CanvasParticipant,
                    old: payload.old as CanvasParticipant
                });
            }
        )
        .subscribe((status) => {
            console.log('Canvas participants subscription status:', status);
        });

    return channel;
}

/**
 * Subscribe to cursor movements (using presence)
 */
export function subscribeToCanvasCursors(
    sessionId: string,
    userId: string,
    userName: string,
    onCursorUpdate: (cursors: Array<{
        userId: string;
        userName: string;
        x: number;
        y: number;
        color: string;
        isActive: boolean;
    }>) => void
) {
    console.log("Subscribing to canvas cursors for session:", sessionId);

    const channel = supabase.channel(`canvas_cursors:${sessionId}`, {
        config: {
            presence: {
                key: userId,
            },
        },
    });

    // Track presence changes
    channel
        .on('presence', { event: 'sync' }, () => {
            const presenceState = channel.presenceState();
            const cursors: Array<{
                userId: string;
                userName: string;
                x: number;
                y: number;
                color: string;
                isActive: boolean;
            }> = [];

            Object.entries(presenceState).forEach(([key, presences]) => {
                presences.forEach((presence: any) => {
                    if (presence.userId !== userId) { // Don't show own cursor
                        cursors.push({
                            userId: presence.userId,
                            userName: presence.userName,
                            x: presence.x || 0,
                            y: presence.y || 0,
                            color: presence.color || '#3b82f6',
                            isActive: presence.isActive || false
                        });
                    }
                });
            });

            onCursorUpdate(cursors);
        })
        .subscribe(async (status) => {
            console.log('Canvas cursors subscription status:', status);

            if (status === 'SUBSCRIBED') {
                // Initial presence
                await channel.track({
                    userId,
                    userName,
                    x: 0,
                    y: 0,
                    color: getRandomCursorColor(),
                    isActive: true,
                    joinedAt: new Date().toISOString()
                });
            }
        });

    return channel;
}

/**
 * Update cursor position
 */
export async function updateCursorPosition(
    channel: any,
    x: number,
    y: number,
    isActive: boolean = true
) {
    await channel.track({
        x,
        y,
        isActive,
        lastUpdate: new Date().toISOString()
    });
}

/**
 * Broadcast drawing events (for immediate visual feedback)
 */
export function broadcastDrawingEvent(
    sessionId: string,
    eventType: 'stroke_start' | 'stroke_update' | 'stroke_end' | 'clear',
    data: any
) {
    console.log("Broadcasting drawing event:", { sessionId, eventType });

    const channel = supabase.channel(`canvas_broadcast:${sessionId}`);

    channel.send({
        type: 'broadcast',
        event: 'drawing_event',
        payload: {
            eventType,
            data,
            timestamp: Date.now()
        }
    });

    return channel;
}

/**
 * Subscribe to drawing broadcast events
 */
export function subscribeToDrawingBroadcast(
    sessionId: string,
    onDrawingEvent: (payload: {
        eventType: 'stroke_start' | 'stroke_update' | 'stroke_end' | 'clear';
        data: any;
        timestamp: number;
    }) => void
) {
    console.log("Subscribing to drawing broadcast for session:", sessionId);

    const channel = supabase
        .channel(`canvas_broadcast:${sessionId}`)
        .on('broadcast', { event: 'drawing_event' }, (payload) => {
            console.log('Drawing broadcast received:', payload);
            onDrawingEvent(payload.payload);
        })
        .subscribe((status) => {
            console.log('Drawing broadcast subscription status:', status);
        });

    return channel;
}

/**
 * Generate a random cursor color for each user
 */
function getRandomCursorColor(): string {
    const colors = [
        '#ef4444',
        '#f97316',
        '#eab308',
        '#22c55e',
        '#06b6d4',
        '#3b82f6',
        '#8b5cf6',
        '#ec4899',
        '#f59e0b',
        '#10b981'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Unsubscribe from all canvas channels
 */
export function unsubscribeFromCanvas(channels: any[]) {
    console.log("Unsubscribing from canvas channels");

    channels.forEach(channel => {
        if (channel) {
            supabase.removeChannel(channel);
        }
    });
}