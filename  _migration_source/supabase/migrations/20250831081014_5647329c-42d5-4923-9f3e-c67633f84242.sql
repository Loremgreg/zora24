-- Create assistants table
CREATE TABLE public.assistants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  start_message TEXT,
  prompt TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create phone_numbers table
CREATE TABLE public.phone_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assistant_id UUID REFERENCES public.assistants(id) ON DELETE CASCADE,
  e164 TEXT NOT NULL UNIQUE,
  country TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'twilio',
  twilio_sid TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  monthly_cost DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sip_trunks table
CREATE TABLE public.sip_trunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  twilio_sid TEXT NOT NULL UNIQUE,
  friendly_name TEXT NOT NULL,
  livekit_sip_uri TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sip_trunks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assistants
CREATE POLICY "Users can view their own assistants" 
ON public.assistants 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own assistants" 
ON public.assistants 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assistants" 
ON public.assistants 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assistants" 
ON public.assistants 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for phone_numbers
CREATE POLICY "Users can view phone numbers for their assistants" 
ON public.phone_numbers 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.assistants 
    WHERE assistants.id = phone_numbers.assistant_id 
    AND assistants.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert phone numbers for their assistants" 
ON public.phone_numbers 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.assistants 
    WHERE assistants.id = phone_numbers.assistant_id 
    AND assistants.user_id = auth.uid()
  )
);

-- RLS Policies for sip_trunks (admin only for now)
CREATE POLICY "Service role can manage sip_trunks" 
ON public.sip_trunks 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Create indexes
CREATE INDEX idx_phone_numbers_assistant_id ON public.phone_numbers(assistant_id);
CREATE INDEX idx_phone_numbers_e164 ON public.phone_numbers(e164);
CREATE INDEX idx_assistants_user_id ON public.assistants(user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_assistants_updated_at
  BEFORE UPDATE ON public.assistants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();