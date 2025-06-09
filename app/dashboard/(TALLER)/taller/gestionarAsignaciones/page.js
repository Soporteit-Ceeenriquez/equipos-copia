"use client";
import { supabase } from "@/utils/supabase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function formatFecha(fecha) {
  if (!fecha) return "-";
  const d = new Date(fecha);
  return d.toLocaleDateString("es-AR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default function GestionAsignaciones() {
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [asignaciones, setAsignaciones] = useState([]);
  const [unidadFiltro, setUnidadFiltro] = useState("");
  const [codigoFiltro, setCodigoFiltro] = useState("");
  const [unidadesNegocio, setUnidadesNegocio] = useState([]);
  const [codigosEquipo, setCodigosEquipo] = useState([]);
  const [solicitudesMap, setSolicitudesMap] = useState({});
  const [pagina, setPagina] = useState(1);
  const filasPorPagina = 8;
  const [totalPaginas, setTotalPaginas] = useState(1);
  const router = useRouter();

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
      if (!(data.isTaller || data.isAdmin)) {
        router.replace("/dashboard");
        return;
      }
      setCheckingAccess(false);
    };
    validar();
  }, [router]);

  useEffect(() => {
    if (!checkingAccess) fetchAsignaciones();
    // eslint-disable-next-line
  }, [checkingAccess, unidadFiltro, codigoFiltro]);

  useEffect(() => {
    setPagina(1); // Reinicia a la primera página si cambian los filtros
  }, [unidadFiltro, codigoFiltro]);

  useEffect(() => {
    // Actualiza el total de páginas cuando cambian las asignaciones
    setTotalPaginas(Math.max(1, Math.ceil(asignaciones.length / filasPorPagina)));
  }, [asignaciones]);

  async function fetchAsignaciones() {
    // 1. Traer asignaciones
    let query = supabase
      .from("asignaciones")
      .select(`
        codigo_equipo,
        id_solicitud,
        fecha_inicio_asignacion,
        fecha_fin_asignacion,
        es_reemplazo,
        motivo_reemplazo,
        fecha_asignacion
      `);

    if (codigoFiltro) {
      query = query.eq("codigo_equipo", codigoFiltro);
    }

    const { data: asignacionesData, error } = await query;
    if (error) return;

    // 2. Traer solicitudes relacionadas
    const ids = [...new Set((asignacionesData || []).map(a => a.id_solicitud).filter(Boolean))];
    let solicitudesMap = {};
    let unidades = [];
    if (ids.length > 0) {
      const { data: solicitudes } = await supabase
        .from("solicitudes_equipos")
        .select("id_solicitud, unidad_de_negocio")
        .in("id_solicitud", ids);

      solicitudesMap = {};
      if (solicitudes) {
        solicitudes.forEach(s => {
          solicitudesMap[s.id_solicitud] = s.unidad_de_negocio;
        });
        unidades = [...new Set(solicitudes.map(s => s.unidad_de_negocio).filter(Boolean))];
      }
    }

    // 3. Filtrar por unidad de negocio si corresponde
    let filtradas = asignacionesData;
    if (unidadFiltro) {
      filtradas = filtradas.filter(a => solicitudesMap[a.id_solicitud] === unidadFiltro);
    }

    setAsignaciones(filtradas || []);
    setSolicitudesMap(solicitudesMap);
    setUnidadesNegocio(unidades);
    // Codigos de equipo únicos
    const codigos = [
      ...new Set(
        (asignacionesData || [])
          .map((a) => a.codigo_equipo)
          .filter(Boolean)
      ),
    ];
    setCodigosEquipo(codigos);
  }

  function cerrarSesion() {
    supabase.auth.signOut();
    router.replace("/login");
  }

  if (checkingAccess) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-lg text-gray-700 dark:text-gray-200">
          Verificando acceso...
        </p>
      </main>
    );
  }

  // Datos paginados
  const asignacionesPaginadas = asignaciones.slice(
    (pagina - 1) * filasPorPagina,
    pagina * filasPorPagina
  );

  return (
    <main className="min-h-screen flex flex-col items-center bg-gray-50 dark:bg-gray-900 p-6">
      <div className="w-full max-w-6xl flex justify-between items-center mb-4">
        <button
          className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded font-semibold shadow hover:bg-gray-400 dark:hover:bg-gray-600 transition"
          onClick={() => router.push("/dashboard/taller")}
        >
          ← Volver
        </button>
        <button
          className="px-4 py-2 bg-red-600 text-white rounded font-semibold shadow hover:bg-red-700 transition"
          onClick={cerrarSesion}
        >
          Cerrar sesión
        </button>
      </div>
      <h1 className="text-2xl font-bold text-blue-700 dark:text-blue-300 mb-6">
        Asignaciones de Equipos
      </h1>
      <div className="w-full max-w-6xl mb-4 flex items-center gap-4">
        <label className="font-semibold">Filtrar por unidad de negocio:</label>
        <select
          className="p-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          value={unidadFiltro}
          onChange={(e) => setUnidadFiltro(e.target.value)}
        >
          <option value="">Todas</option>
          {unidadesNegocio.map((un) => (
            <option key={un} value={un}>
              {un}
            </option>
          ))}
        </select>
      </div>
      <div className="w-full max-w-6xl mb-4 flex items-center gap-4">
        <label className="font-semibold">Filtrar por código de equipo:</label>
        <select
          className="p-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          value={codigoFiltro}
          onChange={(e) => setCodigoFiltro(e.target.value)}
        >
          <option value="">Todos</option>
          {codigosEquipo.map((codigo) => (
            <option key={codigo} value={codigo}>
              {codigo}
            </option>
          ))}
        </select>
      </div>
      <div className="w-full max-w-7xl overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-blue-100 dark:bg-blue-900/30 text-center">
              <th className="px-4 py-2 text-center">ID Solicitud</th>
              <th className="px-4 py-2 text-center">Código Equipo</th>
              <th className="px-4 py-2 text-center">Unidad de Negocio</th>
              <th className="px-4 py-2 text-center">Fecha Inicio</th>
              <th className="px-4 py-2 text-center">Fecha Fin</th>
              <th className="px-4 py-2 text-center">Es Reemplazo</th>
              <th className="px-4 py-2 text-center">Motivo Reemplazo</th>
              <th className="px-4 py-2 text-center">Fecha Asignación</th>
            </tr>
          </thead>
          <tbody>
            {asignacionesPaginadas.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-4 text-gray-500">
                  No hay asignaciones para mostrar.
                </td>
              </tr>
            )}
            {asignacionesPaginadas.map((a, idx) => (
              <tr key={idx} className="border-b last:border-b-0 text-center">
                <td className="px-4 py-2">{a.id_solicitud}</td>
                <td className="px-4 py-2">{a.codigo_equipo}</td>
                <td className="px-4 py-2">{solicitudesMap[a.id_solicitud] || "-"}</td>
                <td className="px-4 py-2">{formatFecha(a.fecha_inicio_asignacion)}</td>
                <td className="px-4 py-2">{formatFecha(a.fecha_fin_asignacion)}</td>
                <td className="px-4 py-2">{a.es_reemplazo ? "Sí" : "No"}</td>
                <td className="px-4 py-2">{a.motivo_reemplazo || "-"}</td>
                <td className="px-4 py-2">{formatFecha(a.fecha_asignacion)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Paginación */}
        <div className="flex justify-center items-center gap-4 mt-4">
          <button
            className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold disabled:opacity-50"
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={pagina === 1}
          >
            Anterior
          </button>
          <span className="font-semibold text-gray-700 dark:text-gray-200">
            Página {pagina} de {totalPaginas}
          </span>
          <button
            className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold disabled:opacity-50"
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={pagina === totalPaginas}
          >
            Siguiente
          </button>
        </div>
      </div>
    </main>
  );
}
