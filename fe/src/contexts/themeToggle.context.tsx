"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeToggleContext = createContext<ThemeContextType | null>(null);

export const ThemeToggleProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>("light");

  // load từ localStorage
  useEffect(() => {
    const saved = localStorage.getItem("theme") as Theme | null;
    if (saved) {
      setTheme(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // apply vào DOM + save
  useEffect(() => {
    const root = document.documentElement;

    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "light" ? "dark" : "light"));
  };

  return (
    <ThemeToggleContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeToggleContext.Provider>
  );
};

export const useThemeToggleContext = () => {
  const context = useContext(ThemeToggleContext);
  if (!context) throw new Error("Phải dùng trong Provider");
  return context;
};
