import { createContext, useContext } from "react";
import { asset } from "../utils/catalogo";
export const ImageContext = createContext({});
export function useImage() {
  const images = useContext(ImageContext);
  return (path) =>
    path?.startsWith("media/")
      ? images[path] || asset("images/placeholder.svg")
      : asset(path || "images/placeholder.svg");
}
