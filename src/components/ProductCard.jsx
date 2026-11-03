import { ArrowUpRight } from "lucide-react";
import { useImage } from "./ImageContext";
export default function ProductCard({ producto: p, demo, onOpen }) {
  const asset = useImage();
  return (
    <article className={`product-card ${p.disponible ? "" : "sold-out"}`}>
      <button
        className="product-image"
        onClick={() => onOpen(p)}
        aria-label={`Ver detalles de ${p.nombre}`}
      >
        <img
          src={asset(p.imagen)}
          alt={`Imagen de ${p.nombre}`}
          loading="lazy"
          width="800"
          height="650"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = asset("images/placeholder.svg");
          }}
        />
        <span className={`badge ${p.disponible ? "available" : ""}`}>
          <i />
          {p.disponible ? "Disponible" : "Agotado"}{" "}
          {demo && <span>· demo</span>}
        </span>
        {p.destacado && <span className="featured">SELECCIÓN LCH</span>}
      </button>
      <div className="product-content">
        <span className="eyebrow">{p.categoria}</span>
        <h3>{p.nombre}</h3>
        <p>{p.descripcion}</p>
        <button className="detail-button" onClick={() => onOpen(p)}>
          Explorar detalles <ArrowUpRight size={18} />
        </button>
      </div>
    </article>
  );
}
