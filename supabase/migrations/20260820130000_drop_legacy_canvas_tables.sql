-- Migration: 20260820130000_drop_legacy_canvas_tables.sql
-- Description: Drops obsolete whiteboard canvas tables and legacy RPC functions.

DROP TABLE IF EXISTS public.canvas_drawings CASCADE;
DROP TABLE IF EXISTS public.canvas_participants CASCADE;
DROP TABLE IF EXISTS public.canvas_sessions CASCADE;

DROP FUNCTION IF EXISTS public.create_canvas_session(text, uuid);
DROP FUNCTION IF EXISTS public.create_canvas_session(uuid, text);
DROP FUNCTION IF EXISTS public.join_canvas_session(text, uuid);
DROP FUNCTION IF EXISTS public.get_canvas_session_participants(uuid);
