import type { Metadata } from "next";
import { canela, outfit } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Siddhant Yadav — Product Designer",
  description:
    "I design tools for people who work with their hands, not a mouse.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${canela.variable} ${outfit.variable}`}>
      <body>{children}</body>
    </html>
  );
}
