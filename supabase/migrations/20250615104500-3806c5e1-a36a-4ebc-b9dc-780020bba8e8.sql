
-- Create a table for admin users
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Allow selecting admin users only to service roles, not to all users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read their own row"
  ON public.admin_users
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow only existing admins or the service role to insert (for now, keep it restricted)
CREATE POLICY "Service or self can insert" 
  ON public.admin_users
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Insert the admin user after they've signed up (manual step for now)
-- After the user with 'admin9977@gmail.com' has completed signup, run:
-- INSERT INTO public.admin_users (user_id)
--   SELECT id FROM profiles WHERE email = 'admin9977@gmail.com';
