export const SCHEMA_VERSION = 1;
export const MEDIA_PREFIX = "media/";
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const MAX_STORED_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export function mediaPaths(doc) {
  const values = [doc.sitio.logo, doc.sitio.portada, doc.sitio.fotoNosotros];
  for (const p of doc.productos) values.push(p.imagen, ...p.galeria);
  return [
    ...new Set(
      values.filter((v) => typeof v === "string" && v.startsWith(MEDIA_PREFIX)),
    ),
  ];
}
export function publicDocument(doc) {
  return {
    ...structuredClone(doc),
    productos: doc.productos.filter((p) => p.visible !== false),
  };
}
export function validImagePath(value) {
  return (
    typeof value === "string" &&
    (/^images\/[a-zA-Z0-9_-]+\.(svg|webp|avif|jpg|jpeg|png)$/.test(value) ||
      /^media\/[a-zA-Z0-9_-]+\.webp$/.test(value))
  );
}
export function validateDocument(doc) {
  if (
    !doc ||
    doc.schemaVersion !== SCHEMA_VERSION ||
    !doc.sitio ||
    !Array.isArray(doc.productos)
  )
    throw new Error("El formato del catálogo no es compatible.");
  const s = doc.sitio;
  for (const k of [
    "nombre",
    "frase",
    "introduccion",
    "historia",
    "filosofia",
    "etiquetaPortada",
    "tituloCatalogo",
    "textoCatalogo",
    "tituloNosotros",
    "tituloContacto",
    "textoContacto",
    "pie",
  ]) {
    if (
      typeof s[k] !== "string" ||
      s[k].length > 10000 ||
      (k === "nombre" && !s[k].trim())
    )
      throw new Error(`Revisa el texto «${k}».`);
  }
  if (typeof s.demostracion !== "boolean" || !Array.isArray(s.redes))
    throw new Error("Revisa los ajustes del sitio.");
  for (const key of ["logo", "portada", "fotoNosotros"])
    if (!validImagePath(s[key]))
      throw new Error(`Selecciona una imagen válida para ${key}.`);
  if (s.redes.length > 20 || doc.productos.length > 500)
    throw new Error("El catálogo admite hasta 500 productos y 20 redes.");
  for (const r of s.redes) {
    if (
      typeof r.nombre !== "string" ||
      !r.nombre.trim() ||
      typeof r.url !== "string"
    )
      throw new Error("Cada red necesita un nombre.");
    if (r.url) {
      let url;
      try {
        url = new URL(r.url);
      } catch {
        throw new Error("Usa enlaces completos https:// en las redes.");
      }
      if (url.protocol !== "https:" || url.username || url.password)
        throw new Error(
          "Las redes necesitan enlaces https:// sin credenciales.",
        );
    }
  }
  const ids = new Set();
  for (const p of doc.productos) {
    if (typeof p.id !== "string" || !p.id || ids.has(p.id))
      throw new Error("Los productos necesitan identificadores únicos.");
    ids.add(p.id);
    for (const k of [
      "nombre",
      "categoria",
      "descripcion",
      "descripcionCompleta",
    ])
      if (typeof p[k] !== "string" || !p[k].trim() || p[k].length > 10000)
        throw new Error(`Completa ${k} del producto «${p.nombre || "nuevo"}».`);
    if (
      !validImagePath(p.imagen) ||
      !Array.isArray(p.galeria) ||
      p.galeria.length > 12 ||
      !p.galeria.every(validImagePath)
    )
      throw new Error(
        `Revisa las fotos de «${p.nombre}» (máximo 12 en la galería).`,
      );
    if (
      !p.caracteristicas ||
      Array.isArray(p.caracteristicas) ||
      typeof p.caracteristicas !== "object" ||
      Object.entries(p.caracteristicas).some(
        ([k, v]) =>
          !k.trim() ||
          typeof v !== "string" ||
          !v.trim() ||
          k.length > 200 ||
          v.length > 2000,
      )
    )
      throw new Error(`Revisa las características de «${p.nombre}».`);
    if (
      ["visible", "disponible", "destacado"].some(
        (k) => typeof p[k] !== "boolean",
      )
    )
      throw new Error(
        "Los estados del producto deben ser verdaderos o falsos.",
      );
  }
  if (JSON.stringify(doc).length > 1000000)
    throw new Error("El contenido es demasiado grande. Reduce los textos.");
  return doc;
}
export function validateUpload(file) {
  if (!file || !ALLOWED_IMAGE_TYPES.includes(file.type))
    throw new Error(
      "Elige una foto JPEG, PNG o WebP. Convierte HEIC a JPEG antes de subirla.",
    );
  if (!file.size || file.size > MAX_UPLOAD_BYTES)
    throw new Error("La fotografía debe pesar entre 1 byte y 15 MB.");
}
export function explainError(error) {
  const msg = error?.message || "";
  if (/CONFLICT/.test(msg))
    return "Hay cambios guardados desde otra pestaña. Descarga una copia si la necesitas y recarga el borrador antes de continuar.";
  if (
    /PGRST20[25]|schema cache|does not exist|Could not find the function/i.test(
      msg,
    ) ||
    ["PGRST205", "PGRST202"].includes(error?.code)
  )
    return "Falta ejecutar la configuración SQL de Supabase. Consulta la guía de activación.";
  if (
    /ADMIN_ONLY|permission denied|row-level security|not authorized/i.test(msg)
  )
    return "Tu sesión no tiene permiso para esta acción. Vuelve a iniciar sesión con el correo administrador.";
  if (/Failed to fetch|NetworkError|network|Load failed/i.test(msg))
    return "No se pudo conectar. Revisa tu conexión y vuelve a intentarlo.";
  if (/rate limit|too many requests/i.test(msg))
    return "Se han realizado demasiados intentos. Espera unos minutos antes de solicitar otro enlace.";
  if (/otp_expired|expired|invalid.*token/i.test(msg))
    return "El enlace ha caducado o ya se utilizó. Solicita uno nuevo.";
  return msg || "No se pudo completar la operación. Inténtalo de nuevo.";
}
