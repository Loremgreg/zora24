-- Drop triggers first, then recreate function and triggers
DROP TRIGGER IF EXISTS update_assistants_updated_at ON public.assistants;
DROP TRIGGER IF EXISTS update_phone_numbers_updated_at ON public.phone_numbers;
DROP FUNCTION IF EXISTS public.update_updated_at_column();

-- Recreate the function with proper security settings
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate the triggers
CREATE TRIGGER update_assistants_updated_at
  BEFORE UPDATE ON public.assistants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_phone_numbers_updated_at
  BEFORE UPDATE ON public.phone_numbers  
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();