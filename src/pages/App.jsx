import { useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  Menu,
  X,
  Search,
  SlidersHorizontal,
  Leaf,
  Instagram,
  ExternalLink,
} from "lucide-react";
import ProductCard from "../components/ProductCard";
import ProductModal from "../components/ProductModal";
import { filtrarProductos } from "../utils/catalogo";
import { useImage } from "../components/ImageContext";
export default function App({ document }) {
  const { sitio, productos } = document;
  const asset = useImage();
  const [menu, setMenu] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("Todas");
  const [disponibilidad, setDisponibilidad] = useState("Todos");
  const [selected, setSelected] = useState(null);
  const filtered = filtrarProductos(
    productos,
    busqueda,
    categoria,
    disponibilidad,
  );
  const clear = () => {
    setBusqueda("");
    setCategoria("Todas");
    setDisponibilidad("Todos");
  };
  return (
    <>
      <a className="skip-link" href="#catalogo">
        Saltar al catálogo
      </a>
      <header>
        <a
          href="#inicio"
          className="brand"
          aria-label={`${sitio.nombre} — inicio`}
        >
          <img src={asset(sitio.logo)} alt="" width="42" height="42" />
          <BrandName name={sitio.nombre} />
        </a>
        <nav
          className={menu ? "open" : ""}
          id="navigation"
          aria-label="Navegación principal"
        >
          {[
            ["Inicio", "inicio"],
            ["Catálogo", "catalogo"],
            ["Nosotros", "nosotros"],
            ["Contacto", "contacto"],
          ].map(([name, id]) => (
            <a key={id} href={`#${id}`} onClick={() => setMenu(false)}>
              {name}
            </a>
          ))}
        </nav>
        <a href="#catalogo" className="header-cta">
          Explorar catálogo <ArrowUpRight size={16} />
        </a>
        <button
          className="menu-button"
          onClick={() => setMenu(!menu)}
          aria-expanded={menu}
          aria-controls="navigation"
          aria-label={menu ? "Cerrar menú" : "Abrir menú"}
        >
          {menu ? <X /> : <Menu />}
        </button>
      </header>
      <main>
        <section id="inicio" className="hero">
          <div className="hero-art" aria-hidden="true">
            <img src={asset(sitio.portada)} alt="" fetchPriority="high" />
          </div>
          <div className="hero-content">
            <span className="eyebrow hero-kicker">
              <span /> {sitio.etiquetaPortada}
            </span>
            <h1>
              {sitio.nombre.split(" ").slice(0, -1).join(" ")}
              <br />
              <em>{sitio.nombre.split(" ").slice(-1)[0]}.</em>
            </h1>
            <p className="hero-tagline">{sitio.frase}</p>
            <p className="hero-description">{sitio.introduccion}</p>
            <a className="primary-button" href="#catalogo">
              Descubre el catálogo <ArrowUpRight size={19} />
            </a>
            <div className="hero-foot">
              <span>EXPLORA. CONOCE. CONECTA.</span>
              <a href="#catalogo" aria-label="Ir al catálogo">
                <ArrowDown size={18} />
              </a>
            </div>
          </div>
          {sitio.demostracion && (
            <span className="art-caption">
              ESTUDIO BOTÁNICO / 001
              <br />
              ILUSTRACIÓN ORIGINAL
            </span>
          )}
        </section>
        <div className="brand-strip">
          <span>
            <Leaf size={15} /> IDENTIDAD PROPIA
          </span>
          <span>INSPIRACIÓN NATURAL</span>
          <span>ATENCIÓN AL DETALLE</span>
          <span>{sitio.nombre}</span>
        </div>
        <section id="catalogo" className="section catalog">
          <div className="section-heading">
            <div>
              <span className="eyebrow">01 / EXPLORA NUESTRA SELECCIÓN</span>
              <h2>{sitio.tituloCatalogo}</h2>
            </div>
            <p>{sitio.textoCatalogo}</p>
          </div>
          {sitio.demostracion && (
            <div className="demo-banner">
              <span className="demo-dot" /> Catálogo de demostración. Los
              ejemplos son ficticios; sus estados no reflejan existencias
              reales.
            </div>
          )}
          <div className="filters">
            <label className="search">
              <Search size={18} />
              <span className="sr-only">Buscar por nombre</span>
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar en el catálogo…"
                type="search"
              />
            </label>
            <div className="select-group">
              <SlidersHorizontal size={16} />
              <label>
                <span className="sr-only">Categoría</span>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                >
                  <option value="Todas">Todas las categorías</option>
                  {[...new Set(productos.map((p) => p.categoria))].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="sr-only">Disponibilidad</span>
                <select
                  value={disponibilidad}
                  onChange={(e) => setDisponibilidad(e.target.value)}
                >
                  <option value="Todos">Todos los estados</option>
                  <option>Disponible</option>
                  <option>Agotado</option>
                </select>
              </label>
            </div>
          </div>
          <div className="results-line" aria-live="polite">
            <span>
              {filtered.length}{" "}
              {filtered.length === 1 ? "producto" : "productos"}
            </span>
            <span>UNA SELECCIÓN CON IDENTIDAD</span>
          </div>
          {filtered.length ? (
            <div className="product-grid">
              {filtered.map((p) => (
                <ProductCard
                  key={p.id}
                  producto={p}
                  demo={sitio.demostracion}
                  onOpen={setSelected}
                />
              ))}
            </div>
          ) : (
            <div className="empty">
              <Leaf size={30} />
              <h3>No encontramos productos</h3>
              <p>Prueba con otro nombre o ajusta los filtros.</p>
              <button className="detail-button" onClick={clear}>
                Limpiar filtros <ArrowUpRight size={18} />
              </button>
            </div>
          )}
        </section>
        <section id="nosotros" className="about section">
          <div className="about-art">
            <img
              src={asset(sitio.fotoNosotros)}
              alt="Imagen de nuestra marca"
              loading="lazy"
              width="800"
              height="800"
            />
            <span>RAÍCES QUE NOS UNEN.</span>
          </div>
          <div className="about-copy">
            <span className="eyebrow">02 / NUESTRA ESENCIA</span>
            <EditorialTitle text={sitio.tituloNosotros} />
            <p>{sitio.historia}</p>
            <p>{sitio.filosofia}</p>
            <div className="signature">
              <Leaf />
              <span>{sitio.nombre}</span>
            </div>
          </div>
        </section>
        <section id="contacto" className="contact section">
          <span className="eyebrow">03 / SIGAMOS CONECTADOS</span>
          <EditorialTitle text={sitio.tituloContacto} />
          <p>{sitio.textoContacto}</p>
          <div className="socials">
            {sitio.redes.map((red) =>
              red.url ? (
                <a
                  key={red.nombre}
                  href={red.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {red.nombre === "Instagram" ? (
                    <Instagram size={19} />
                  ) : (
                    <ExternalLink size={19} />
                  )}{" "}
                  {red.nombre}
                  <ArrowUpRight size={18} />
                </a>
              ) : (
                <span key={red.nombre}>
                  <Instagram size={19} />
                  {red.nombre}
                  <small>Próximamente</small>
                </span>
              ),
            )}
          </div>
          {sitio.redes.some((r) => !r.url) && (
            <p className="contact-note">
              Los enlaces oficiales se habilitarán cuando se configuren.
            </p>
          )}
        </section>
      </main>
      <footer>
        <a className="brand" href="#inicio">
          <img src={asset(sitio.logo)} alt="" width="34" height="34" />
          <BrandName name={sitio.nombre} />
        </a>
        <p>{sitio.pie}</p>
        <div className="footer-links">
          <a href="#inicio">Volver arriba ↑</a>
          <a href="#/admin">Administración</a>
        </div>
      </footer>
      {selected && (
        <ProductModal
          key={selected.id}
          producto={selected}
          demo={sitio.demostracion}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function BrandName({ name }) {
  const words = name.trim().split(/\s+/);
  return (
    <span>
      {words.slice(0, -1).join(" ")}
      {words.length > 1 && <br />}
      <b>{words.at(-1)}</b>
    </span>
  );
}
function EditorialTitle({ text }) {
  const parts = text.split("\n");
  return (
    <h2>
      {parts.length === 1 ? (
        text
      ) : (
        <>
          {parts.slice(0, -1).join(" ")}
          <br />
          <em>{parts.at(-1)}</em>
        </>
      )}
    </h2>
  );
}
