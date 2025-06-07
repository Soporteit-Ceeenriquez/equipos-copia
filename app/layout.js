import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Gestión de Equipos CEE",
  description: "Sistema para la gestión y asignación de equipos en CEE.",
  keywords: ["gestión de equipos", "CEE", "logística", "asignación", "taller"],
  openGraph: {
    title: "Gestión de Equipos CEE",
    description: "Sistema para la gestión y asignación de equipos en CEE.",
    locale: "es_ES",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans bg-white text-gray-900 dark:bg-gray-900 dark:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
