// Type declarations for CSS module imports
declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}

// Type declarations for maplibre-gl CSS
declare module "maplibre-gl/dist/maplibre-gl.css" {
  const content: string;
  export default content;
}
