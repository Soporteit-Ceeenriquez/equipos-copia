import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // Trae el último registro
  const { data, error } = await supabase
    .from('user_registration_status')
    .select('is_registration_open')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return Response.json({ habilitado: false }, { status: 200 });
  }

  return Response.json({ habilitado: !!data.is_registration_open }, { status: 200 });
}