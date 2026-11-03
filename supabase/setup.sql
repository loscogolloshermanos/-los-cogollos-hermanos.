-- LOS COGOLLOS HERMANOS — ejecutar completo en SQL Editor, una sola vez.
-- Es repetible: conserva borradores y publicaciones existentes.
begin;

-- Solo para instalaciones nuevas: sustituir el marcador por el correo elegido.
-- En una instalación activa no hace falta volver a ejecutar este script.
do $configure_admin$
declare configured_email text := 'REEMPLAZAR_CORREO_ADMINISTRADOR';
begin
  if configured_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
    raise exception 'Indica un correo administrador válido antes de ejecutar la configuración.';
  end if;
end;
$configure_admin$;

create or replace function public.lch_is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.users u
    where u.id = (select auth.uid())
      and lower(u.email) = 'REEMPLAZAR_CORREO_ADMINISTRADOR'
      and u.email_confirmed_at is not null
      and coalesce(u.is_anonymous, false) = false
  );
$$;
revoke all on function public.lch_is_admin() from public;
grant execute on function public.lch_is_admin() to anon, authenticated;

create table if not exists public.lch_drafts (
  id integer primary key check (id = 1),
  document jsonb not null,
  version bigint not null default 1,
  updated_at timestamptz not null default now()
);
create table if not exists public.lch_publications (
  id integer primary key check (id = 1),
  document jsonb not null,
  version bigint not null,
  updated_at timestamptz not null default now()
);
alter table public.lch_drafts enable row level security;
alter table public.lch_publications enable row level security;
revoke all on public.lch_drafts, public.lch_publications from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.lch_publications to anon, authenticated;
grant select on public.lch_drafts to authenticated;
drop policy if exists lch_draft_admin_read on public.lch_drafts;
create policy lch_draft_admin_read on public.lch_drafts for select to authenticated using ((select public.lch_is_admin()));
drop policy if exists lch_public_read on public.lch_publications;
create policy lch_public_read on public.lch_publications for select to anon, authenticated using (true);

create or replace function public.lch_media_paths(doc jsonb)
returns text[] language sql immutable set search_path = '' as $$
  select coalesce(array_agg(distinct v), array[]::text[]) from (
    select doc #>> '{sitio,logo}' as v
    union all select doc #>> '{sitio,portada}'
    union all select doc #>> '{sitio,fotoNosotros}'
    union all select p->>'imagen' from jsonb_array_elements(doc->'productos') p
    union all select jsonb_array_elements_text(p->'galeria') from jsonb_array_elements(doc->'productos') p
  ) images where v like 'media/%';
$$;
revoke all on function public.lch_media_paths(jsonb) from public;
grant execute on function public.lch_media_paths(jsonb) to anon, authenticated;

create or replace function public.lch_validate_document(doc jsonb)
returns void language plpgsql immutable set search_path = '' as $$
declare p jsonb; r jsonb; k text; v text;
begin
  if doc is null or jsonb_typeof(doc) <> 'object' or doc->>'schemaVersion' is distinct from '1'
    or jsonb_typeof(doc->'sitio') is distinct from 'object'
    or jsonb_typeof(doc->'productos') is distinct from 'array'
    or octet_length(doc::text) > 2000000 then raise exception 'INVALID_DOCUMENT'; end if;
  if jsonb_array_length(doc->'productos') > 500 then raise exception 'MAX_PRODUCTS'; end if;
  foreach k in array array['nombre','frase','introduccion','historia','filosofia','etiquetaPortada','tituloCatalogo','textoCatalogo','tituloNosotros','tituloContacto','textoContacto','pie'] loop
    if jsonb_typeof(doc->'sitio'->k) is distinct from 'string' or length(doc->'sitio'->>k)>10000 then raise exception 'INVALID_SITE_TEXT: %',k; end if;
  end loop;
  if length(trim(doc#>>'{sitio,nombre}'))=0 or jsonb_typeof(doc#>'{sitio,demostracion}') is distinct from 'boolean'
    or jsonb_typeof(doc#>'{sitio,redes}') is distinct from 'array' then raise exception 'INVALID_SITE'; end if;
  if jsonb_array_length(doc#>'{sitio,redes}') > 20 then raise exception 'MAX_SOCIALS'; end if;
  foreach k in array array['logo','portada','fotoNosotros'] loop
    v := doc->'sitio'->>k;
    if v is null or v !~ '^(images/[a-zA-Z0-9_-]+\.(svg|webp|avif|jpg|jpeg|png)|media/[a-zA-Z0-9_-]+\.webp)$' then raise exception 'INVALID_IMAGE'; end if;
  end loop;
  for r in select value from jsonb_array_elements(doc#>'{sitio,redes}') loop
    if jsonb_typeof(r->'nombre') is distinct from 'string' or length(trim(r->>'nombre'))=0
      or jsonb_typeof(r->'url') is distinct from 'string'
      or (r->>'url' <> '' and (r->>'url' !~ '^https://[^[:space:]/@]+([/?#]|$)' or r->>'url' ~ '^https://[^/]*@')) then raise exception 'INVALID_SOCIAL'; end if;
  end loop;
  if exists(select 1 from jsonb_array_elements(doc->'productos') a group by a->>'id' having count(*) > 1) then raise exception 'DUPLICATE_ID'; end if;
  for p in select value from jsonb_array_elements(doc->'productos') loop
    foreach k in array array['id','nombre','categoria','descripcion','descripcionCompleta'] loop
      if jsonb_typeof(p->k) is distinct from 'string' or length(trim(p->>k))=0 or length(p->>k)>10000 then raise exception 'INVALID_PRODUCT: %',k; end if;
    end loop;
    foreach k in array array['visible','disponible','destacado'] loop
      if jsonb_typeof(p->k) is distinct from 'boolean' then raise exception 'INVALID_PRODUCT_STATE'; end if;
    end loop;
    if jsonb_typeof(p->'galeria') is distinct from 'array' or jsonb_typeof(p->'caracteristicas') is distinct from 'object' then raise exception 'INVALID_PRODUCT_DETAILS'; end if;
    if jsonb_array_length(p->'galeria')>12 then raise exception 'MAX_GALLERY'; end if;
    if p->>'imagen' is null or p->>'imagen' !~ '^(images/[a-zA-Z0-9_-]+\.(svg|webp|avif|jpg|jpeg|png)|media/[a-zA-Z0-9_-]+\.webp)$' then raise exception 'INVALID_IMAGE'; end if;
    for r in select value from jsonb_array_elements(p->'galeria') loop
      if jsonb_typeof(r) <> 'string' or (r#>>'{}') !~ '^(images/[a-zA-Z0-9_-]+\.(svg|webp|avif|jpg|jpeg|png)|media/[a-zA-Z0-9_-]+\.webp)$' then raise exception 'INVALID_GALLERY_IMAGE'; end if;
    end loop;
    if exists(select 1 from jsonb_each(p->'caracteristicas') c where length(trim(c.key))=0 or length(c.key)>200 or jsonb_typeof(c.value)<>'string' or length(trim(c.value#>>'{}'))=0 or length(c.value#>>'{}')>2000) then raise exception 'INVALID_FEATURE'; end if;
  end loop;
end;
$$;
revoke all on function public.lch_validate_document(jsonb) from public;

create or replace function public.save_lch_draft(payload jsonb, expected_version bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare new_version bigint;
begin
  if not public.lch_is_admin() then raise exception 'ADMIN_ONLY' using errcode='42501'; end if;
  perform public.lch_validate_document(payload);
  update public.lch_drafts set document=payload, version=version+1, updated_at=now() where id=1 and version=expected_version returning version into new_version;
  if new_version is null then raise exception 'CONFLICT' using errcode='40001'; end if;
  return jsonb_build_object('version',new_version,'updated_at',now());
end;
$$;
revoke all on function public.save_lch_draft(jsonb,bigint) from public;
grant execute on function public.save_lch_draft(jsonb,bigint) to authenticated;

create or replace function public.publish_lch_draft(expected_version bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare draft public.lch_drafts%rowtype; snapshot jsonb; paths text[];
begin
  if not public.lch_is_admin() then raise exception 'ADMIN_ONLY' using errcode='42501'; end if;
  select * into draft from public.lch_drafts where id=1 for update;
  if draft.version is distinct from expected_version then raise exception 'CONFLICT' using errcode='40001'; end if;
  perform public.lch_validate_document(draft.document);
  snapshot := jsonb_set(draft.document,'{productos}',coalesce((select jsonb_agg(p) from jsonb_array_elements(draft.document->'productos') p where p->>'visible'='true'),'[]'::jsonb));
  paths := public.lch_media_paths(snapshot);
  if exists(select 1 from unnest(paths) path where not exists(select 1 from storage.objects o where o.bucket_id='lch-images' and o.name=path)) then raise exception 'MISSING_IMAGE: falta una fotografía subida'; end if;
  -- _media is generated by the server, never trusted from the browser.
  snapshot := jsonb_set(snapshot,'{_media}',to_jsonb(paths));
  insert into public.lch_publications(id,document,version,updated_at) values (1,snapshot,draft.version,now())
    on conflict (id) do update set document=excluded.document,version=excluded.version,updated_at=excluded.updated_at;
  return jsonb_build_object('version',draft.version,'updated_at',now());
end;
$$;
revoke all on function public.publish_lch_draft(bigint) from public;
grant execute on function public.publish_lch_draft(bigint) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('lch-images','lch-images',false,5242880,array['image/webp'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists lch_image_read on storage.objects;
create policy lch_image_read on storage.objects for select to anon,authenticated using (
  bucket_id='lch-images' and (
    (select public.lch_is_admin()) or exists(select 1 from public.lch_publications p where p.id=1 and p.document->'_media' ? name)
  )
);
drop policy if exists lch_image_insert on storage.objects;
create policy lch_image_insert on storage.objects for insert to authenticated with check (
  bucket_id='lch-images' and (select public.lch_is_admin()) and name ~ '^media/[a-zA-Z0-9_-]+\.webp$'
);
drop policy if exists lch_image_delete on storage.objects;
create policy lch_image_delete on storage.objects for delete to authenticated using (
  bucket_id='lch-images' and (select public.lch_is_admin())
  and not exists(select 1 from public.lch_drafts d where name=any(public.lch_media_paths(d.document)))
  and not exists(select 1 from public.lch_publications p where p.document->'_media' ? name)
);

-- Contenido inicial: conserva los ejemplos ficticios. No sobrescribe cambios.
insert into public.lch_drafts(id,document,version) values(1,$seed${"schemaVersion": 1, "sitio": {"nombre": "LOS COGOLLOS HERMANOS", "frase": "De la raíz a nuestra esencia.", "introduccion": "Un espacio para conocer lo que nos inspira. Explora nuestra selección y descubre cada detalle, a tu ritmo.", "historia": "[Texto editable] Este es el espacio para contar cómo nació LOS COGOLLOS HERMANOS y qué significa el proyecto para sus creadores.", "filosofia": "[Texto editable] Comparte aquí los valores de la marca, tu visión y aquello que hace única tu forma de entender cada detalle.", "logo": "images/logo.svg", "redes": [{"nombre": "Instagram", "url": ""}, {"nombre": "Facebook", "url": ""}], "demostracion": true, "portada": "images/hero.svg", "fotoNosotros": "images/hero.svg", "etiquetaPortada": "UNA IDENTIDAD. NUESTRA ESENCIA.", "tituloCatalogo": "El catálogo.", "textoCatalogo": "Cada detalle tiene algo que contar. Encuentra tu próxima inspiración.", "tituloNosotros": "Más que un nombre.\nUna identidad.", "tituloContacto": "La conversación\nempieza aquí.", "textoContacto": "Conoce nuestras novedades en los canales oficiales.", "pie": "Catálogo informativo · Sin compras ni pedidos"}, "productos": [{"id": "ejemplo-01", "nombre": "Esencia Esmeralda", "categoria": "Colección botánica", "descripcion": "Una exploración visual de texturas naturales y matices verdes. Producto ficticio de demostración.", "descripcionCompleta": "Este producto es ficticio y sirve únicamente para mostrar el diseño del catálogo. Sustituye este texto por información real y verificada. No representa un producto disponible para venta.", "imagen": "images/esmeralda.svg", "galeria": ["images/esmeralda.svg", "images/ambar.svg"], "caracteristicas": {"Referencia": "DEMO-01", "Tipo de contenido": "Ejemplo ficticio", "Ficha técnica": "Pendiente de información verificada"}, "disponible": true, "destacado": true, "visible": true}, {"id": "ejemplo-02", "nombre": "Horizonte Ámbar", "categoria": "Edición estudio", "descripcion": "Tonos cálidos y una identidad que invita a mirar más de cerca. Producto ficticio de demostración.", "descripcionCompleta": "Ejemplo ficticio para personalizar. La imagen es una ilustración original y las características son marcadores de posición, sin afirmaciones sanitarias ni técnicas.", "imagen": "images/ambar.svg", "galeria": [], "caracteristicas": {"Referencia": "DEMO-02", "Tipo de contenido": "Ejemplo ficticio", "Ficha técnica": "Pendiente de información verificada"}, "disponible": true, "destacado": false, "visible": true}, {"id": "ejemplo-03", "nombre": "Origen Nocturno", "categoria": "Colección botánica", "descripcion": "Profundidad, equilibrio y una nueva perspectiva de lo natural. Producto ficticio de demostración.", "descripcionCompleta": "Ejemplo ficticio con estado agotado para demostrar que los productos permanecen visibles. No indica existencias reales ni contiene información sobre un producto real.", "imagen": "images/nocturno.svg", "galeria": [], "caracteristicas": {"Referencia": "DEMO-03", "Tipo de contenido": "Ejemplo ficticio", "Ficha técnica": "Pendiente de información verificada"}, "disponible": false, "destacado": false, "visible": true}]}$seed$::jsonb,1) on conflict(id) do nothing;
insert into public.lch_publications(id,document,version) select id,jsonb_set(document,'{_media}','[]'::jsonb),version from public.lch_drafts where id=1 on conflict(id) do nothing;
notify pgrst, 'reload schema';
commit;
