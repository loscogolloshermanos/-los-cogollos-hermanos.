export const asset = (path) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
export function filtrarProductos(
  productos,
  busqueda,
  categoria,
  disponibilidad,
) {
  const normalize = (value) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  return productos.filter(
    (p) =>
      normalize(p.nombre).includes(normalize(busqueda.trim())) &&
      (categoria === "Todas" || p.categoria === categoria) &&
      (disponibilidad === "Todos" ||
        p.disponible === (disponibilidad === "Disponible")),
  );
}
