// app/default.tsx
import React from 'react';

/**
 * Fallback component for parallel routes.
 * Standard implementation just renders null or child paths if matched.
 */
export default function Default({ children }: { children: React.ReactNode }) {
  return children;
}
