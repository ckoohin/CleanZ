import { PartnerHeader } from "@/components/layouts/site/header/PartnerHeader";
import Footer from "@/components/layouts/site/footer/Footer";
import React from "react";

export default function BecomePartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PartnerHeader />
      {children}
      <Footer />
    </>
  );
}
