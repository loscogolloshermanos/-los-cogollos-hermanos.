import { readFileSync, existsSync } from "node:fs";
import assert from "node:assert/strict";
const products = JSON.parse(
  readFileSync(new URL("../src/data/productos.json", import.meta.url)),
);
assert(Array.isArray(products), "El catálogo debe ser una lista");
const ids = new Set();
for (const p of products) {
  for (const key of [
    "id",
    "nombre",
    "categoria",
    "descripcion",
    "descripcionCompleta",
    "imagen",
  ])
    assert(
      typeof p[key] === "string" && p[key].trim(),
      `${p.id}: falta ${key}`,
    );
  assert(!ids.has(p.id), `ID duplicado: ${p.id}`);
  ids.add(p.id);
  assert(Array.isArray(p.galeria), `${p.id}: galeria debe ser una lista`);
  assert(
    p.caracteristicas &&
      typeof p.caracteristicas === "object" &&
      !Array.isArray(p.caracteristicas),
    `${p.id}: caracteristicas debe ser un objeto`,
  );
  assert(
    Object.values(p.caracteristicas).every((v) => typeof v === "string"),
    "Las características deben ser textos",
  );
  assert(
    typeof p.disponible === "boolean" && typeof p.destacado === "boolean",
    "Los estados deben ser booleanos",
  );
  for (const img of [p.imagen, ...p.galeria]) {
    assert(
      typeof img === "string" &&
        !img.startsWith("/") &&
        !img.includes("..") &&
        !img.includes(":"),
      "Usa rutas locales relativas dentro de public",
    );
    assert(
      existsSync(new URL(`../public/${img}`, import.meta.url)),
      `Imagen inexistente: ${img}`,
    );
  }
}
const site = JSON.parse(
  readFileSync(new URL("../src/data/sitio.json", import.meta.url)),
);
assert(
  existsSync(new URL(`../public/${site.logo}`, import.meta.url)),
  "Logotipo inexistente",
);
for (const social of site.redes)
  if (social.url)
    assert(
      new URL(social.url).protocol === "https:",
      "Las redes requieren una URL https",
    );
console.log(
  `Datos correctos: ${products.length} productos; imágenes y redes verificadas.`,
);
