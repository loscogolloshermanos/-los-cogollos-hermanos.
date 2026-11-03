# LOS COGOLLOS HERMANOS

Catálogo informativo con panel privado, React, Vite, Tailwind y Supabase. El frontend se aloja en GitHub Pages; productos, textos y fotografías se administran desde el navegador. Sin compras, pagos ni pedidos.

## Panel de administración

Accede a `/#/admin` dentro de la URL de la web. El único correo autorizado es **robrtmoral569@gmail.com**. Para usarlo por primera vez, completa [la guía de activación](docs/ADMINISTRACION.md): ejecutar SQL, configurar las URL de retorno e invitar al usuario. El panel muestra un enlace a `configuracion.html` con instrucciones y un botón para copiar el SQL.

Desde el panel puedes crear, modificar, ordenar y eliminar productos; subir y ordenar fotos; editar textos, logotipo y redes; guardar borradores, previsualizar y publicar. Guardar no altera la publicación. Las fotos nuevas son privadas hasta publicar. Las claves públicas no son permisos de administrador.

Después de activar Supabase, **los cambios de catálogo se hacen desde el panel**, sin modificar JSON ni recompilar. Los JSON originales se conservan solo como semilla de los ejemplos ficticios. La sección siguiente describe el proyecto inicial y la personalización por código; la administración remota es la fuente de verdad una vez activada.

## 1. Ejecutar localmente

Necesitas Node.js 22 y npm. Desde esta carpeta:

```bash
npm ci
npm run dev
```

Abre la dirección indicada por Vite (normalmente http://localhost:5173). Para comprobar la versión final:

```bash
npm test
npm run build
npm run preview
```

La vista compilada suele estar en http://localhost:4173. `npm run check` valida campos, IDs únicos, imágenes locales y enlaces de redes. `npm run build` también valida los datos antes de compilar. Los cambios en JSON se reflejan durante el desarrollo; para una web publicada es necesario recompilar y desplegar.

## 2. Agregar un producto

Edita `src/data/productos.json`. Añade un objeto a la lista, separado por coma, con un ID único:

```json
{
  "id": "referencia-unica",
  "nombre": "Nombre real verificado",
  "categoria": "Categoría",
  "descripcion": "Resumen breve.",
  "descripcionCompleta": "Descripción completa verificada.",
  "imagen": "images/mi-foto.webp",
  "galeria": [],
  "caracteristicas": {
    "Referencia": "Valor verificado"
  },
  "disponible": false,
  "destacado": false
}
```

Copia primero la fotografía en `public/images/mi-foto.webp`. No escribas comentarios en JSON. Las categorías y el número de resultados se generan automáticamente; no necesitas editar componentes. `destacado` añade una etiqueta visual, sin alterar el orden del JSON. `galeria` admite una lista de rutas locales. Evita afirmaciones técnicas o sanitarias sin respaldo. Cuando reemplaces TODOS los ejemplos por información real verificada, cambia `demostracion` a `false` en `src/data/sitio.json`. Esto retira automáticamente los avisos y etiquetas de demostración, sin modificar los componentes.

## 3. Eliminar un producto

Borra su objeto completo del JSON y ajusta las comas. La lista vacía `[]` es válida y muestra un estado vacío. Las imágenes sin uso pueden eliminarse de `public/images/`.

## 4. Marcar como agotado

Cambia `"disponible": true` por `"disponible": false` (sin comillas en el booleano). El producto permanece visible con etiqueta gris e imagen atenuada. El filtro permite encontrarlo.

## 5. Cambiar fotografías y logotipo

Guarda tus archivos autorizados en `public/images/` y cambia `imagen` o `galeria` en el JSON. Usa rutas como `images/foto.webp`, sin `/` inicial ni `public/`. Utiliza WebP/AVIF, aproximadamente 1000–1400 px de ancho y preferiblemente menos de 250 KB. Las imágenes del catálogo tienen carga diferida y dimensiones reservadas. Las ilustraciones SVG incluidas son originales creadas para esta maqueta y no fotografías de productos. Puedes sustituir `hero.svg` para cambiar la portada. El logo provisional se configura en `src/data/sitio.json`, campo `logo`; utiliza una ruta local. Reemplaza también el favicon en `index.html` si deseas otro archivo.

## 6. Modificar textos y redes

Edita `src/data/sitio.json`: `frase`, `introduccion`, `historia`, `filosofia`, `logo` y `redes`. La historia y filosofía están marcadas como textos editables. Las redes tienen URL vacía: se muestran como «Próximamente» sin enlaces inventados. Escribe la URL oficial completa con `https://` para activar cada enlace. Se abre en nueva pestaña con protección `noopener noreferrer`. No se han inventado usuarios, teléfonos ni direcciones. El nombre de marca también aparece en los componentes de portada y navegación: edítalos si cambias la marca.

## 7. Publicar en GitHub Pages

Antes de publicar, revisa el contenido real frente a las [políticas de GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages#prohibited-uses), las [políticas de uso aceptable de GitHub](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies) y las leyes aplicables a tu jurisdicción y contenido. Este proyecto no certifica cumplimiento legal ni autorización para publicar. Verifica derechos de imagen, exactitud de fichas y que el sitio conserve su finalidad informativa. No añadas venta, reservas ni procesamiento de pedidos de productos regulados.

Tras esa revisión:

1. Crea un repositorio en tu cuenta GitHub y sube el contenido de **esta carpeta** a su raíz, incluidos `package-lock.json` y `.github/workflows/deploy.yml`. No subas `node_modules` ni `dist`.
2. Usa la rama `main` (o modifica el workflow si utilizas otra).
3. En **Settings → Pages → Build and deployment → Source**, selecciona **GitHub Actions**.
4. Haz push a `main`, o ejecuta el workflow manualmente desde **Actions**.
5. Espera que «Publicar en GitHub Pages» termine y abre la URL indicada en el entorno `github-pages`.

`base: './'` en `vite.config.js` genera recursos relativos, compatibles tanto con `https://usuario.github.io/` como con `https://usuario.github.io/repositorio/`. Los archivos públicos usan `import.meta.env.BASE_URL`. La navegación utiliza anclas, sin rutas de servidor ni necesidad de fallback 404. Para dominio propio, configura el dominio y DNS siguiendo la documentación de Pages; no hace falta cambiar el base relativo.

## 8. Actualizar la web

Edita JSON, imágenes o textos; ejecuta `npm test` y `npm run build`; confirma los cambios y haz push a `main`. Actions compila y publica automáticamente. Si falla, consulta el registro antes de volver a ejecutar. No necesitas editar archivos compilados.

## Organización

- `src/components/`: tarjetas y diálogo accesible con cierre mediante Escape, foco y galería.
- `src/pages/`: composición de la página y filtros.
- `src/data/`: información de productos y configuración editorial.
- `src/styles/`: Tailwind y diseño responsive, soporte de movimiento reducido.
- `src/utils/`: búsqueda y rutas, pruebas funcionales.
- `public/images/`: recursos locales originales y futuras fotografías autorizadas.
- `scripts/`: validación de datos.
- `.github/workflows/`: publicación automática.

El menú móvil es accesible, los filtros tienen etiquetas y el diálogo usa el comportamiento nativo de foco del navegador. Comprueba la web con tus fotos y textos definitivos en Safari/iPhone y otros navegadores antes de la publicación. No se incluyen analítica, cookies, fuentes externas ni servicios de pago.
