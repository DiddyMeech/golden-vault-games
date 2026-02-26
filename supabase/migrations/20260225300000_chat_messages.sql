CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  username text,
  is_vip boolean DEFAULT false,
  message text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read chat messages
CREATE POLICY "Public chat reads" ON public.chat_messages
  FOR SELECT USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Users can insert chat" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Optionally, we can track rain events in a simple config/kv table
CREATE TABLE IF NOT EXISTS public.system_config (
  key text PRIMARY KEY,
  value jsonb
);

INSERT INTO public.system_config (key, value) VALUES ('last_rain', '{"timestamp": 0}'::jsonb) ON CONFLICT DO NOTHING;
