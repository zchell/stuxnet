-- Create email_history table to track all sent emails
CREATE TABLE public.email_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  from_address TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  user_id UUID
);

-- Enable Row Level Security
ALTER TABLE public.email_history ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert (since we don't have auth yet)
CREATE POLICY "Allow public insert" 
ON public.email_history 
FOR INSERT 
WITH CHECK (true);

-- Create policy to allow anyone to view their history
CREATE POLICY "Allow public read" 
ON public.email_history 
FOR SELECT 
USING (true);

-- Create index for faster queries
CREATE INDEX idx_email_history_created_at ON public.email_history(created_at DESC);
CREATE INDEX idx_email_history_recipient_email ON public.email_history(recipient_email);