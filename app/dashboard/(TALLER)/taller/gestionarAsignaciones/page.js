"use client";
import { supabase } from "@/utils/supabase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Utilidad para formatear fecha tipo dd/mm/yyyy
function formatearFechaArg(fecha) {
  if (!fecha) return '-';
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    const [anio, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${anio}`;
  }
  const d = new Date(fecha);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const anio = d.getFullYear();
  return `${dia}/${mes}/${anio}`;
}

// Utilidad para saber si un rango de fechas solapa con un mes (igual que en asignarEquipos)
function rangoSolapaConMes(fechaDesde, fechaHasta, filtroMes) {
  // filtroMes: 'YYYY-MM'
  const [anio, mes] = filtroMes.split('-');
  const inicioMes = new Date(`${anio}-${mes}-01`);
  const finMes = new Date(inicioMes);
  finMes.setMonth(finMes.getMonth() + 1);
  finMes.setDate(0); // último día del mes

  // Normaliza fechas (soporta dd/mm/yyyy y yyyy-mm-dd)
  function parseFecha(f) {
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(f)) {
      const [d, m, y] = f.split('/');
      return new Date(`${y}-${m}-${d}`);
    }
    return new Date(f);
  }

  const desde = parseFecha(fechaDesde);
  const hasta = parseFecha(fechaHasta);

  // ¿Hay solapamiento?
  return desde <= finMes && hasta >= inicioMes;
}

export default function GestionAsignaciones() {
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [autorizado, setAutorizado] = useState(false);
  const [asignaciones, setAsignaciones] = useState([]);
  const [filtroUnidad, setFiltroUnidad] = useState("todos");
  const [filtroFecha, setFiltroFecha] = useState(""); // ahora será mes tipo 'YYYY-MM'
  const [showEliminarAsignacionModal, setShowEliminarAsignacionModal] = useState(false);
  const [asignacionAEliminar, setAsignacionAEliminar] = useState(null);
  const [solicitudAsociada, setSolicitudAsociada] = useState(null);
  const router = useRouter();

  // Validación de acceso
  useEffect(() => {
    const validar = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        router.replace("/login");
        return;
      }
      const res = await fetch("/api/validate-taller", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.isTaller || data.isAdmin) {
        setAutorizado(true);
      } else {
        router.replace("/dashboard");
      }
      setCheckingAccess(false);
    };
    validar();
  }, [router]);

  // Traer asignaciones
  useEffect(() => {
    if (!autorizado) return;
    const fetchAsignaciones = async () => {
      let query = supabase
        .from("asignaciones_por_unidad_de_negocio")
        .select("id,equipo,asignado_desde,asignado_hasta,fecha_de_asignacion,unidad_de_negocio");

      if (filtroUnidad && filtroUnidad !== "todos") {
        query = query.eq("unidad_de_negocio", filtroUnidad);
      }
      if (filtroFecha) {
        query = query.gte("asignado_desde", filtroFecha).lte("asignado_hasta", filtroFecha);
      }

      const { data, error } = await query;
      if (!error) setAsignaciones(data || []);
      else setAsignaciones([]);
    };
    fetchAsignaciones();
  }, [autorizado, filtroUnidad, filtroFecha]);

  // Función para buscar la solicitud asociada a una asignación
  async function buscarSolicitudAsociada(asignacion) {
    if (!asignacion) return null;
    // Traer solicitudes que coincidan con equipo y fechas
    const { data: solicitudes } = await supabase
      .from("solicitudes_equipos")
      .select("id, unidad_de_negocio, tipo, capacidad, fecha_desde, fecha_hasta, observaciones, equipo_asignado, editadoportaller, fechadesdeeditada")
      .eq("equipo_asignado", asignacion.equipo);

    // Buscar la solicitud que coincida en fechas (usando editadoportaller)
    const encontrada = (solicitudes || []).find(s => {
      const desdeSol = s.editadoportaller && s.fechadesdeeditada ? s.fechadesdeeditada : s.fecha_desde;
      return (
        desdeSol === asignacion.asignado_desde &&
        s.fecha_hasta === asignacion.asignado_hasta
      );
    });
    setSolicitudAsociada(encontrada || null);
  }

  // Al hacer click en eliminar asignación
  const handleEliminarAsignacion = async (asig) => {
    setAsignacionAEliminar(asig);
    setShowEliminarAsignacionModal(true);
    setSolicitudAsociada(null);
    await buscarSolicitudAsociada(asig);
  };

  if (checkingAccess) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-lg text-gray-700 dark:text-gray-200">
          Verificando acceso...
        </p>
      </main>
    );
  }

  // Unidades únicas para el filtro
  const unidades = [
    ...new Set(asignaciones.map(a => a.unidad_de_negocio).filter(Boolean))
  ];

  // Filtro visual
  const asignacionesFiltradas = asignaciones.filter(a => {
    let pasa = true;
    if (filtroUnidad !== "todos" && filtroUnidad) {
      pasa = a.unidad_de_negocio === filtroUnidad;
    }
    if (filtroFecha) {
      pasa = pasa && rangoSolapaConMes(a.asignado_desde, a.asignado_hasta, filtroFecha);
    }
    return pasa;
  });

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-7xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 flex flex-col items-center">
        <div className="w-full flex justify-start mb-4">
          <button
            onClick={() => router.push('/dashboard/taller')}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md text-sm font-semibold shadow hover:bg-gray-300 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 transition"
          >
            ← Volver
          </button>
        </div>
        <h1 className="text-3xl font-bold text-blue-700 dark:text-blue-300 mb-4">
          Gestión de Equipos por Unidad de Negocio
        </h1>
        <div className="w-full flex flex-wrap gap-4 mb-6 items-end justify-center">
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-200">Unidad de Negocio</label>
            <select
              value={filtroUnidad}
              onChange={e => setFiltroUnidad(e.target.value)}
              className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100"
            >
              <option value="todos">Todas</option>
              {unidades.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-200">Fecha</label>
            <input
              type="month"
              value={filtroFecha}
              onChange={e => setFiltroFecha(e.target.value)}
              className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100"
            />
          </div>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="min-w-[900px] w-full text-sm text-left">
            <thead>
              <tr className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <th className="px-2 py-2 text-center">Equipo</th>
                <th className="px-2 py-2 text-center">Asignado desde</th>
                <th className="px-2 py-2 text-center">Asignado hasta</th>
                <th className="px-2 py-2 text-center">Fecha de asignación</th>
                {filtroUnidad === "todos" && (
                  <th className="px-2 py-2 text-center">Unidad de Negocio</th>
                )}
                <th className="px-2 py-2 text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {asignacionesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={filtroUnidad === "todos" ? 6 : 5} className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No hay asignaciones para mostrar.
                  </td>
                </tr>
              ) : (
                asignacionesFiltradas.map(a => (
                  <tr key={a.id} className="border-b last:border-b-0 hover:bg-gray-100 dark:hover:bg-gray-900">
                    <td className="px-2 py-1 text-center">{a.equipo}</td>
                    <td className="px-2 py-1 text-center">{formatearFechaArg(a.asignado_desde)}</td>
                    <td className="px-2 py-1 text-center">{formatearFechaArg(a.asignado_hasta)}</td>
                    <td className="px-2 py-1 text-center">{formatearFechaArg(a.fecha_de_asignacion)}</td>
                    {filtroUnidad === "todos" && (
                      <td className="px-2 py-1 text-center">{a.unidad_de_negocio}</td>
                    )}
                    <td className="px-2 py-1 text-center">
                      <button
                        onClick={() => handleEliminarAsignacion(a)}
                        className="px-3 py-1 bg-red-600 text-white rounded font-semibold shadow hover:bg-red-700 transition text-xs"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para eliminar asignación */}
      {showEliminarAsignacionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 w-full max-w-md flex flex-col items-center border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-100 text-center">
              ¿Está seguro que desea eliminar esta asignación?
            </h2>
            <p className="mb-4 text-gray-700 dark:text-gray-200 text-center">
              Equipo: <span className="font-semibold">{asignacionAEliminar?.equipo}</span><br />
              Unidad de negocio: <span className="font-semibold">{asignacionAEliminar?.unidad_de_negocio}</span><br />
              Desde: <span className="font-semibold">{formatearFechaArg(asignacionAEliminar?.asignado_desde)}</span><br />
              Hasta: <span className="font-semibold">{formatearFechaArg(asignacionAEliminar?.asignado_hasta)}</span>
            </p>
            {solicitudAsociada && (
              <div className="mb-4 w-full bg-yellow-100 dark:bg-yellow-900 rounded p-3 text-sm text-yellow-800 dark:text-yellow-200">
                <div className="font-semibold mb-1">Solicitud asociada encontrada:</div>
                <div>Unidad de negocio: <span className="font-semibold">{solicitudAsociada.unidad_de_negocio}</span></div>
                <div>Tipo: <span className="font-semibold">{solicitudAsociada.tipo}</span></div>
                <div>Desde: <span className="font-semibold">{formatearFechaArg(solicitudAsociada.editadoportaller && solicitudAsociada.fechadesdeeditada ? solicitudAsociada.fechadesdeeditada : solicitudAsociada.fecha_desde)}</span></div>
                <div>Hasta: <span className="font-semibold">{formatearFechaArg(solicitudAsociada.fecha_hasta)}</span></div>
              </div>
            )}
            {!solicitudAsociada && (
              <div className="mb-4 w-full text-sm text-gray-600 dark:text-gray-300 text-center">
                No se encontró una solicitud asociada a esta asignación.
              </div>
            )}
            <div className="flex gap-2 w-full">
              <button
                onClick={() => {
                  setShowEliminarAsignacionModal(false);
                  setAsignacionAEliminar(null);
                  setSolicitudAsociada(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  // Elimina la asignación
                  await supabase
                    .from('asignaciones_por_unidad_de_negocio')
                    .delete()
                    .eq('id', asignacionAEliminar.id);

                  // Si hay solicitud asociada, actualiza equipo_asignado a null
                  if (solicitudAsociada) {
                    await supabase
                      .from('solicitudes_equipos')
                      .update({ equipo_asignado: null })
                      .eq('id', solicitudAsociada.id);
                  }

                  setShowEliminarAsignacionModal(false);
                  setAsignacionAEliminar(null);
                  setSolicitudAsociada(null);
                  // Refresca la tabla
                  const { data, error } = await supabase
                    .from("asignaciones_por_unidad_de_negocio")
                    .select("id,equipo,asignado_desde,asignado_hasta,fecha_de_asignacion,unidad_de_negocio");
                  setAsignaciones(data || []);
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded font-semibold hover:bg-red-700 transition"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
