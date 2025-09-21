-- Create a test assistant with proper UUID for testing
INSERT INTO public.assistants (name, voice_id, user_id)
VALUES ('Assistant Test', 'default-voice', auth.uid());