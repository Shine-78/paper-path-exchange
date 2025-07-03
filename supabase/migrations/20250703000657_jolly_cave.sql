/*
  # Add Initial Admin User

  1. Admin Setup
    - Add the specified admin email to admin_users table
    - This will be done after the user signs up

  2. Notes
    - The admin user must first sign up through the normal flow
    - Then this migration will grant them admin privileges
*/

-- Function to add admin user (will be called after user registration)
CREATE OR REPLACE FUNCTION add_initial_admin()
RETURNS void AS $$
BEGIN
  -- Add admin user if they exist in profiles
  INSERT INTO admin_users (user_id)
  SELECT id FROM profiles 
  WHERE email = 'arnabmanna203@gmail.com'
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The admin user needs to sign up first, then this function can be called
-- This is handled in the application code when checking admin status