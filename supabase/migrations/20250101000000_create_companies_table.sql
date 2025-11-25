-- Create companies table to store company contact information
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT NOT NULL,
  office TEXT,
  location TEXT,
  UNIQUE(company_name, email)
);

-- Enable Row Level Security
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert (since we don't have auth yet)
CREATE POLICY "Allow public insert" 
ON public.companies 
FOR INSERT 
WITH CHECK (true);

-- Create policy to allow anyone to view companies
CREATE POLICY "Allow public read" 
ON public.companies 
FOR SELECT 
USING (true);

-- Create policy to allow anyone to update companies
CREATE POLICY "Allow public update" 
ON public.companies 
FOR UPDATE 
USING (true);

-- Create indexes for faster queries
CREATE INDEX idx_companies_company_name ON public.companies(company_name);
CREATE INDEX idx_companies_email ON public.companies(email);
CREATE INDEX idx_companies_company_name_lower ON public.companies(LOWER(company_name));

-- Enable realtime for companies table
ALTER PUBLICATION supabase_realtime ADD TABLE public.companies;
