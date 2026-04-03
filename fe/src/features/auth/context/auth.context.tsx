"use client";

import { createContext, useContext, useState } from "react";
import { AuthContextType } from "@/features/auth/types/auth.type";
import { User } from "../types/user.type";

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: {
    children: React.ReactNode
}) => {
  const [user, setUser] = useState<User | null>(null);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext phải được sử dụng trong AuthProvider");
  return ctx;
};