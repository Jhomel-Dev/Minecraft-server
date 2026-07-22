import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async () => {
  // Lee la cookie de idioma, si no existe usa 'en' (Inglés) por defecto.
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'es';

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
