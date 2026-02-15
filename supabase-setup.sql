-- Smart Bookmark App - Complete Supabase Database Setup  
-- Copy and paste this entire script into Supabase SQL Editor and run it

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create bookmarks table (will not error if it already exists)
CREATE TABLE IF NOT EXISTS bookmarks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS bookmarks_user_id_idx ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS bookmarks_created_at_idx ON bookmarks(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Users can only access their own bookmarks
-- First, check if the policy already exists and drop it if needed
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can manage their own bookmarks' 
        AND tablename = 'bookmarks'
    ) THEN
        DROP POLICY "Users can manage their own bookmarks" ON bookmarks;
    END IF;
END $$;

-- Now create the policy
CREATE POLICY "Users can manage their own bookmarks" 
ON bookmarks 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Enable real-time subscriptions for the bookmarks table
DO $$ 
BEGIN
    -- Add table to realtime publication if not already added
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'bookmarks'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE bookmarks;
    END IF;
EXCEPTION
    WHEN others THEN
        -- If publication doesn't exist or other error, continue
        RAISE NOTICE 'Could not add table to realtime publication: %', SQLERRM;
END $$;

-- Create a function to get user bookmark count (optional utility)
CREATE OR REPLACE FUNCTION get_user_bookmark_count()
RETURNS INTEGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM bookmarks 
        WHERE user_id = auth.uid()
    );
END;
$$;

-- Create a function to get recent bookmarks (optional utility)  
CREATE OR REPLACE FUNCTION get_recent_bookmarks(limit_count INTEGER DEFAULT 10)
RETURNS SETOF bookmarks
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM bookmarks 
    WHERE user_id = auth.uid()
    ORDER BY created_at DESC 
    LIMIT limit_count;
END;
$$;

-- Grant necessary permissions (with error handling)
DO $$
BEGIN
    -- Grant permissions to authenticated users
    GRANT USAGE ON SCHEMA public TO authenticated;
    GRANT ALL ON bookmarks TO authenticated;
    GRANT EXECUTE ON FUNCTION get_user_bookmark_count() TO authenticated;
    GRANT EXECUTE ON FUNCTION get_recent_bookmarks(INTEGER) TO authenticated;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Permission granted with some warnings: %', SQLERRM;
END $$;

-- Insert some test data (optional - remove if you don't want test data)
-- This will only work if you're logged in as a user in Supabase
-- You can remove this section if you prefer starting with an empty database
/*
INSERT INTO bookmarks (user_id, url, title) VALUES 
(auth.uid(), 'https://github.com', 'GitHub - Leading Developer Platform'),
(auth.uid(), 'https://supabase.com', 'Supabase - Open Source Firebase Alternative'),
(auth.uid(), 'https://nextjs.org', 'Next.js - The React Framework');
*/

-- Verify the setup
DO $$
BEGIN
    RAISE NOTICE 'Database setup completed successfully!';
    
    -- Check if table exists
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bookmarks') THEN
        RAISE NOTICE 'Table "bookmarks" created successfully';
    ELSE
        RAISE NOTICE 'WARNING: Table "bookmarks" was not created';
    END IF;
    
    -- Check if RLS is enabled
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid 
               WHERE n.nspname = 'public' AND c.relname = 'bookmarks' AND c.relrowsecurity = true) THEN
        RAISE NOTICE 'Row Level Security enabled on bookmarks table';
    ELSE
        RAISE NOTICE 'WARNING: RLS may not be enabled on bookmarks table';
    END IF;
    
    -- Check if policy exists
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookmarks') THEN
        RAISE NOTICE 'Security policies created for bookmarks table';
    ELSE
        RAISE NOTICE 'WARNING: No security policies found for bookmarks table';
    END IF;
END $$;

-- Show final status
SELECT 
    'Setup Complete' as status,
    't' as table_created,
    count(*) as policies_count,
    'Ready for use' as message
FROM pg_policies 
WHERE tablename = 'bookmarks';