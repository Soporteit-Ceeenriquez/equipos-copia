import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Función simple para parsear CSV delimitado por coma
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line =>
    line.split(',').map(cell => cell.trim())
  );
  return rows.map(row =>
    Object.fromEntries(headers.map((h, i) => [h, row[i] ?? '']))
  );
}

export async function POST(req) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  let equipos = [];
  const contentType = req.headers.get('content-type') || '';

  try {
    if (contentType.includes('text/csv')) {
      // Procesar CSV
      const text = await req.text();
      equipos = parseCSV(text);
    } else {
      return NextResponse.json({ error: 'Formato de archivo no soportado.' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Archivo inválido.' }, { status: 400 });
  }

  // Validar columnas requeridas
  const required = ['codigo', 'tipo_de_equipos'];
  for (const eq of equipos) {
    for (const col of required) {
      if (!eq[col]) {
        return NextResponse.json({ error: `Falta el campo obligatorio: ${col}` }, { status: 400 });
      }
    }
  }

  // Insertar o actualizar equipos
  for (const eq of equipos) {
    const { error } = await supabase
      .from('equipos')
      .upsert(
        {
          codigo: eq.codigo,
          tipo_de_equipos: eq.tipo_de_equipos,
          capacidad_informada: eq.capacidad_informada || '',
          detalle_planilla_mpt: eq.detalle_planilla_mpt || '',
          detalles: eq.detalles || '',
        },
        { onConflict: 'codigo' }
      );
    if (error) {
      return NextResponse.json({ error: `Error en código ${eq.codigo}: ${error.message}` }, { status: 400 });
    }
  }

  // Traer equipos actualizados
  const { data, error } = await supabase.from('equipos').select('*').order('codigo');
  if (error) {
    return NextResponse.json({ error: 'Error al obtener equipos.' }, { status: 500 });
  }

  return NextResponse.json({ equipos: data });
}
