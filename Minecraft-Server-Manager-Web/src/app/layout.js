import { ThemeProvider } from "@/shared/theme/ThemeProvider";
import { GoogleAuthProvider } from "@/shared/providers/GoogleAuthProvider";
import "./globals.css";

export const metadata = {
  title: "Minecraft Server Manager",
  description: "Advanced, modern and blocky Minecraft server manager panel",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <GoogleAuthProvider>
            {children}
          </GoogleAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
