# Gestión de Equipos CEE

Aplicación web para la gestión y asignación de equipos en el CEE.

## Funcionalidad principal
- Registro y autenticación de usuarios con roles (administrador, solicitante, taller).
- Asignación, consulta y gestión de equipos.
- Validación de roles y permisos desde el backend para seguridad.
- Consulta de equipos asignados por fecha y usuario.

## Tecnologías
- Next.js (App Router)
- Supabase (autenticación y base de datos)
- CSS personalizado

## Desarrollo local

Instala dependencias:

```bash
npm install
```

Inicia el servidor de desarrollo:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

Para detalles de la lógica de asignaciones, validación de roles y estructura de la base de datos, consulta el código fuente y la carpeta `app/api/`.
