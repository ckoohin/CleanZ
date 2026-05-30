"use client";

import { StaffAuthPage } from "@/features/staffs/_components/StaffAuthPage";
import { useEffect } from "react";

export default function RegisterStaffPage() {
  return <StaffAuthPage forceTab="register" />;
}
