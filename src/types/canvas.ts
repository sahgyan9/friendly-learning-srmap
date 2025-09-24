import { Database } from "@/integrations/supabase/types";

// Database types
export type CanvasSession = Database['public']['Tables']['canvas_sessions']['Row'];
export type CanvasSessionInsert = Database['public']['Tables']['canvas_sessions']['Insert'];
export type CanvasSessionUpdate = Database['public']['Tables']['canvas_sessions']['Update'];

export type CanvasParticipant = Database['public']['Tables']['canvas_participants']['Row'];
export type CanvasParticipantInsert = Database['public']['Tables']['canvas_participants']['Insert'];
export type CanvasParticipantUpdate = Database['public']['Tables']['canvas_participants']['Update'];

export type CanvasDrawing = Database['public']['Tables']['canvas_drawings']['Row'];
export type CanvasDrawingInsert = Database['public']['Tables']['canvas_drawings']['Insert'];
export type CanvasDrawingUpdate = Database['public']['Tables']['canvas_drawings']['Update'];

// Extended types with user info
export interface CanvasParticipantWithUser {
    id: string;
    user_id: string;
    role: string;
    joined_at: string | null;
    is_active: boolean | null;
    user_name: string;
    user_profile_image: string | null;
}

export interface CanvasSessionWithParticipants extends CanvasSession {
    participants: CanvasParticipantWithUser[];
    participant_count: number;
}

// Drawing data types
export interface DrawingPoint {
    x: number;
    y: number;
    pressure?: number;
}

export interface DrawingStroke {
    id: string;
    points: DrawingPoint[];
    color: string;
    width: number;
    tool: DrawingTool;
    userId: string;
    timestamp: number;
}

export interface TextAnnotation {
    id: string;
    x: number;
    y: number;
    text: string;
    color: string;
    fontSize: number;
    userId: string;
    timestamp: number;
}

export interface DrawingData {
    strokes?: DrawingStroke[];
    texts?: TextAnnotation[];
    clear?: boolean;
    backgroundImage?: string;
}

// Canvas tool types
export type DrawingTool = 'pen' | 'eraser' | 'text' | 'select';

export interface CanvasToolSettings {
    tool: DrawingTool;
    color: string;
    width: number;
    fontSize: number;
}

// Canvas action types for real-time sync
export type CanvasActionType = 'draw' | 'erase' | 'clear' | 'text';

export interface CanvasAction {
    id: string;
    sessionId: string;
    userId: string;
    actionType: CanvasActionType;
    data: DrawingData;
    timestamp: number;
}

// Canvas state management
export interface CanvasState {
    strokes: DrawingStroke[];
    texts: TextAnnotation[];
    isDrawing: boolean;
    currentStroke: DrawingStroke | null;
    toolSettings: CanvasToolSettings;
    canvasSize: { width: number; height: number };
    zoom: number;
    pan: { x: number; y: number };
}

// Canvas events
export interface CanvasEvent {
    type: 'stroke_start' | 'stroke_update' | 'stroke_end' | 'text_add' | 'clear' | 'participant_join' | 'participant_leave';
    data: any;
    userId: string;
    timestamp: number;
}

// Canvas session management
export interface CreateSessionData {
    title: string;
    maxParticipants?: number;
    backgroundColor?: string;
}

export interface JoinSessionData {
    sessionCode: string;
}

// Canvas permissions
export type CanvasRole = 'mentor' | 'student';

export interface CanvasPermissions {
    canDraw: boolean;
    canErase: boolean;
    canClear: boolean;
    canAddText: boolean;
    canInvite: boolean;
    canKick: boolean;
    canEndSession: boolean;
}

// Canvas cursor for showing other users' cursors
export interface CanvasCursor {
    userId: string;
    userName: string;
    x: number;
    y: number;
    color: string;
    isActive: boolean;
    lastUpdate: number;
}

// Real-time subscription payloads
export interface CanvasRealtimePayload {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new?: CanvasDrawing;
    old?: CanvasDrawing;
}

export interface ParticipantRealtimePayload {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new?: CanvasParticipant;
    old?: CanvasParticipant;
}

// Canvas export options
export interface CanvasExportOptions {
    format: 'png' | 'pdf' | 'svg';
    quality?: number;
    backgroundColor?: string;
    includeGrid?: boolean;
}