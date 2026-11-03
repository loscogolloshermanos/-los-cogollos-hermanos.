import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { publicDocument } from "../src/utils/documento";
const seed = JSON.parse(
  readFileSync(new URL("../supabase/setup.sql", import.meta.url), "utf8").match(
    /\$seed\$(.*?)\$seed\$/s,
  )[1],
);
const HOST = "https://lxuqqsrkqdctbinivvun.supabase.co";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEElEQVR4nGNgaGD4D8YwBgAw9AX9i91uTAAAAABJRU5ErkJggg==",
  "base64",
);
async function setup(
  page,
  { signedIn = false, email = "robrtmoral569@gmail.com", missing = false } = {},
) {
  const state = {
    draft: structuredClone(seed),
    publication: structuredClone(seed),
    version: 1,
    publishedVersion: 1,
    files: [],
    otp: null,
    writes: 0,
    draftReads: 0,
  };
  const uid = "11111111-1111-4111-8111-111111111111";
  const user = {
    id: uid,
    email,
    aud: "authenticated",
    role: "authenticated",
    email_confirmed_at: "2026-01-01T00:00:00Z",
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
  if (signedIn)
    await page.addInitScript(
      ({ user, uid }) => {
        const payload = btoa(
          JSON.stringify({
            sub: uid,
            exp: Math.floor(Date.now() / 1000) + 3600,
            aud: "authenticated",
            role: "authenticated",
          }),
        );
        localStorage.setItem(
          "lch-admin-session",
          JSON.stringify({
            access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.fake`,
            refresh_token: "test-refresh-token",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            expires_in: 3600,
            token_type: "bearer",
            user,
          }),
        );
      },
      { user, uid },
    );
  await page.route(`${HOST}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const body = req.headers()["content-type"]?.includes("application/json")
      ? req.postDataJSON()
      : {};
    const ok = (data, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204 });
    if (path === "/auth/v1/user") return ok(user);
    if (path === "/auth/v1/otp") {
      state.otp = body;
      return ok({});
    }
    if (path === "/auth/v1/logout") return ok({});
    if (path === "/rest/v1/rpc/lch_is_admin")
      return missing
        ? ok(
            {
              code: "PGRST202",
              message:
                "Could not find the function public.lch_is_admin in schema cache",
            },
            404,
          )
        : ok(email === "robrtmoral569@gmail.com");
    if (path === "/rest/v1/lch_drafts") {
      state.draftReads++;
      return ok({ document: state.draft, version: state.version });
    }
    if (path === "/rest/v1/lch_publications")
      return ok([
        { document: state.publication, version: state.publishedVersion },
      ]);
    if (path === "/rest/v1/rpc/save_lch_draft") {
      state.writes++;
      if (body.expected_version !== state.version)
        return ok({ message: "CONFLICT" }, 409);
      state.draft = structuredClone(body.payload);
      state.version++;
      return ok({ version: state.version });
    }
    if (path === "/rest/v1/rpc/publish_lch_draft") {
      state.writes++;
      state.publication = publicDocument(state.draft);
      state.publishedVersion = state.version;
      return ok({ version: state.version });
    }
    if (path === "/storage/v1/object/list/lch-images") return ok(state.files);
    if (path === "/storage/v1/object/sign/lch-images")
      return ok(
        body.paths.map((p) => ({
          path: p,
          signedURL: `/object/sign/lch-images/${p}?token=fake`,
        })),
      );
    if (path.startsWith("/storage/v1/object/sign/"))
      return route.fulfill({ contentType: "image/png", body: png });
    if (
      path.startsWith("/storage/v1/object/lch-images/") &&
      req.method() === "POST"
    ) {
      const name = path.split("/").at(-1);
      state.files.push({
        name,
        id: "image-id",
        created_at: new Date().toISOString(),
      });
      return ok({ Key: `lch-images/media/${name}`, Id: "image-id" });
    }
    throw new Error(`Unexpected API request: ${req.method()} ${path}`);
  });
  return state;
}
test("El catálogo conserva búsqueda, filtros y detalles", async ({ page }) => {
  await setup(page);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "El catálogo." }),
  ).toBeVisible();
  await page
    .getByRole("searchbox", { name: "Buscar por nombre" })
    .fill("ambar");
  await expect(page.locator(".product-card")).toHaveCount(1);
  if (process.env.LCH_SCREENSHOTS)
    await page.screenshot({
      path: `/tmp/lch-public-${test.info().project.name}.png`,
      fullPage: true,
    });
  await page.getByRole("button", { name: "Explorar detalles" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Cerrar detalle" }).click();
  await page.getByRole("searchbox", { name: "Buscar por nombre" }).fill("nada");
  await expect(
    page.getByRole("heading", { name: "No encontramos productos" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("El acceso solo solicita un enlace sin permitir nuevos registros", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/#/admin");
  await page.getByRole("button", { name: "Enviar enlace de acceso" }).click();
  await expect(page.getByRole("status")).toContainText("recibirás");
  expect(state.otp.email).toBe("robrtmoral569@gmail.com");
  expect(state.otp.create_user).toBe(false);
  expect(state.draftReads).toBe(0);
});
test("Otra cuenta no monta el editor y una configuración pendiente muestra ayuda", async ({
  page,
}) => {
  const state = await setup(page, {
    signedIn: true,
    email: "other@example.com",
  });
  await page.goto("/#/admin");
  await expect(page.getByRole("alert")).toContainText("no tiene acceso");
  expect(state.draftReads).toBe(0);
});
test("Guarda borradores sin publicarlos y publica al confirmar", async ({
  page,
}) => {
  const state = await setup(page, { signedIn: true });
  await page.goto("/#/admin");
  const nombre = page.getByRole("textbox", { name: "Nombre", exact: true });
  await nombre.fill("Esencia editada");
  await expect(
    page.getByRole("button", { name: "Publicar", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Guardar borrador" }).click();
  await expect(page.getByRole("status")).toContainText("Borrador guardado");
  expect(state.draft.productos[0].nombre).toBe("Esencia editada");
  expect(state.publication.productos[0].nombre).toBe("Esencia Esmeralda");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Publicado");
  expect(state.publication.productos[0].nombre).toBe("Esencia editada");
  if (process.env.LCH_SCREENSHOTS)
    await page.screenshot({
      path: `/tmp/lch-admin-${test.info().project.name}.png`,
      fullPage: true,
    });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("Vista previa privada respeta ocultos y regresa al editor sin navegar", async ({
  page,
}) => {
  await setup(page, { signedIn: true });
  await page.goto("/#/admin");
  await page.getByRole("checkbox", { name: "Incluir al publicar" }).uncheck();
  await page.getByRole("button", { name: "Vista previa", exact: true }).click();
  const preview = page.getByRole("dialog", {
    name: "Vista previa privada",
    exact: true,
  });
  await expect(preview.locator(".product-card")).toHaveCount(2);
  await preview.getByRole("link", { name: "Descubre el catálogo" }).click();
  await expect(page).toHaveURL(/#\/admin$/);
  await preview.getByRole("button", { name: "Cerrar vista previa" }).click();
  await expect(
    page.getByRole("textbox", { name: "Nombre", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Guardar borrador" }),
  ).toBeEnabled();
});
test("Sube una fotografía optimizada y bloquea HEIC", async ({ page }) => {
  const state = await setup(page, { signedIn: true });
  await page.goto("/#/admin");
  await page.getByRole("button", { name: "Elegir o subir foto" }).click();
  await page.locator("dialog input[type=file]").setInputFiles({
    name: "foto.heic",
    mimeType: "image/heic",
    buffer: Buffer.from("invalid"),
  });
  await expect(page.getByRole("alert")).toContainText("JPEG, PNG o WebP");
  await page
    .locator("dialog input[type=file]")
    .setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: png });
  await expect(
    page.getByRole("dialog", { name: "Fotografías", exact: true }),
  ).not.toBeVisible();
  expect(state.files).toHaveLength(1);
  expect(state.files[0].name).toMatch(/\.webp$/);
  await page.getByRole("button", { name: "Guardar borrador" }).click();
  await expect(page.getByRole("status")).toContainText("Borrador guardado");
  expect(state.draft.productos[0].imagen).toMatch(/^media\/.+\.webp$/);
});
test("Si falta SQL no simula un panel operativo", async ({ page }) => {
  await setup(page, { signedIn: true, missing: true });
  await page.goto("/#/admin");
  await expect(page.getByRole("alert")).toContainText("configuración SQL");
  await expect(
    page.getByRole("button", { name: "Guardar borrador" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Guía de activación de Supabase" }),
  ).toBeVisible();
});
test("Procesa un enlace de correo y retira los tokens de la dirección", async ({
  page,
}) => {
  await setup(page);
  const jwt = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: "11111111-1111-4111-8111-111111111111", exp: Math.floor(Date.now() / 1000) + 3600, aud: "authenticated", role: "authenticated" })).toString("base64url")}.fake`;
  await page.goto(
    `/?admin=1#access_token=${jwt}&refresh_token=fake-refresh&token_type=bearer&expires_in=3600&type=magiclink`,
  );
  await expect(
    page.getByRole("textbox", { name: "Nombre", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/#\/admin$/);
  expect(page.url()).not.toContain("access_token");
});
test("Un conflicto conserva el texto local y permite descargar una copia", async ({
  page,
}) => {
  const state = await setup(page, { signedIn: true });
  await page.goto("/#/admin");
  await page
    .getByRole("textbox", { name: "Nombre", exact: true })
    .fill("Mi texto sin perder");
  state.version = 99;
  await page.getByRole("button", { name: "Guardar borrador" }).click();
  await expect(page.getByRole("alert")).toContainText("otra pestaña");
  await expect(
    page.getByRole("textbox", { name: "Nombre", exact: true }),
  ).toHaveValue("Mi texto sin perder");
  await expect(
    page.getByRole("button", { name: "Publicar", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Descargar copia de textos y catálogo" }),
  ).toBeEnabled();
});
test("Una publicación vacía no recupera los ejemplos ficticios", async ({
  page,
}) => {
  const state = await setup(page);
  state.publication.productos = [];
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "No encontramos productos" }),
  ).toBeVisible();
  await expect(page.locator(".product-card")).toHaveCount(0);
});

test("No descarta cambios al cancelar la salida del panel", async ({
  page,
}) => {
  await setup(page, { signedIn: true });
  await page.goto("/#/admin");
  await page
    .getByRole("textbox", { name: "Nombre", exact: true })
    .fill("Cambio protegido");
  page.once("dialog", (d) => d.dismiss());
  await page.locator(".admin-topbar > a").click();
  await expect(page).toHaveURL(/#\/admin$/);
  await expect(
    page.getByRole("textbox", { name: "Nombre", exact: true }),
  ).toHaveValue("Cambio protegido");
});
test("La configuración pendiente bloquea solicitar correo y ofrece la guía", async ({
  page,
}) => {
  await setup(page, { missing: true });
  await page.goto("/#/admin");
  await expect(page.getByRole("status")).toContainText("Falta ejecutar");
  await expect(
    page.getByRole("button", { name: "Enviar enlace de acceso" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("link", { name: "Ver guía de activación" }),
  ).toBeVisible();
});

for (const failureMode of ["png", "null", "throws"]) {
  test(`Convierte la foto localmente cuando el navegador devuelve ${failureMode} al pedir WebP`, async ({
    page,
  }) => {
    const state = await setup(page, { signedIn: true });
    await page.addInitScript((mode) => {
      // WebKit omits multipart file bytes in Playwright request.postDataBuffer.
      // Inspect the actual encoder Blob in the page instead, on every engine.
      const NativeBlob = window.Blob;
      window.Blob = new Proxy(NativeBlob, {
        construct(Target, args) {
          const blob = new Target(...args);
          if (blob.type === "image/webp") window.__encodedWebP = blob;
          return blob;
        },
      });
      const native = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
        if (type !== "image/webp")
          return native.call(this, callback, type, quality);
        if (mode === "throws")
          throw new DOMException("Unsupported format", "NotSupportedError");
        if (mode === "null") {
          queueMicrotask(() => callback(null));
          return;
        }
        return native.call(this, callback, "image/png", quality);
      };
    }, failureMode);
    const wasmRequests = [];
    page.on("request", (r) => {
      if (new URL(r.url()).pathname.endsWith(".wasm"))
        wasmRequests.push(r.url());
    });
    await page.goto("/#/admin");
    await page.getByRole("button", { name: "Elegir o subir foto" }).click();
    await page.locator("dialog input[type=file]").setInputFiles({
      name: "foto-iphone.png",
      mimeType: "image/png",
      buffer: png,
    });
    await expect(
      page.getByRole("dialog", { name: "Fotografías", exact: true }),
    ).not.toBeVisible({ timeout: 15000 });
    expect(state.files).toHaveLength(1);
    expect(
      await page.evaluate(async () => {
        const bytes = new Uint8Array(await window.__encodedWebP.arrayBuffer());
        const decode = new TextDecoder();
        return (
          decode.decode(bytes.slice(0, 4)) === "RIFF" &&
          decode.decode(bytes.slice(8, 12)) === "WEBP"
        );
      }),
    ).toBe(true);
    expect(wasmRequests.length).toBeGreaterThan(0);
    await page.getByRole("button", { name: "Guardar borrador" }).click();
    await expect(page.getByRole("status")).toContainText("Borrador guardado");
    expect(state.draft.productos[0].imagen).toMatch(/^media\/.+\.webp$/);
  });
}
