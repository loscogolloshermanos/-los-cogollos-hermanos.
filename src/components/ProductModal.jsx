import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useImage } from "./ImageContext";
export default function ProductModal({ producto: p, demo, onClose }) {
  const asset = useImage();
  const ref = useRef(null);
  const [imagen, setImagen] = useState(p.imagen);
  useEffect(() => {
    const dialog = ref.current;
    const active = document.activeElement;
    dialog.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = old;
      active?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="product-title"
    >
      <div className="modal-inner">
        <button
          className="close-button"
          onClick={onClose}
          aria-label="Cerrar detalle"
        >
          <X />
        </button>
        <div>
          <img
            className="modal-image"
            src={asset(imagen)}
            alt={`Imagen de ${p.nombre}`}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = asset("images/placeholder.svg");
            }}
          />
          {p.galeria.length > 0 && (
            <div className="gallery">
              {[...new Set([p.imagen, ...p.galeria])].map((img, i) => (
                <button
                  key={img}
                  aria-label={`Ver imagen ${i + 1}`}
                  aria-pressed={imagen === img}
                  onClick={() => setImagen(img)}
                >
                  <img src={asset(img)} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="modal-copy">
          <span className="eyebrow">{p.categoria}</span>
          <h2 id="product-title">{p.nombre}</h2>
          <span className={`badge static ${p.disponible ? "available" : ""}`}>
            {p.disponible ? "Disponible" : "Agotado"}
            {demo ? " · estado de ejemplo" : ""}
          </span>
          <p>{p.descripcionCompleta}</p>
          <h3>Características</h3>
          <dl>
            {Object.entries(p.caracteristicas).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {demo && (
            <p className="demo-note">
              Contenido ficticio de demostración. No indica disponibilidad real.
            </p>
          )}
        </div>
      </div>
    </dialog>
  );
}
