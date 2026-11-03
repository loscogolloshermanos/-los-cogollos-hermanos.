# Panel de administración

Proyecto Supabase: `https://lxuqqsrkqdctbinivvun.supabase.co`. Solo se incluye la clave **publishable**, apta para el navegador, en `src/data/supabase.json`. Nunca utilizar una clave secret/service_role en React, GitHub ni el navegador.

## Activación por el propietario

La guía con botón para copiar SQL se publica en `configuracion.html` junto al sitio. Su fuente SQL es `supabase/setup.sql`; el build copia una versión descargable a los assets públicos. No contiene contraseñas ni claves secretas. Ejecutar completo desde SQL Editor con la sesión del propietario. El script es transaccional y repetible, habilita RLS, otorga solamente SELECT a roles web y reserva las escrituras a funciones con autorización interna.

1. Ejecutar `supabase/setup.sql`. Comprobar el resultado correcto y la existencia de las tablas `lch_drafts` y `lch_publications` y el bucket privado `lch-images`.
2. Authentication → URL Configuration: Site URL `https://loscogolloshermanos.github.io/-los-cogollos-hermanos./`; Redirect URLs incluir exactamente `https://loscogolloshermanos.github.io/-los-cogollos-hermanos./?admin=1`. Para desarrollo añadir `http://localhost:5173/?admin=1`.
3. Authentication → Users: invitar **robrtmoral569@gmail.com** si no existe y aceptar la invitación para confirmar el correo. La cuenta del dashboard Supabase no crea este usuario automáticamente.
4. Mantener Email habilitado. Desactivar los registros públicos y los usuarios anónimos. Conservar la plantilla Magic Link predeterminada con `{{ .ConfirmationURL }}`.
5. Abrir `/#/admin` dentro de la URL del proyecto y solicitar el enlace. No se usa PKCE para este flujo porque el usuario abre los correos desde dispositivos y navegadores distintos: Supabase verifica el enlace de un solo uso y entrega la sesión en el fragmento de URL, que el cliente procesa y elimina. No registrar ni compartir esos enlaces. La sesión se guarda en el almacenamiento local del navegador y se elimina al cerrar sesión. `getUser` y `lch_is_admin` comprueban el acceso; la autorización de datos se repite siempre en Supabase.
6. Verificar envío y llegada del correo. El servicio de correo incluido tiene límites y puede restringir destinatarios a miembros del equipo; configurar un SMTP propio si lo exige el uso real. Es una configuración externa, no parte del código frontend.

## Contenido y permisos

- Una fila de borrador contiene `schemaVersion`, `sitio` y `productos`. Cada producto mantiene los campos iniciales y añade `visible`. El contenido de marca incluye portada, foto de Sobre nosotros, títulos y pie, además de los campos anteriores.
- `save_lch_draft(payload, expected_version)` valida la estructura y exige el número de versión actual. Devuelve la nueva versión y fecha. Un conflicto no pisa cambios de otra sesión: descargar copia y recargar antes de reintentar.
- `publish_lch_draft(expected_version)` bloquea la fila de borrador, valida, elimina los productos ocultos, verifica que las fotografías existan y sustituye de forma atómica la publicación. Guarda un índice `_media` calculado en el servidor.
- Los visitantes tienen SELECT únicamente sobre la publicación. Ni usuarios distintos del administrador ni visitantes pueden leer los borradores o escribir tablas directamente. La comprobación de correo usa `auth.users`, el UUID de sesión, correo confirmado y un usuario no anónimo; no confía en metadatos editables ni en datos enviados por el navegador.
- El bucket es privado; SELECT de objetos anónimos solo se autoriza si la ruta pertenece al índice de la publicación. El administrador accede a todos los archivos del bucket. No se permiten sobrescrituras ni cambios de nombre; subir genera una ruta aleatoria nueva.
- Las fotografías no se borran mientras las use el borrador guardado o la publicación. La biblioteca también bloquea referencias locales sin guardar. Para borrar: retirar referencias, guardar, publicar, eliminar.
- Las URL firmadas duran 1 hora y se renuevan mientras la página está abierta o al volver a la pestaña. Los visitantes que ya obtuvieron una URL o descargaron una imagen pueden conservarla hasta la expiración; no es una garantía de revocación instantánea.
- Las cargas se validan por MIME y tamaño en el cliente, se decodifican y se convierten a WebP de máximo 1800 px. El bucket limita MIME y tamaño a WebP/5 MB. Originales admitidos: JPEG, PNG y WebP/15 MB; HEIC no se acepta. El archivo final no conserva los metadatos EXIF originales.
- La biblioteca tiene paginación de 100 fotos; las eliminaciones requieren confirmación. Las copias JSON incluyen referencias, no los binarios. No eliminar el proyecto ni cambiar el bucket a público.

## Compatibilidad y fallos

GitHub Pages aloja el frontend; Supabase suministra datos, autenticación y almacenamiento. El catálogo conserva búsqueda y filtros. Las rutas con hash no necesitan rewrites de servidor. Los JSON originales sirven de semilla y de contenido provisional hasta la activación inicial; una publicación vacía es un catálogo vacío válido y no recupera productos ficticios. Tras activar el panel, editar esos JSON no cambia la publicación remota.

Si falta la tabla de publicaciones o aún no hay fila, se muestra la semilla para conservar disponible la web durante la activación. Otros errores de red muestran un aviso y reintento: no se sustituyen silenciosamente productos reales por ejemplos. Los errores de fotos conservan el contenido y utilizan placeholders. Las sesiones no autorizadas no montan el editor. El panel muestra una guía si faltan funciones/tablas; nunca simula una escritura exitosa.

## Verificación

`npm test` comprueba búsqueda, validación, publicación de productos visibles y permisos SQL con PostgreSQL embebido (PGlite) y usuarios simulados, incluyendo intentos de escritura no autorizados. Esto no sustituye la prueba en el proyecto real de Supabase. `npm run test:browser` verifica el frontend con respuestas de API controladas. Usar `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` si se utiliza Chromium del sistema; de lo contrario instalarlo mediante Playwright. `npm run build` valida la semilla, prepara el SQL descargable y compila.

Antes de dar por activada la integración real, ejecutar el SQL y comprobar con el propietario: correo recibido, sesión iniciada, cambio de borrador invisible en incógnito, publicación visible al recargar, subida y reordenación de fotos, denegación de otra cuenta y de solicitudes anónimas. El código y despliegue no acreditan esos pasos si el propietario todavía no configuró Supabase.
