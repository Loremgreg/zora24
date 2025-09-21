-- Add tools_config column to assistants table for storing tool configurations
ALTER TABLE public.assistants 
ADD COLUMN tools_config JSONB DEFAULT '{}'::jsonb;

-- Update the updated_at trigger to include the new column
CREATE TRIGGER update_assistants_updated_at
BEFORE UPDATE ON public.assistants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();