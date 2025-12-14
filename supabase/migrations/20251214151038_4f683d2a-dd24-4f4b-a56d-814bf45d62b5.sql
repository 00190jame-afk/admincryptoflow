-- Add reply tracking to contact_messages
ALTER TABLE contact_messages ADD COLUMN is_read BOOLEAN DEFAULT false;
ALTER TABLE contact_messages ADD COLUMN replied_at TIMESTAMP WITH TIME ZONE;

-- Add reference to original contact message (for replies) to messages table
ALTER TABLE messages ADD COLUMN reply_to_contact_id UUID REFERENCES contact_messages(id);

-- Update RLS policies to allow admins to update contact_messages
CREATE POLICY "Admin profiles can update contact messages" 
ON contact_messages 
FOR UPDATE 
USING (is_any_admin())
WITH CHECK (is_any_admin());

-- Allow admins to insert messages (for sending to users)
CREATE POLICY "Admin profiles can insert messages" 
ON contact_messages 
FOR INSERT 
WITH CHECK (is_any_admin());

CREATE POLICY "Admin profiles can insert user messages" 
ON messages 
FOR INSERT 
WITH CHECK (is_any_admin());