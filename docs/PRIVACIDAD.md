# Revisión de exposición pública — 2026-11-03

## Corregido en la versión actual

- El acceso empieza con un campo de correo vacío, editable, sin identificador administrador incrustado. Se solicita al navegador que no lo autocomplete; las preferencias del usuario pueden prevalecer.
- El frontend no contiene la dirección del propietario. Después de verificar la sesión, la función protegida de Supabase decide si corresponde al administrador.
- La barra del panel muestra «Sesión de administrador». Las respuestas del formulario no confirman si un correo está registrado o autorizado.
- La guía de instalación y el SQL descargable se retiraron del sitio publicado. Las instrucciones técnicas y una plantilla sin correo personal se conservan en el repositorio. La plantilla aborta sin cambios si no se personaliza.
- Las pruebas utilizan correos y UUID ficticios. La documentación no identifica al propietario.

La autorización existente en Supabase no cambia. No hay que repetir el SQL, crear usuarios ni reinvitar al administrador.

## Comprobaciones en el servicio publicado

Sin iniciar sesión se verificó:

- La publicación expone el catálogo y las imágenes que el propietario decidió publicar; no se encontraron correos ni marcadores de claves secretas en ese documento.
- La tabla de borradores y el listado de usuarios de autenticación rechazan solicitudes anónimas.
- La función de autorización devuelve falso para una solicitud anónima.
- El listado anónimo del almacenamiento solo devolvió fotos referenciadas en la publicación. No expuso fotos adicionales del borrador.
- El perfil público de GitHub no mostró correo ni ubicación en el momento de la revisión.

Las pruebas automatizadas también comprueban que otra cuenta autenticada no pueda leer borradores, guardar, publicar ni subir archivos. No se intentaron escrituras reales ni se enviaron correos durante esta revisión.

## Información que es pública por diseño

- Nombre de marca, productos, descripciones, disponibilidad, fotos publicadas y enlaces de redes.
- Cuenta y nombre del repositorio de GitHub, código de la web, rutas y estructura general del panel.
- URL del proyecto de Supabase y clave publishable. Esta clave identifica la aplicación; no sustituye una sesión ni permite operaciones administrativas. Nunca incluir claves secret/service_role, contraseñas ni enlaces de acceso.
- Las fotos publicadas son visibles para visitantes. Sus enlaces firmados duran hasta una hora; las copias descargadas no pueden revocarse.

## Historial anterior: pendiente de una decisión del propietario

El repositorio es público. Versiones anteriores contenían el correo del propietario en código, documentación, SQL y pruebas. El primer commit también lo incluye como dirección del autor.

Cambiar los archivos actuales no borra esos commits. Reescribir el historial cambiaría sus identificadores y requeriría una actualización forzada del repositorio; no se realizó como parte de esta corrección. Incluso tras una limpieza, pueden persistir clones, cachés y enlaces antiguos; para ciertos rastros puede ser necesario contactar con GitHub.

Para futuros commits del propietario, activar «Keep my email addresses private» y «Block command line pushes that expose my email» en GitHub → Settings → Emails. Las actualizaciones automáticas de este proyecto utilizan una dirección noreply de GitHub.

## Límites

Es una revisión de los archivos actuales, contenido público y controles indicados; no constituye una auditoría completa de seguridad ni garantiza eliminación de información ya publicada. No se revisaron mensajes privados, dispositivos del propietario ni servicios de terceros ajenos a la web.
