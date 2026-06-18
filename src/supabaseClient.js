import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mkmdprwqcviwlxqbhpiz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rbWRwcndxY3Zpd2x4cWJocGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NTI5NDEsImV4cCI6MjA5NzEyODk0MX0.iTy1cCfCzBAAzz4GVtpNZMwNK4bEEt0_n6Lw-TlvvTk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
