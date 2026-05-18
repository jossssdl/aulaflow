import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AulaFlow",
  description: "Sistema SaaS premium de asignación automática de aulas escolares desarrollado por EINNOVACION MX.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
