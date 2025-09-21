-- Add Twilio credentials columns to assistants table
-- These columns will store Subaccount credentials for each assistant

ALTER TABLE public.assistants 
ADD COLUMN twilio_account_sid TEXT,
ADD COLUMN twilio_auth_token TEXT;

-- Add comments to document the purpose and security considerations
COMMENT ON COLUMN public.assistants.twilio_account_sid IS 'Twilio Subaccount SID for this assistant';
COMMENT ON COLUMN public.assistants.twilio_auth_token IS 'Twilio Subaccount Auth Token - SENSITIVE DATA: should be encrypted at application level before storage';