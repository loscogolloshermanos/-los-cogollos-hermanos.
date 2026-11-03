import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  validateDocument,
  publicDocument,
  mediaPaths,
  validImagePath,
  validateUpload,
  explainError,
} from "./documento.js";
const sql = readFileSync(
  new URL("../../supabase/setup.sql", import.meta.url),
  "utf8",
);
const seed = JSON.parse(sql.match(/\$seed\$(.*?)\$seed\$/s)[1]);
test("La semilla de migración cumple el contrato y no se altera al previsualizar", () => {
  assert.equal(validateDocument(seed), seed);
  const copy = structuredClone(seed);
  copy.productos[1].visible = false;
  assert.equal(publicDocument(copy).productos.length, 2);
  assert.equal(copy.productos.length, 3);
  assert.equal(seed.productos.length, 3);
});
test("Un catálogo vacío es válido, pero los IDs duplicados y filas incompletas no lo son", () => {
  const d = structuredClone(seed);
  d.productos = [];
  assert.doesNotThrow(() => validateDocument(d));
  d.productos = [
    structuredClone(seed.productos[0]),
    structuredClone(seed.productos[0]),
  ];
  assert.throws(() => validateDocument(d), /únicos/);
  d.productos = [structuredClone(seed.productos[0])];
  d.productos[0].nombre = "";
  assert.throws(() => validateDocument(d), /nombre/);
});
test("No permite enlaces ejecutables, credenciales ni rutas arbitrarias en fotos", () => {
  for (const value of [
    "javascript:alert(1)",
    "https://x.example/image.webp",
    "../file",
    "media/../a.webp",
    "data:image/png,foo",
  ])
    assert.equal(validImagePath(value), false);
  assert.equal(validImagePath("media/abc-123.webp"), true);
  const d = structuredClone(seed);
  d.sitio.redes[0].url = "javascript:alert(1)";
  assert.throws(() => validateDocument(d));
  d.sitio.redes[0].url = "https://user:pass@example.org";
  assert.throws(() => validateDocument(d));
});
test("El índice de fotos distingue ocultos y elimina referencias repetidas", () => {
  const d = structuredClone(seed);
  d.sitio.logo = "media/logo.webp";
  d.productos[0].imagen = "media/public.webp";
  d.productos[0].galeria = ["media/public.webp"];
  d.productos[1].imagen = "media/private.webp";
  d.productos[1].visible = false;
  assert.deepEqual(mediaPaths(publicDocument(d)).sort(), [
    "media/logo.webp",
    "media/public.webp",
  ]);
});
test("Rechaza características inválidas y más de 12 imágenes", () => {
  const d = structuredClone(seed);
  d.productos[0].caracteristicas = { "": "" };
  assert.throws(() => validateDocument(d), /características/);
  d.productos[0].caracteristicas = {};
  d.productos[0].galeria = Array(13).fill("media/1.webp");
  assert.throws(() => validateDocument(d), /12/);
});
test("Limita formato y tamaño de fotografías y explica conflictos", () => {
  assert.throws(() => validateUpload({ type: "image/svg+xml", size: 300 }));
  assert.throws(() =>
    validateUpload({ type: "image/jpeg", size: 16 * 1024 * 1024 }),
  );
  assert.doesNotThrow(() => validateUpload({ type: "image/png", size: 2000 }));
  assert.match(explainError({ message: "CONFLICT" }), /otra pestaña/);
});
