import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gcybwwvhxbzkbyjuunfz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjeWJ3d3ZoeGJ6a2J5anV1bmZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4Nzc5NzgsImV4cCI6MjA5MzQ1Mzk3OH0._dMC-VKuD94rOUmvLWkbQQMnskBnRUt0AzgikBP1e-c';

export const supabase = createClient(supabaseUrl, supabaseKey);
