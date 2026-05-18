import type { Metadata } from "next";
import Providers from "./providers";
import "./styles.css";

export const metadata: Metadata = {
  title: "Task Manager",
  description: "Admin task assignment and member completion app",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
