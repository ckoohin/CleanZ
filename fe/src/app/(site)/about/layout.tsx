import { Header } from "@/components/layouts/site/header/Header";
import Footer from "@/components/layouts/site/footer/Footer";
import React from "react";

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
