-- Create contact_responses table for storing admin email responses to contact messages
CREATE TABLE contact_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_message_id UUID NOT NULL REFERENCES contact_messages(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX idx_contact_responses_contact_message_id ON contact_responses(contact_message_id);
CREATE INDEX idx_contact_responses_admin_id ON contact_responses(admin_id);
CREATE INDEX idx_contact_responses_sent_at ON contact_responses(sent_at DESC);

-- Enable Row Level Security
ALTER TABLE contact_responses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Admins can view all responses
CREATE POLICY "Admins can view all contact responses" ON contact_responses
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Admins can insert responses
CREATE POLICY "Admins can create contact responses" ON contact_responses
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Admins can update their own responses
CREATE POLICY "Admins can update their own responses" ON contact_responses
    FOR UPDATE
    USING (
        admin_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_contact_responses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_contact_responses_updated_at
    BEFORE UPDATE ON contact_responses
    FOR EACH ROW
    EXECUTE PROCEDURE update_contact_responses_updated_at();

-- Grant necessary permissions
GRANT ALL ON contact_responses TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
