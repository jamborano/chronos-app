import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    // Baca cookie dari header request
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map(c => {
        const [key, ...val] = c.split('=');
        return [key, val.join('=')];
      })
    );

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookies[name] || '';
          },
          set(name: string, value: string, options: any) {
            // Kita tidak bisa set cookie di server tanpa cookieStore,
            // tapi kita bisa menggunakan NextResponse untuk set cookie di redirect
            // Kita simpan di global atau gunakan response
          },
          remove(name: string, options: any) {
            // Tidak perlu remove di sini
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('Auth error:', error);
      return NextResponse.redirect(`${origin}/?auth_error=true`);
    }
  }

  // Redirect ke home
  return NextResponse.redirect(new URL('/', request.url));
}