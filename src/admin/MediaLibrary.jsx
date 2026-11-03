import { useEffect, useRef, useState } from "react";
import { X, Upload, Trash2, Check } from "lucide-react";
import { listImages, deleteImage } from "../services/contenido";
import { uploadImage } from "../services/imagenes";
import { explainError } from "../utils/documento";
import { asset } from "../utils/catalogo";
const samples = [
  "esmeralda",
  "ambar",
  "nocturno",
  "hero",
  "logo",
  "placeholder",
].map((n) => `images/${n}.svg`);
export default function MediaLibrary({
  onClose,
  onSelect,
  multiple = false,
  usedPaths = [],
}) {
  const dialog = useRef(null);
  const input = useRef(null);
  const [files, setFiles] = useState([]);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState([]);
  useEffect(() => {
    const active = document.activeElement;
    const el = dialog.current;
    el.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      el.close();
      document.body.style.overflow = old;
      active?.focus();
    };
  }, []);
  async function load(offset = 0) {
    setBusy(true);
    setError("");
    try {
      const result = await listImages(offset);
      setFiles((old) => (offset ? [...old, ...result.files] : result.files));
      setMore(result.more);
    } catch (e) {
      setError(explainError(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  function choose(path) {
    if (!onSelect) return;
    if (!multiple) {
      onSelect([path]);
      onClose();
      return;
    }
    setSelected((old) =>
      old.includes(path) ? old.filter((p) => p !== path) : [...old, path],
    );
  }
  async function upload(event) {
    const picked = [...event.target.files];
    event.target.value = "";
    if (!picked.length) return;
    if (picked.length > 12) {
      setError("Sube como máximo 12 fotos a la vez.");
      return;
    }
    setBusy(true);
    setError("");
    const paths = [];
    try {
      for (const file of picked) paths.push(await uploadImage(file));
      await load();
      if (onSelect) {
        onSelect(multiple ? paths : [paths[0]]);
        onClose();
      }
    } catch (e) {
      await load();
      setError(
        `${explainError(e)}${paths.length ? " Las fotos que se subieron correctamente se conservan en la biblioteca." : ""}`,
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove(file) {
    if (
      !window.confirm(
        "¿Eliminar esta foto de la biblioteca? Esta acción no se puede deshacer.",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await deleteImage(file.path);
      setFiles((old) => old.filter((f) => f.path !== file.path));
      setSelected((old) => old.filter((p) => p !== file.path));
    } catch (e) {
      setError(explainError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      className="media-dialog"
      ref={dialog}
      aria-labelledby="media-heading"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
      onClick={(e) => {
        if (e.target === dialog.current && !busy) onClose();
      }}
    >
      <div className="media-header">
        <div>
          <span className="eyebrow">BIBLIOTECA PRIVADA</span>
          <h2 id="media-heading">Fotografías</h2>
        </div>
        <button
          type="button"
          className="admin-icon"
          onClick={onClose}
          disabled={busy}
          aria-label="Cerrar biblioteca"
        >
          <X />
        </button>
      </div>
      <p>
        JPEG, PNG o WebP hasta 15 MB. Se optimizan al subir. Las fotos nuevas
        permanecen privadas hasta publicar.
      </p>
      <input
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple || !onSelect}
        ref={input}
        onChange={upload}
        disabled={busy}
      />
      <button
        type="button"
        className="admin-primary"
        onClick={() => input.current.click()}
        disabled={busy}
      >
        <Upload size={17} />
        {busy ? "Procesando…" : "Subir fotografías"}
      </button>
      {error && (
        <div role="alert" className="admin-alert">
          {error}
          <button type="button" onClick={() => load()} disabled={busy}>
            Reintentar carga
          </button>
        </div>
      )}
      <div className="media-grid">
        {files.map((f) => (
          <div key={f.path} className="media-tile">
            <button
              className="media-choose"
              type="button"
              onClick={() => choose(f.path)}
              disabled={busy || !onSelect}
              aria-pressed={selected.includes(f.path)}
              aria-label={`Seleccionar fotografía ${f.name}`}
            >
              <img
                src={f.url || asset("images/placeholder.svg")}
                alt="Fotografía de la biblioteca"
                loading="lazy"
              />
              {selected.includes(f.path) && (
                <Check className="media-selected" />
              )}
            </button>
            <button
              type="button"
              className="media-delete"
              aria-label="Eliminar fotografía"
              title={
                usedPaths.includes(f.path)
                  ? "Esta foto está en uso"
                  : "Eliminar fotografía"
              }
              disabled={busy || usedPaths.includes(f.path)}
              onClick={() => remove(f)}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
      {!files.length && !busy && !error && (
        <p>No hay fotografías subidas todavía.</p>
      )}
      {more && (
        <button
          type="button"
          className="admin-secondary"
          disabled={busy}
          onClick={() => load(files.length)}
        >
          Cargar más fotos
        </button>
      )}
      {onSelect && (
        <>
          <h3>Ilustraciones de ejemplo</h3>
          <div className="media-grid">
            {samples.map((path) => (
              <button
                className="media-choose"
                type="button"
                key={path}
                onClick={() => choose(path)}
                disabled={busy}
                aria-pressed={selected.includes(path)}
                aria-label={`Seleccionar ${path}`}
              >
                <img src={asset(path)} alt="Ilustración de ejemplo" />
                {selected.includes(path) && (
                  <Check className="media-selected" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
      {multiple && onSelect && (
        <div className="admin-actions">
          <button
            type="button"
            className="admin-primary"
            disabled={busy || !selected.length}
            onClick={() => {
              onSelect(selected);
              onClose();
            }}
          >
            Usar {selected.length} fotos seleccionadas
          </button>
        </div>
      )}
    </dialog>
  );
}
