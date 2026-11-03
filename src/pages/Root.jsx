import { lazy, Suspense, useEffect, useState } from "react";
import App from "./App";
import { ImageContext } from "../components/ImageContext";
import { readPublication, resolveImages } from "../services/contenido";
import { authCallbackOnLoad } from "../services/supabase";
import { explainError } from "../utils/documento";
const Admin = lazy(() => import("../admin/Admin"));
function isAdminRoute() {
  return (
    window.location.hash.startsWith("#/admin") ||
    new URLSearchParams(window.location.search).has("admin") ||
    /^#(access_token|error|refresh_token)=/.test(window.location.hash)
  );
}
export default function Root() {
  const [admin, setAdmin] = useState(
    () => isAdminRoute() || authCallbackOnLoad,
  );
  useEffect(() => {
    const change = () => {
      const next = isAdminRoute();
      if (!next) {
        const leave = new Event("lch:leave-admin", { cancelable: true });
        if (!window.dispatchEvent(leave)) {
          window.history.replaceState(
            null,
            "",
            `${window.location.pathname}#/admin`,
          );
          return;
        }
      }
      setAdmin(next);
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [admin]);
  if (admin)
    return (
      <Suspense
        fallback={
          <div className="page-state" role="status">
            Abriendo el panel…
          </div>
        }
      >
        <Admin />
      </Suspense>
    );
  return <PublicSite />;
}
function PublicSite() {
  const [content, setContent] = useState(null);
  const [images, setImages] = useState({});
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [imageError, setImageError] = useState("");
  useEffect(() => {
    let live = true;
    async function load() {
      try {
        const result = await readPublication();
        if (!live) return;
        setContent(result);
        setError("");
        window.document.title = `${result.document.sitio.nombre} — Catálogo`;
        try {
          const map = await resolveImages(result.document);
          if (live) {
            setImages(map);
            setImageError("");
          }
        } catch {
          if (live)
            setImageError("No se pudieron cargar algunas fotos. Reintentar");
        }
      } catch (e) {
        if (live) setError(explainError(e));
      }
    }
    load();
    const interval = setInterval(load, 45 * 60 * 1000);
    const visible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      live = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [retry]);
  if (!content)
    return (
      <div className="page-state" role={error ? "alert" : "status"}>
        <h1 className="state-title">LOS COGOLLOS HERMANOS</h1>
        <p>{error || "Cargando el catálogo…"}</p>
        {error && (
          <button
            onClick={() => {
              setError("");
              setRetry((n) => n + 1);
            }}
          >
            Reintentar
          </button>
        )}
        <a href="#/admin">Administración</a>
      </div>
    );
  return (
    <ImageContext.Provider value={images}>
      {(error || imageError) && (
        <div className="public-notice" role="status">
          {error || imageError}{" "}
          <button onClick={() => setRetry((n) => n + 1)}>Reintentar</button>
        </div>
      )}
      <App document={content.document} />
    </ImageContext.Provider>
  );
}
