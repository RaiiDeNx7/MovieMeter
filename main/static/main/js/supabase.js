// main/static/main/js/supabase.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ✅ Connect to your Supabase project (safe public anon key)
export const supabase = createClient(
  "https://fdjjnwqduhsnmfothrpf.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkampud3FkdWhzbm1mb3RocnBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NjMxNzYsImV4cCI6MjA3NzQzOTE3Nn0.29pmxdKIiW9IY-t6HRcMOzXU0rbLiNeMDgxgPmyoAjA"
);
