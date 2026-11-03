import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  Save,
  Eye,
  UploadCloud,
  LogOut,
  Images,
  Package,
  FileText,
  Download,
  RefreshCw,
  X,
  ArrowLeft,
} from "lucide-react";
import App from "../pages/App";
import { ImageContext } from "../components/ImageContext";
import { supabase } from "../services/supabase";
import {
  readDraft,
  saveDraft,
  publishDraft,
  resolveImages,
} from "../services/contenido";
import { mediaPaths, validateDocument, explainError } from "../utils/documento";
import {
  TextField,
  CheckField,
  ImageField,
  GalleryField,
  FeaturesField,
} from "./Fields";
import MediaLibrary from "./MediaLibrary";
const siteFields = [
  ["nombre", "Nombre de la marca"],
  ["frase", "Frase de presentación"],
  ["introduccion", "Introducción", true],
  ["etiquetaPortada", "Texto superior de portada"],
  ["tituloCatalogo", "Título del catálogo"],
  ["textoCatalogo", "Presentación del catálogo", true],
  ["tituloNosotros", "Título de Sobre nosotros", true],
  ["historia", "Historia", true],
  ["filosofia", "Filosofía", true],
  ["tituloContacto", "Título de contacto", true],
  ["textoContacto", "Presentación de contacto", true],
  ["pie", "Texto del pie de página"],
];
export default function Editor({ onLogout }) {
  const [doc, setDoc] = useState(null);
  const [version, setVersion] = useState(0);
  const [savedJSON, setSavedJSON] = useState("");
  const [publishedVersion, setPublishedVersion] = useState(0);
  const [publishedMedia, setPublishedMedia] = useState([]);
  const [tab, setTab] = useState("productos");
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [images, setImages] = useState({});
  const [imageError, setImageError] = useState("");
  const [library, setLibrary] = useState(false);
  const [preview, setPreview] = useState(false);
  const [search, setSearch] = useState("");
  const importInput = useRef(null);
  const editorTitle = useRef(null);
  const dirty = !!doc && JSON.stringify(doc) !== savedJSON;
  async function load() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const [draft, pub] = await Promise.all([
        readDraft(),
        supabase
          .from("lch_publications")
          .select("version,document")
          .eq("id", 1)
          .maybeSingle(),
      ]);
      if (pub.error) throw pub.error;
      setDoc(draft.document);
      setVersion(draft.version);
      setSavedJSON(JSON.stringify(draft.document));
      setSelected(draft.document.productos[0]?.id || "");
      setPublishedVersion(pub.data?.version || 0);
      setPublishedMedia(
        pub.data?.document ? mediaPaths(pub.data.document) : [],
      );
    } catch (e) {
      setError(explainError(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    const warn = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const leave = (e) => {
      if (
        dirty &&
        !window.confirm("Hay cambios sin guardar. ¿Salir y descartarlos?")
      )
        e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    window.addEventListener("lch:leave-admin", leave);
    return () => {
      window.removeEventListener("beforeunload", warn);
      window.removeEventListener("lch:leave-admin", leave);
    };
  }, [dirty]);
  const pathsKey = doc ? JSON.stringify(mediaPaths(doc)) : "";
  useEffect(() => {
    if (!doc) return;
    let live = true;
    const refresh = () =>
      resolveImages(doc, true)
        .then((map) => {
          if (live) {
            setImages(map);
            setImageError("");
          }
        })
        .catch((e) => {
          if (live) setImageError(explainError(e));
        });
    refresh();
    const id = setInterval(refresh, 45 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      live = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pathsKey]);
  function updateSite(key, value) {
    setDoc((old) => ({ ...old, sitio: { ...old.sitio, [key]: value } }));
    setNotice("");
  }
  function updateProduct(id, key, value) {
    setDoc((old) => ({
      ...old,
      productos: old.productos.map((p) =>
        p.id === id ? { ...p, [key]: value } : p,
      ),
    }));
    setNotice("");
  }
  function addProduct() {
    const p = {
      id: crypto.randomUUID(),
      nombre: "",
      categoria: "",
      descripcion: "",
      descripcionCompleta: "",
      imagen: "images/placeholder.svg",
      galeria: [],
      caracteristicas: {},
      disponible: false,
      destacado: false,
      visible: false,
    };
    setDoc((old) => ({ ...old, productos: [...old.productos, p] }));
    setSelected(p.id);
    setTab("productos");
    setNotice(
      "Completa el producto y activa «Incluir al publicar» cuando esté listo.",
    );
    setTimeout(() => editorTitle.current?.focus(), 0);
  }
  function removeProduct(p) {
    if (
      !window.confirm(
        `¿Eliminar «${p.nombre || "este producto"}» del borrador? El cambio llegará a la web cuando guardes y publiques.`,
      )
    )
      return;
    const next = doc.productos.filter((x) => x.id !== p.id);
    setDoc({ ...doc, productos: next });
    setSelected(next[0]?.id || "");
    setNotice(
      "Producto retirado del borrador. Guarda y publica para actualizar la web.",
    );
  }
  function reorder(id, delta) {
    setDoc((old) => {
      const next = [...old.productos];
      const i = next.findIndex((p) => p.id === id);
      const j = i + delta;
      if (j < 0 || j >= next.length) return old;
      [next[i], next[j]] = [next[j], next[i]];
      return { ...old, productos: next };
    });
  }
  async function save() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await saveDraft(doc, version);
      setVersion(result.version);
      setSavedJSON(JSON.stringify(doc));
      setNotice("Borrador guardado. La web pública todavía no cambia.");
    } catch (e) {
      setError(explainError(e));
    } finally {
      setBusy(false);
    }
  }
  async function publish() {
    if (dirty) {
      setError("Guarda el borrador antes de publicar.");
      return;
    }
    if (
      !window.confirm(
        `Se publicarán ${doc.productos.filter((p) => p.visible).length} productos y los textos del borrador. ¿Continuar?`,
      )
    )
      return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await publishDraft(version);
      setPublishedVersion(result.version);
      setPublishedMedia(
        mediaPaths({
          ...doc,
          productos: doc.productos.filter((p) => p.visible),
        }),
      );
      setNotice(
        "Publicado. Los visitantes verán los cambios al abrir o recargar la web.",
      );
    } catch (e) {
      setError(explainError(e));
    } finally {
      setBusy(false);
    }
  }
  function backup() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `lch-borrador-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function restore(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > 2000000) throw new Error("La copia supera 2 MB.");
      const imported = validateDocument(JSON.parse(await file.text()));
      if (
        window.confirm(
          "¿Reemplazar el borrador en pantalla por esta copia? No cambia la web hasta guardar y publicar.",
        )
      ) {
        setDoc(imported);
        setSelected(imported.productos[0]?.id || "");
        setNotice(
          "Copia cargada. Revisa las fotos, guarda y publica cuando esté lista.",
        );
      }
    } catch (e) {
      setError(explainError(e));
    }
  }
  async function logout() {
    if (
      dirty &&
      !window.confirm("Tienes cambios sin guardar. ¿Salir y descartarlos?")
    )
      return;
    try {
      await onLogout();
    } catch (e) {
      setError(explainError(e));
    }
  }
  function openPreview() {
    try {
      validateDocument(doc);
      setPreview(true);
    } catch (e) {
      setError(explainError(e));
    }
  }
  if (!doc)
    return (
      <main className="admin-shell admin-loading">
        <a href="#inicio" className="admin-back">
          <ArrowLeft size={16} />
          Volver a la web
        </a>
        <h1>Administración</h1>
        {busy ? (
          <p role="status">Cargando tu borrador…</p>
        ) : (
          <>
            <div role="alert" className="admin-alert">
              {error}
            </div>
            <div className="admin-actions">
              <button className="admin-primary" onClick={load}>
                Reintentar
              </button>
              <button className="admin-secondary" onClick={logout}>
                Cerrar sesión
              </button>
            </div>
          </>
        )}
      </main>
    );
  const usedPaths = [...new Set([...mediaPaths(doc), ...publishedMedia])];
  const product = doc.productos.find((p) => p.id === selected);
  return (
    <ImageContext.Provider value={images}>
      <div className="admin-shell">
        <header className="admin-topbar">
          <a href="#inicio">
            <ArrowLeft size={17} />
            <span>
              LOS COGOLLOS HERMANOS<small>Panel de administración</small>
            </span>
          </a>
          <button className="admin-secondary" onClick={logout} disabled={busy}>
            <LogOut size={16} />
            <span>Salir</span>
          </button>
        </header>
        <main className="admin-layout">
          <aside className="admin-sidebar">
            <span className="eyebrow">TU MARCA, EN TUS MANOS</span>
            <h1>
              Administración<span>.</span>
            </h1>
            <p>Sesión de administrador</p>
            <nav aria-label="Secciones del panel">
              {[
                ["productos", "Productos", Package],
                ["sitio", "Textos y marca", FileText],
              ].map(([id, label, Icon]) => (
                <button
                  key={id}
                  className={tab === id ? "active" : ""}
                  aria-current={tab === id ? "page" : undefined}
                  onClick={() => setTab(id)}
                  disabled={busy}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
              <button onClick={() => setLibrary(true)} disabled={busy}>
                <Images size={18} />
                Fotografías
              </button>
            </nav>
            <div className="admin-workflow">
              <span className={`save-dot ${dirty ? "dirty" : ""}`} />
              {dirty ? "Cambios sin guardar" : "Borrador guardado"}
              <p>
                {publishedVersion === version && !dirty
                  ? "Esta versión está publicada."
                  : "Hay cambios pendientes de publicar."}
              </p>
            </div>
          </aside>
          <div className="admin-workspace">
            <div className="admin-toolbar">
              <div>
                <span className="eyebrow">VERSIÓN {version}</span>
                <h2>
                  {tab === "productos"
                    ? "Tu catálogo"
                    : "La esencia de tu marca"}
                </h2>
              </div>
              <div className="admin-actions">
                <button
                  className="admin-secondary"
                  onClick={openPreview}
                  disabled={busy}
                >
                  <Eye size={17} />
                  Vista previa
                </button>
                <button
                  className="admin-secondary"
                  onClick={save}
                  disabled={busy || !dirty}
                >
                  <Save size={17} />
                  {busy ? "Procesando…" : "Guardar borrador"}
                </button>
                <button
                  className="admin-primary"
                  onClick={publish}
                  disabled={busy || dirty}
                >
                  <UploadCloud size={17} />
                  Publicar
                </button>
              </div>
            </div>
            <p className="admin-help">
              Guardar mantiene los cambios privados. Publicar actualiza el
              catálogo para todos.
            </p>
            {error && (
              <div className="admin-alert" role="alert">
                {error}
              </div>
            )}
            {imageError && (
              <div className="admin-alert" role="alert">
                {imageError} Puedes guardar el borrador; recarga después para
                reintentar las fotos.
              </div>
            )}
            {notice && (
              <div className="admin-success" role="status">
                {notice}
              </div>
            )}
            <fieldset disabled={busy} className="editor-fieldset">
              {tab === "productos" ? (
                <div className="products-editor">
                  <section
                    className="product-list"
                    aria-label="Lista de productos"
                  >
                    <div className="product-list-top">
                      <h3>{doc.productos.length} productos</h3>
                      <button
                        className="admin-icon"
                        onClick={addProduct}
                        aria-label="Crear producto"
                      >
                        <Plus />
                      </button>
                    </div>
                    <label className="sr-only" htmlFor="admin-search">
                      Buscar productos
                    </label>
                    <input
                      id="admin-search"
                      type="search"
                      placeholder="Buscar producto…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    {doc.productos
                      .filter((p) =>
                        p.nombre.toLowerCase().includes(search.toLowerCase()),
                      )
                      .map((p) => (
                        <button
                          className={`product-list-item ${p.id === selected ? "selected" : ""}`}
                          key={p.id}
                          aria-pressed={p.id === selected}
                          onClick={() => setSelected(p.id)}
                        >
                          <strong>{p.nombre || "Nuevo producto"}</strong>
                          <small>
                            {p.visible ? "Incluido al publicar" : "Oculto"} ·{" "}
                            {p.disponible ? "Disponible" : "Agotado"}
                          </small>
                        </button>
                      ))}
                    {!doc.productos.length && (
                      <p>
                        Tu catálogo está vacío. Crea tu primer producto con +.
                      </p>
                    )}
                  </section>
                  {product ? (
                    <section
                      className="admin-card product-form"
                      key={product.id}
                    >
                      <div className="admin-card-heading">
                        <h3 ref={editorTitle} tabIndex={-1}>
                          {product.nombre || "Nuevo producto"}
                        </h3>
                        <div className="admin-actions">
                          <button
                            className="admin-icon"
                            aria-label="Mover producto arriba"
                            disabled={doc.productos[0].id === product.id}
                            onClick={() => reorder(product.id, -1)}
                          >
                            <ArrowUp size={17} />
                          </button>
                          <button
                            className="admin-icon"
                            aria-label="Mover producto abajo"
                            disabled={doc.productos.at(-1).id === product.id}
                            onClick={() => reorder(product.id, 1)}
                          >
                            <ArrowDown size={17} />
                          </button>
                          <button
                            className="admin-icon danger"
                            aria-label="Eliminar producto"
                            onClick={() => removeProduct(product)}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </div>
                      <CheckField
                        label="Incluir al publicar"
                        checked={product.visible}
                        onChange={(v) =>
                          updateProduct(product.id, "visible", v)
                        }
                      />
                      <div className="form-grid">
                        <TextField
                          label="Nombre"
                          value={product.nombre}
                          required
                          onChange={(v) =>
                            updateProduct(product.id, "nombre", v)
                          }
                        />
                        <TextField
                          label="Categoría"
                          value={product.categoria}
                          required
                          onChange={(v) =>
                            updateProduct(product.id, "categoria", v)
                          }
                        />
                      </div>
                      <TextField
                        label="Descripción breve"
                        value={product.descripcion}
                        multiline
                        required
                        onChange={(v) =>
                          updateProduct(product.id, "descripcion", v)
                        }
                      />
                      <TextField
                        label="Descripción completa"
                        value={product.descripcionCompleta}
                        multiline
                        required
                        onChange={(v) =>
                          updateProduct(product.id, "descripcionCompleta", v)
                        }
                      />
                      <div className="form-grid">
                        <CheckField
                          label="Disponible"
                          checked={product.disponible}
                          onChange={(v) =>
                            updateProduct(product.id, "disponible", v)
                          }
                        />
                        <CheckField
                          label="Destacado"
                          checked={product.destacado}
                          onChange={(v) =>
                            updateProduct(product.id, "destacado", v)
                          }
                        />
                      </div>
                      <ImageField
                        label="Fotografía principal"
                        value={product.imagen}
                        onChange={(v) => updateProduct(product.id, "imagen", v)}
                        usedPaths={usedPaths}
                      />
                      <GalleryField
                        value={product.galeria}
                        onChange={(v) =>
                          updateProduct(product.id, "galeria", v)
                        }
                        usedPaths={usedPaths}
                      />
                      <FeaturesField
                        value={product.caracteristicas}
                        onChange={(v) =>
                          updateProduct(product.id, "caracteristicas", v)
                        }
                      />
                    </section>
                  ) : (
                    <section className="admin-card">
                      <h3>Empieza tu selección</h3>
                      <p>Selecciona un producto o crea uno nuevo.</p>
                      <button className="admin-primary" onClick={addProduct}>
                        <Plus size={17} />
                        Crear producto
                      </button>
                    </section>
                  )}
                </div>
              ) : (
                <section className="admin-card site-form">
                  <h3>Identidad y textos</h3>
                  {siteFields.map(([key, label, multiline]) => (
                    <TextField
                      key={key}
                      label={label}
                      value={doc.sitio[key]}
                      multiline={multiline}
                      required={key === "nombre"}
                      onChange={(v) => updateSite(key, v)}
                    />
                  ))}
                  <CheckField
                    label="Mostrar avisos de demostración (mantener mientras haya ejemplos ficticios)"
                    checked={doc.sitio.demostracion}
                    onChange={(v) => updateSite("demostracion", v)}
                  />
                  <h3>Imágenes de marca</h3>
                  {[
                    ["logo", "Logotipo"],
                    ["portada", "Imagen de portada"],
                    ["fotoNosotros", "Imagen de Sobre nosotros"],
                  ].map(([key, label]) => (
                    <ImageField
                      key={key}
                      label={label}
                      value={doc.sitio[key]}
                      onChange={(v) => updateSite(key, v)}
                      usedPaths={usedPaths}
                    />
                  ))}
                  <h3>Redes oficiales</h3>
                  <p className="admin-help">
                    Deja la dirección vacía para mostrar «Próximamente».
                  </p>
                  {doc.sitio.redes.map((r, i) => (
                    <div className="social-row" key={i}>
                      <TextField
                        label={`Nombre de red ${i + 1}`}
                        value={r.nombre}
                        onChange={(v) =>
                          updateSite(
                            "redes",
                            doc.sitio.redes.map((red, n) =>
                              n === i ? { ...red, nombre: v } : red,
                            ),
                          )
                        }
                      />
                      <TextField
                        label="Enlace https://"
                        value={r.url}
                        onChange={(v) =>
                          updateSite(
                            "redes",
                            doc.sitio.redes.map((red, n) =>
                              n === i ? { ...red, url: v } : red,
                            ),
                          )
                        }
                      />
                      <button
                        className="admin-icon"
                        aria-label={`Eliminar red ${i + 1}`}
                        onClick={() =>
                          updateSite(
                            "redes",
                            doc.sitio.redes.filter((_, n) => n !== i),
                          )
                        }
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  ))}
                  <button
                    className="admin-secondary"
                    onClick={() =>
                      updateSite("redes", [
                        ...doc.sitio.redes,
                        { nombre: "Nueva red", url: "" },
                      ])
                    }
                    disabled={doc.sitio.redes.length >= 20}
                  >
                    <Plus size={17} />
                    Agregar red
                  </button>
                </section>
              )}
            </fieldset>
            <div className="admin-bottom-tools">
              <button className="admin-link" onClick={backup} disabled={busy}>
                <Download size={15} />
                Descargar copia de textos y catálogo
              </button>
              <input
                className="sr-only"
                type="file"
                accept="application/json,.json"
                ref={importInput}
                onChange={restore}
              />
              <button
                className="admin-link"
                onClick={() => importInput.current.click()}
                disabled={busy}
              >
                Restaurar copia JSON
              </button>
              <button
                className="admin-link"
                onClick={() => {
                  if (
                    !dirty ||
                    window.confirm(
                      "¿Descartar los cambios sin guardar y cargar el borrador guardado?",
                    )
                  )
                    load();
                }}
                disabled={busy}
              >
                <RefreshCw size={15} />
                Recargar borrador
              </button>
            </div>
          </div>
        </main>
        {library && (
          <MediaLibrary
            onClose={() => setLibrary(false)}
            usedPaths={usedPaths}
          />
        )}
      </div>
      {preview && <Preview onClose={() => setPreview(false)} doc={doc} />}
    </ImageContext.Provider>
  );
}
function Preview({ onClose, doc }) {
  const close = useRef(null);
  const dialog = useRef(null);
  useEffect(() => {
    const active = document.activeElement;
    const el = dialog.current;
    el.showModal();
    close.current?.focus();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      el.close();
      document.body.style.overflow = old;
      active?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="admin-preview"
      aria-label="Vista previa privada"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="preview-toolbar">
        <span>Vista previa privada · Cambios sin publicar</span>
        <button ref={close} onClick={onClose} aria-label="Cerrar vista previa">
          <X size={18} />
          Volver al panel
        </button>
      </div>
      <div
        className="preview-content"
        onClick={(e) => {
          const a = e.target.closest("a");
          if (a?.getAttribute("href")?.startsWith("#")) {
            e.preventDefault();
            const id = a.getAttribute("href").slice(1);
            if (id === "/admin") {
              onClose();
              return;
            }
            e.currentTarget
              .querySelector(`[id="${id}"]`)
              ?.scrollIntoView({ behavior: "smooth" });
          }
        }}
      >
        <App
          document={{
            ...doc,
            productos: doc.productos.filter((p) => p.visible),
          }}
        />
      </div>
    </dialog>
  );
}
