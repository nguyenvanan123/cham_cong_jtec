import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type AttendanceRecord = {
  id: string;
  employee_id: string;
  full_name: string;
  work_date: string;
  shift: string;
  action_type: "check-in" | "check-out";
  image_url: string | null;
  created_at: string;
};

export type Config = {
  id: string;
  key: string;
  value: string;
};
