import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import { ThemeProvider } from "@/shared/theme/ThemeProvider";
import { GoogleAuthProvider } from "@/shared/providers/GoogleAuthProvider";
import { ToastProvider } from "@/shared/ui/ToastProvider";
import "./globals.css";

export const metadata = {
  title: "Minecraft Server Manager",
  description: "Advanced, modern and blocky Minecraft server manager panel",
};

export default async function RootLayout({ children }) {
  const messages = await getMessages();
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="antialiased min-h-screen">
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <GoogleAuthProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </GoogleAuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
