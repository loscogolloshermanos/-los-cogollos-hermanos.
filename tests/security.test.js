import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const ADMIN = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const UNCONFIRMED = "33333333-3333-4333-8333-333333333333";
const sql = readFileSync(
  new URL("../supabase/setup.sql", import.meta.url),
  "utf8",
).replaceAll("REEMPLAZAR_CORREO_ADMINISTRADOR", "admin@example.test");
test("Permisos SQL: borradores, publicaciones, fotografías y conflictos", async (t) => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
      create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,is_anonymous boolean default false);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,storage to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid,bucket_id text,name text);
      alter table storage.objects enable row level security;
      grant select,insert,delete on storage.objects to anon,authenticated;
      insert into auth.users values('${ADMIN}','admin@example.test',now(),false),('${OTHER}','other@example.com',now(),false),('${UNCONFIRMED}','RO B',null,false);`);
    await db.exec(sql);
    const seed = (
      await db.query("select document from public.lch_drafts where id=1")
    ).rows[0].document;
    async function as(role, id, fn) {
      await db.exec(`set role ${role};`);
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id || "",
      ]);
      try {
        return await fn();
      } finally {
        await db.exec("reset role");
      }
    }
    await t.test(
      "Anónimo solo lee publicaciones y no puede ejecutar escrituras",
      async () => {
        await as("anon", null, async () => {
          assert.equal(
            (await db.query("select * from public.lch_publications")).rows
              .length,
            1,
          );
          await assert.rejects(
            db.query("select * from public.lch_drafts"),
            /permission denied/,
          );
          await assert.rejects(
            db.query("select public.save_lch_draft($1::jsonb,1)", [
              JSON.stringify(seed),
            ]),
            /permission denied/,
          );
          await assert.rejects(
            db.query(
              "insert into storage.objects values(null,'lch-images','media/evil.webp')",
            ),
            /row-level security/,
          );
        });
      },
    );
    await t.test(
      "Otra cuenta no ve borradores ni publica, aunque tenga sesión",
      async () => {
        await as("authenticated", OTHER, async () => {
          assert.equal(
            (await db.query("select * from public.lch_drafts")).rows.length,
            0,
          );
          assert.equal(
            (await db.query("select public.lch_is_admin() as allowed")).rows[0]
              .allowed,
            false,
          );
          await assert.rejects(
            db.query("select public.publish_lch_draft(1)"),
            /ADMIN_ONLY/,
          );
          await assert.rejects(
            db.query("update public.lch_publications set version=90"),
            /permission denied/,
          );
        });
      },
    );
    await t.test(
      "El correo debe estar confirmado y pertenecer al UUID de la sesión",
      async () => {
        await db.query("update auth.users set email=$1 where id=$2", [
          "admin@example.test",
          UNCONFIRMED,
        ]);
        await as("authenticated", UNCONFIRMED, async () =>
          assert.equal(
            (await db.query("select public.lch_is_admin() as allowed")).rows[0]
              .allowed,
            false,
          ),
        );
      },
    );
    const draft = structuredClone(seed);
    draft.productos[0].imagen = "media/public.webp";
    draft.productos[1].imagen = "media/private.webp";
    draft.productos[1].galeria = [];
    draft.productos[1].visible = false;
    await t.test(
      "Guardar no publica y una revisión obsoleta no sobrescribe datos",
      async () => {
        await as("authenticated", ADMIN, async () => {
          assert.equal(
            (
              await db.query(
                "select public.save_lch_draft($1::jsonb,1) as result",
                [JSON.stringify(draft)],
              )
            ).rows[0].result.version,
            2,
          );
          assert.equal(
            (await db.query("select version from public.lch_publications"))
              .rows[0].version,
            1,
          );
          await assert.rejects(
            db.query("select public.save_lch_draft($1::jsonb,1)", [
              JSON.stringify(draft),
            ]),
            /CONFLICT/,
          );
          await assert.rejects(
            db.query("select public.publish_lch_draft(1)"),
            /CONFLICT/,
          );
          await assert.rejects(
            db.query("select public.publish_lch_draft(2)"),
            /MISSING_IMAGE/,
          );
          await db.query(
            "insert into storage.objects values(null,'lch-images','media/public.webp'),(null,'lch-images','media/private.webp'),(null,'lch-images','media/unused.webp')",
          );
        });
      },
    );
    await t.test(
      "Publicar elimina ocultos y no confía en el índice enviado por el cliente",
      async () => {
        draft._media = ["media/private.webp"];
        await as("authenticated", ADMIN, async () => {
          await db.query("select public.save_lch_draft($1::jsonb,2)", [
            JSON.stringify(draft),
          ]);
          await db.query("select public.publish_lch_draft(3)");
          const publication = (
            await db.query("select document from public.lch_publications")
          ).rows[0].document;
          assert.equal(publication.productos.length, 2);
          assert.deepEqual(publication._media, ["media/public.webp"]);
        });
      },
    );
    await t.test(
      "Fotos privadas permanecen privadas y fotos en uso no se borran",
      async () => {
        await as("anon", null, async () =>
          assert.deepEqual(
            (await db.query("select name from storage.objects")).rows.map(
              (r) => r.name,
            ),
            ["media/public.webp"],
          ),
        );
        await as("authenticated", OTHER, async () =>
          assert.deepEqual(
            (await db.query("select name from storage.objects")).rows.map(
              (r) => r.name,
            ),
            ["media/public.webp"],
          ),
        );
        await as("authenticated", ADMIN, async () => {
          assert.equal(
            (
              await db.query(
                "delete from storage.objects where name='media/private.webp' returning name",
              )
            ).rows.length,
            0,
          );
          assert.equal(
            (
              await db.query(
                "delete from storage.objects where name='media/public.webp' returning name",
              )
            ).rows.length,
            0,
          );
          assert.equal(
            (
              await db.query(
                "delete from storage.objects where name='media/unused.webp' returning name",
              )
            ).rows.length,
            1,
          );
        });
      },
    );
    await t.test(
      "Publicación vacía válida y repetición de setup conserva cambios",
      async () => {
        const empty = { ...seed, productos: [] };
        await as("authenticated", ADMIN, async () => {
          await db.query("select public.save_lch_draft($1::jsonb,3)", [
            JSON.stringify(empty),
          ]);
          await db.query("select public.publish_lch_draft(4)");
        });
        await db.exec(sql);
        assert.equal(
          (
            await db.query(
              "select version,document from public.lch_publications",
            )
          ).rows[0].version,
          4,
        );
        assert.equal(
          (await db.query("select document from public.lch_publications"))
            .rows[0].document.productos.length,
          0,
        );
      },
    );
    await t.test(
      "La plantilla sin personalizar aborta sin cambiar la instalación",
      async () => {
        const template = readFileSync(
          new URL("../supabase/setup.sql", import.meta.url),
          "utf8",
        );
        await assert.rejects(db.exec(template), /correo administrador válido/);
        await db.exec("rollback");
        assert.equal(
          (await db.query("select version from public.lch_publications"))
            .rows[0].version,
          4,
        );
        await as("authenticated", ADMIN, async () => {
          assert.equal(
            (await db.query("select public.lch_is_admin() as allowed")).rows[0]
              .allowed,
            true,
          );
        });
      },
    );
  } finally {
    await db.close();
  }
});
