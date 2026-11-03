// Loaded only when the browser cannot encode WebP natively (including iOS Safari).
// The baseline, single-threaded WASM build also works without SIMD or special headers.
import createEncoder from "@jsquash/webp/codec/enc/webp_enc.js";
import encoderUrl from "@jsquash/webp/codec/enc/webp_enc.wasm?url";
import { defaultOptions } from "@jsquash/webp/meta.js";
let encoderPromise;
async function getEncoder() {
  if (!encoderPromise) {
    encoderPromise = createEncoder({ locateFile: () => encoderUrl }).catch(
      (error) => {
        encoderPromise = undefined;
        throw error;
      },
    );
  }
  return encoderPromise;
}
export async function encodeWebP(imageData) {
  const encoder = await getEncoder();
  const result = encoder.encode(
    imageData.data,
    imageData.width,
    imageData.height,
    {
      ...defaultOptions,
      quality: 84,
      method: 3,
      thread_level: 0,
    },
  );
  if (!result?.byteLength)
    throw new Error("No se pudo preparar la fotografía. Vuelve a intentarlo.");
  return new Blob([result], { type: "image/webp" });
}
