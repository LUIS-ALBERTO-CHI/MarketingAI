/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Librerías con binarios nativos / que no deben empaquetarse por webpack.
  // (render de PDF a imagen mediante @napi-rs/canvas).
  serverExternalPackages: ["pdf-to-img", "@napi-rs/canvas"],
};

export default nextConfig;
