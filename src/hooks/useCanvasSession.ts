import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    CanvasSession,
    CanvasParticipantWithUser,
    CanvasState,
    DrawingStroke,
    TextAnnotation,
    CanvasToolSettings,
    DrawingTool,
    CanvasCursor
} from '@/types/canvas';
import {
    getCanvasSession,
    getCanvasSessionParticipants,
    leaveCanvasSession,
    endCanvasSession,
    getSessionDrawings,
    saveDrawingAction,
    clearSessionDrawings,
    subscribeToCanvasDrawings,
    subscribeToCanvasParticipants,
    subscribeToCanvasCursors,
    updateCursorPosition,
    unsubscribeFromCanvas
} from '@/integrations/supabase/services/canvas';

interface UseCanvasSessionProps {
    sessionId: string;
}

export const useCanvasSession = ({ sessionId }: UseCanvasSessionProps) => {
    const { user, profile } = useAuth();

    // Session state
    const [session, setSession] = useState<CanvasSession | null>(null);
    const [participants, setParticipants] = useState<CanvasParticipantWithUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Canvas state
    const [canvasState, setCanvasState] = useState<CanvasState>({
        strokes: [],
        texts: [],
        isDrawing: false,
        currentStroke: null,
        toolSettings: {
            tool: 'pen',
            color: '#000000',
            width: 2,
            fontSize: 16
        },
        canvasSize: { width: 1200, height: 800 },
        zoom: 1,
        pan: { x: 0, y: 0 }
    });

    // Cursors state
    const [cursors, setCursors] = useState<CanvasCursor[]>([]);

    // Real-time channels
    const channelsRef = useRef<any[]>([]);
    const cursorChannelRef = useRef<any>(null);

    // User permissions
    const userRole = participants.find(p => p.user_id === user?.id)?.role;
    const isMentor = userRole === 'mentor';
    const canEdit = true; // Both mentors and students can draw
    const canClear = isMentor;
    const canEndSession = isMentor;

    /**
     * Initialize session
     */
    const initializeSession = useCallback(async () => {
        if (!sessionId || !user?.id) return;

        try {
            setIsLoading(true);
            setError(null);

            // Fetch session details
            const { data: sessionData, error: sessionError } = await getCanvasSession(sessionId);
            if (sessionError || !sessionData) {
                throw sessionError || new Error('Session not found');
            }

            setSession(sessionData);

            // Fetch participants
            const { data: participantsData, error: participantsError } = await getCanvasSessionParticipants(sessionId);
            if (participantsError) {
                console.error('Error fetching participants:', participantsError);
            } else if (participantsData) {
                setParticipants(participantsData);
            }

            // Fetch existing drawings
            const { data: drawingsData, error: drawingsError } = await getSessionDrawings(sessionId);
            if (drawingsError) {
                console.error('Error fetching drawings:', drawingsError);
            } else if (drawingsData) {
                // Process drawings into canvas state
                processDrawingsIntoState(drawingsData);
            }

        } catch (err) {
            console.error('Error initializing session:', err);
            setError(err as Error);
        } finally {
            setIsLoading(false);
        }
    }, [sessionId, user?.id]);

    /**
     * Process drawings data into canvas state
     */
    const processDrawingsIntoState = (drawings: any[]) => {
        const strokes: DrawingStroke[] = [];
        const texts: TextAnnotation[] = [];

        drawings.forEach(drawing => {
            const data = drawing.drawing_data;

            if (drawing.action_type === 'clear') {
                // Clear action - reset canvas
                strokes.length = 0;
                texts.length = 0;
            } else if (drawing.action_type === 'draw' && data.strokes) {
                strokes.push(...data.strokes);
            } else if (drawing.action_type === 'text' && data.texts) {
                texts.push(...data.texts);
            }
        });

        setCanvasState(prev => ({
            ...prev,
            strokes,
            texts
        }));
    };

    /**
     * Subscribe to real-time updates
     */
    const subscribeToUpdates = useCallback(() => {
        if (!sessionId || !user?.id) return;

        // Subscribe to drawing updates
        const drawingChannel = subscribeToCanvasDrawings(sessionId, (payload) => {
            if (payload.eventType === 'INSERT' && payload.new) {
                const drawing = payload.new;
                const data = drawing.drawing_data as any;

                if (drawing.action_type === 'clear') {
                    setCanvasState(prev => ({
                        ...prev,
                        strokes: [],
                        texts: []
                    }));
                } else if (drawing.action_type === 'draw' && data.strokes) {
                    setCanvasState(prev => ({
                        ...prev,
                        strokes: [...prev.strokes, ...data.strokes]
                    }));
                } else if (drawing.action_type === 'text' && data.texts) {
                    setCanvasState(prev => ({
                        ...prev,
                        texts: [...prev.texts, ...data.texts]
                    }));
                }
            }
        });

        // Subscribe to participant updates
        const participantChannel = subscribeToCanvasParticipants(sessionId, async (payload) => {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                // Refresh participants list
                const { data } = await getCanvasSessionParticipants(sessionId);
                if (data) {
                    setParticipants(data);
                }
            }
        });

        // Subscribe to cursor updates
        const cursorChannel = subscribeToCanvasCursors(
            sessionId,
            user.id,
            profile?.name || 'Anonymous',
            (newCursors) => {
                setCursors(newCursors.map(cursor => ({
                    ...cursor,
                    lastUpdate: Date.now()
                })));
            }
        );

        channelsRef.current = [drawingChannel, participantChannel];
        cursorChannelRef.current = cursorChannel;

    }, [sessionId, user?.id, profile?.name]);

    /**
     * Update tool settings
     */
    const updateToolSettings = useCallback((updates: Partial<CanvasToolSettings>) => {
        setCanvasState(prev => ({
            ...prev,
            toolSettings: { ...prev.toolSettings, ...updates }
        }));
    }, []);

    /**
     * Start drawing
     */
    const startDrawing = useCallback((x: number, y: number) => {
        if (!canEdit || !user?.id) return;

        const strokeId = `stroke_${Date.now()}_${user.id}`;
        const newStroke: DrawingStroke = {
            id: strokeId,
            points: [{ x, y }],
            color: canvasState.toolSettings.color,
            width: canvasState.toolSettings.width,
            tool: canvasState.toolSettings.tool,
            userId: user.id,
            timestamp: Date.now()
        };

        setCanvasState(prev => ({
            ...prev,
            isDrawing: true,
            currentStroke: newStroke
        }));
    }, [canEdit, canvasState.toolSettings, user?.id]);

    /**
     * Continue drawing
     */
    const continueDrawing = useCallback((x: number, y: number) => {
        if (!canvasState.isDrawing || !canvasState.currentStroke) return;

        const updatedStroke = {
            ...canvasState.currentStroke,
            points: [...canvasState.currentStroke.points, { x, y }]
        };

        setCanvasState(prev => ({
            ...prev,
            currentStroke: updatedStroke
        }));
    }, [canvasState.isDrawing, canvasState.currentStroke]);

    /**
     * End drawing
     */
    const endDrawing = useCallback(async () => {
        if (!canvasState.isDrawing || !canvasState.currentStroke || !user?.id) return;

        const finalStroke = canvasState.currentStroke;

        // Add stroke to canvas state
        setCanvasState(prev => ({
            ...prev,
            isDrawing: false,
            currentStroke: null,
            strokes: [...prev.strokes, finalStroke]
        }));

        // Save to database
        await saveDrawingAction(sessionId, user.id, 'draw', {
            strokes: [finalStroke]
        });
    }, [canvasState.isDrawing, canvasState.currentStroke, sessionId, user?.id]);

    /**
     * Add text annotation
     */
    const addText = useCallback(async (x: number, y: number, text: string) => {
        if (!canEdit || !user?.id || !text.trim()) return;

        const textAnnotation: TextAnnotation = {
            id: `text_${Date.now()}_${user.id}`,
            x,
            y,
            text: text.trim(),
            color: canvasState.toolSettings.color,
            fontSize: canvasState.toolSettings.fontSize,
            userId: user.id,
            timestamp: Date.now()
        };

        setCanvasState(prev => ({
            ...prev,
            texts: [...prev.texts, textAnnotation]
        }));

        // Save to database
        await saveDrawingAction(sessionId, user.id, 'text', {
            texts: [textAnnotation]
        });
    }, [canEdit, canvasState.toolSettings, sessionId, user?.id]);

    /**
     * Clear canvas
     */
    const clearCanvas = useCallback(async () => {
        if (!canClear || !user?.id) return;

        setCanvasState(prev => ({
            ...prev,
            strokes: [],
            texts: []
        }));

        await clearSessionDrawings(sessionId, user.id);
    }, [canClear, sessionId, user?.id]);

    /**
     * Update cursor position
     */
    const updateCursor = useCallback(async (x: number, y: number, isActive: boolean = true) => {
        if (cursorChannelRef.current) {
            await updateCursorPosition(cursorChannelRef.current, x, y, isActive);
        }
    }, []);

    /**
     * Leave session
     */
    const leaveSession = useCallback(async () => {
        if (!user?.id) return;

        await leaveCanvasSession(sessionId, user.id);
    }, [sessionId, user?.id]);

    /**
     * End session (mentor only)
     */
    const endSession = useCallback(async () => {
        if (!canEndSession) return;

        await endCanvasSession(sessionId);
    }, [canEndSession, sessionId]);

    // Initialize session on mount
    useEffect(() => {
        initializeSession();
    }, [initializeSession]);

    // Subscribe to updates
    useEffect(() => {
        subscribeToUpdates();

        return () => {
            unsubscribeFromCanvas(channelsRef.current);
            if (cursorChannelRef.current) {
                unsubscribeFromCanvas([cursorChannelRef.current]);
            }
        };
    }, [subscribeToUpdates]);

    return {
        // Session data
        session,
        participants,
        isLoading,
        error,

        // Canvas state
        canvasState,
        cursors,

        // Permissions
        isMentor,
        canEdit,
        canClear,
        canEndSession,

        // Actions
        updateToolSettings,
        startDrawing,
        continueDrawing,
        endDrawing,
        addText,
        clearCanvas,
        updateCursor,
        leaveSession,
        endSession,

        // Utils
        refreshSession: initializeSession
    };
};