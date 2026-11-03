import { useEffect, useRef, useState } from "react";
import { ArrowUp, ArrowDown, ImagePlus, X, Plus } from "lucide-react";
import MediaLibrary from "./MediaLibrary";
import { useImage } from "../components/ImageContext";
export function TextField({
  label,
  value,
  onChange,
  multiline = false,
  required = false,
  maxLength = 10000,
  ...props
}) {
  const input = {
    value: value ?? "",
    onChange: (e) => onChange(e.target.value),
    required,
    maxLength,
    ...props,
  };
  return (
    <label>
      {label}
      {multiline ? (
        <textarea rows={4} {...input} />
      ) : (
        <input type="text" {...input} />
      )}
    </label>
  );
}
export function CheckField({ label, checked, onChange }) {
  return (
    <label className="admin-checkbox">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
export function ImageField({ label, value, onChange, usedPaths }) {
  const [open, setOpen] = useState(false);
  const src = useImage();
  return (
    <div className="image-field">
      <span className="field-label">{label}</span>
      <div className="image-field-row">
        <img src={src(value)} alt={label} />
        <div>
          <button
            type="button"
            className="admin-secondary"
            onClick={() => setOpen(true)}
          >
            <ImagePlus size={16} />
            Elegir o subir foto
          </button>
          <p>Se guarda primero en el borrador.</p>
        </div>
      </div>
      {open && (
        <MediaLibrary
          onClose={() => setOpen(false)}
          onSelect={(paths) => onChange(paths[0])}
          usedPaths={usedPaths}
        />
      )}
    </div>
  );
}
function move(items, from, to) {
  const copy = [...items];
  [copy[from], copy[to]] = [copy[to], copy[from]];
  return copy;
}
export function GalleryField({ value, onChange, usedPaths }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const src = useImage();
  function add(paths) {
    const next = [...new Set([...value, ...paths])];
    if (next.length > 12) {
      setError(
        "La galería admite como máximo 12 fotos. Retira alguna antes de añadir más.",
      );
      return;
    }
    setError("");
    onChange(next);
  }
  return (
    <div>
      <span className="field-label">Galería de imágenes</span>
      <p className="admin-help">
        Hasta 12 fotos, además de la fotografía principal.
      </p>
      <div className="gallery-editor">
        {value.map((path, i) => (
          <div key={`${path}-${i}`}>
            <img src={src(path)} alt={`Imagen ${i + 1} de la galería`} />
            <div className="gallery-controls">
              <button
                type="button"
                aria-label={`Subir imagen ${i + 1}`}
                disabled={!i}
                onClick={() => onChange(move(value, i, i - 1))}
              >
                <ArrowUp size={14} />
              </button>
              <button
                type="button"
                aria-label={`Bajar imagen ${i + 1}`}
                disabled={i === value.length - 1}
                onClick={() => onChange(move(value, i, i + 1))}
              >
                <ArrowDown size={14} />
              </button>
              <button
                type="button"
                aria-label={`Retirar imagen ${i + 1}`}
                onClick={() => onChange(value.filter((_, n) => n !== i))}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="admin-secondary"
        onClick={() => setOpen(true)}
        disabled={value.length >= 12}
      >
        <Plus size={16} />
        Agregar fotos
      </button>
      {error && <p role="alert">{error}</p>}
      {open && (
        <MediaLibrary
          onClose={() => setOpen(false)}
          onSelect={add}
          multiple
          usedPaths={usedPaths}
        />
      )}
    </div>
  );
}
export function FeaturesField({ value, onChange }) {
  // Keep empty rows and duplicate labels editable until the user fixes them.
  const [rows, setRows] = useState(() => Object.entries(value));
  const [error, setError] = useState("");
  const emitted = useRef(value);
  useEffect(() => {
    if (value !== emitted.current) {
      setRows(Object.entries(value));
      setError("");
      emitted.current = value;
    }
  }, [value]);
  function update(next) {
    setRows(next);
    const keys = next.map(([k]) => k);
    const invalid =
      keys.some((k) => !k.trim()) ||
      new Set(keys).size !== keys.length ||
      next.some(([, v]) => !v.trim());
    setError(
      invalid
        ? "Completa cada fila y utiliza nombres de característica distintos."
        : "",
    );
    const result = Object.fromEntries(next);
    if (invalid) result[""] = "";
    emitted.current = result;
    onChange(result);
  }
  return (
    <div>
      <span className="field-label">Características verificadas</span>
      {rows.map(([key, val], i) => (
        <div className="feature-row" key={i}>
          <input
            aria-label={`Nombre de característica ${i + 1}`}
            placeholder="Ej.: Referencia"
            value={key}
            maxLength={200}
            onChange={(e) =>
              update(
                rows.map((row, n) =>
                  n === i ? [e.target.value, row[1]] : row,
                ),
              )
            }
          />
          <input
            aria-label={`Valor de característica ${i + 1}`}
            placeholder="Valor"
            value={val}
            maxLength={2000}
            onChange={(e) =>
              update(
                rows.map((row, n) =>
                  n === i ? [row[0], e.target.value] : row,
                ),
              )
            }
          />
          <button
            type="button"
            className="admin-icon"
            onClick={() => update(rows.filter((_, n) => n !== i))}
            aria-label={`Quitar característica ${i + 1}`}
          >
            <X size={16} />
          </button>
        </div>
      ))}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        className="admin-secondary"
        onClick={() => update([...rows, ["", ""]])}
      >
        <Plus size={16} />
        Agregar característica
      </button>
    </div>
  );
}
