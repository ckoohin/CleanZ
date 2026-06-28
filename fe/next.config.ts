import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["cleanz.online"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "img.vietqr.io",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "cdn.example.com",
      }
    ],
  },
};

export default nextConfig;
