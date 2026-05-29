"use client";

import { StaffAuthPage } from "@/features/staff/_components/StaffAuthPage";
import { useEffect } from "react";

export default function RegisterStaffPage() {
  return <StaffAuthPage forceTab="register" />;
}
