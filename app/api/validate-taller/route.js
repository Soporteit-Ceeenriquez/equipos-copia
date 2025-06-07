import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  const { token } = await request.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // Valida el token y obtiene el usuario
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return Response.json({ isTaller: false }, { status: 401 });
  }

  // Consulta el rol en la tabla user_roles
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (roleData?.role === 'admin') {
    return Response.json({ isTaller: true, isAdmin: true });
  }
  if (roleData?.role === 'taller') {
    return Response.json({ isTaller: true, isAdmin: false });
  } else {
    return Response.json({ isTaller: false }, { status: 403 });
  }
}

