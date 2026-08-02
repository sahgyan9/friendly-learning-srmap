-- Community Group Chat Messages table
CREATE TABLE IF NOT EXISTS public.community_group_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    channel TEXT NOT NULL DEFAULT 'general',
    content TEXT NOT NULL,
    reply_to_id UUID REFERENCES public.community_group_messages(id) ON DELETE SET NULL,
    reactions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast room lookups
CREATE INDEX IF NOT EXISTS idx_community_group_messages_room 
ON public.community_group_messages(community_id, channel, created_at ASC);

-- Row Level Security (RLS)
ALTER TABLE public.community_group_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Members and public communities read access
CREATE POLICY "View group messages"
ON public.community_group_messages
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.communities c
        WHERE c.id = community_group_messages.community_id
        AND (
            c.visibility = 'public' 
            OR c.owner_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.community_members cm 
                WHERE cm.community_id = c.id AND cm.user_id = auth.uid()
            )
        )
    )
);

-- Policy: Group members can post messages
CREATE POLICY "Insert group messages"
ON public.community_group_messages
FOR INSERT
WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
        SELECT 1 FROM public.communities c
        WHERE c.id = community_group_messages.community_id
        AND (
            c.owner_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.community_members cm 
                WHERE cm.community_id = c.id AND cm.user_id = auth.uid()
            )
        )
    )
);
