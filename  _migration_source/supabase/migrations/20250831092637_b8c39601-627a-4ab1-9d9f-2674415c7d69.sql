-- Add tools_config column to assistants table for storing tool configurations
ALTER TABLE public.assistants 
ADD COLUMN tools_config JSONB DEFAULT '{}'::jsonb;