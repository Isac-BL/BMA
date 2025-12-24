
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://omhrrjczzretuzqdxnyo.supabase.co";
const supabaseAnonKey = "sb_publishable_khGwxf8hRNtWna3K4DjHQA_IwWb4mv0";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
