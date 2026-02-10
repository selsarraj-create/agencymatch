SELECT * FROM pg_tables WHERE schemaname = 'public';
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profiles';
