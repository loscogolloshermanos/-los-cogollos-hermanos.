import initialProducts from "../data/productos.json";
import initialSite from "../data/sitio.json";
import { publicSupabase, supabase } from "./supabase";
import { mediaPaths, validateDocument } from "../utils/documento";
export const initialDocument = {
  schemaVersion: 1,
  sitio: {
    ...initialSite,
    portada: "images/hero.svg",
    fotoNosotros: "images/hero.svg",
    etiquetaPortada: "UNA IDENTIDAD. NUESTRA ESENCIA.",
    tituloCatalogo: "El catálogo.",
    textoCatalogo:
      "Cada detalle tiene algo que contar. Encuentra tu próxima inspiración.",
    tituloNosotros: "Más que un nombre.\nUna identidad.",
    tituloContacto: "La conversación\nempieza aquí.",
    textoContacto: "Conoce nuestras novedades en los canales oficiales.",
    pie: "Catálogo informativo · Sin compras ni pedidos",
  },
  productos: initialProducts.map((p) => ({ ...p, visible: true })),
};
export async function readPublication() {
  const { data, error } = await publicSupabase
    .from("lch_publications")
    .select("document, version, updated_at")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    // Keep the current catalogue available until the one-time SQL setup is run.
    if (error.code === "PGRST205")
      return { document: initialDocument, setupPending: true };
    throw error;
  }
  if (!data) return { document: initialDocument, setupPending: true };
  validateDocument(data.document);
  return { ...data, setupPending: false };
}
export async function readDraft() {
  const { data, error } = await supabase
    .from("lch_drafts")
    .select("document, version, updated_at")
    .eq("id", 1)
    .single();
  if (error) throw error;
  validateDocument(data.document);
  return data;
}
export async function saveDraft(document, version) {
  validateDocument(document);
  const { data, error } = await supabase.rpc("save_lch_draft", {
    payload: document,
    expected_version: version,
  });
  if (error) throw error;
  return data;
}
export async function publishDraft(version) {
  const { data, error } = await supabase.rpc("publish_lch_draft", {
    expected_version: version,
  });
  if (error) throw error;
  return data;
}
export async function resolveImages(document, admin = false) {
  const paths = mediaPaths(document);
  if (!paths.length) return {};
  const client = admin ? supabase : publicSupabase;
  const { data, error } = await client.storage
    .from("lch-images")
    .createSignedUrls(paths, 3600);
  if (error) throw error;
  if (data.some((item) => item.error || !item.signedUrl))
    throw new Error(
      "No se pudieron cargar algunas fotografías. Vuelve a intentarlo.",
    );
  return Object.fromEntries(data.map((item) => [item.path, item.signedUrl]));
}
export async function listImages(offset = 0) {
  const { data, error } = await supabase.storage
    .from("lch-images")
    .list("media", {
      limit: 100,
      offset,
      sortBy: { column: "created_at", order: "desc" },
    });
  if (error) throw error;
  const files = data
    .filter((item) => item.id)
    .map((item) => ({ ...item, path: `media/${item.name}` }));
  if (!files.length) return { files: [], more: false };
  const { data: urls, error: urlError } = await supabase.storage
    .from("lch-images")
    .createSignedUrls(
      files.map((f) => f.path),
      3600,
    );
  if (urlError) throw urlError;
  return {
    files: files.map((f) => ({
      ...f,
      url: urls.find((u) => u.path === f.path)?.signedUrl,
    })),
    more: data.length === 100,
  };
}
export async function deleteImage(path) {
  const { data, error } = await supabase.storage
    .from("lch-images")
    .remove([path]);
  if (error) throw error;
  if (!data?.length)
    throw new Error(
      "La foto está en uso en el borrador o la publicación. Retírala, guarda y publica los cambios antes de eliminarla.",
    );
}
