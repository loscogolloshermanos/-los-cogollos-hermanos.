import { supabase } from "./supabase";
import { validateUpload, MAX_STORED_BYTES } from "../utils/documento";
export async function optimizeImage(file) {
  validateUpload(file);
  const source = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () =>
        reject(new Error("La imagen está dañada o no es compatible."));
      img.src = source;
    });
    if (image.naturalWidth * image.naturalHeight > 80000000)
      throw new Error(
        "La imagen tiene demasiados píxeles. Redúcela antes de subirla.",
      );
    const scale = Math.min(
      1,
      1800 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("Este navegador no permite procesar la fotografía.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.84),
    );
    if (!blob || blob.type !== "image/webp")
      throw new Error(
        "Tu navegador no puede convertir a WebP. Prueba con una versión reciente de Safari o Chrome.",
      );
    if (blob.size > MAX_STORED_BYTES)
      throw new Error("La imagen optimizada supera 5 MB. Reduce su tamaño.");
    return blob;
  } finally {
    URL.revokeObjectURL(source);
  }
}
export async function uploadImage(file) {
  const blob = await optimizeImage(file);
  const path = `media/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage
    .from("lch-images")
    .upload(path, blob, {
      contentType: "image/webp",
      upsert: false,
      cacheControl: "3600",
    });
  if (error) throw error;
  return path;
}
