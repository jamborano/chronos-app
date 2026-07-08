// src/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // ===== SERVER-SIDE PROTECTION =====
  const path = request.nextUrl.pathname;
  
  // Halaman yang membutuhkan autentikasi
  const protectedPaths = ['/profile', '/report'];
  
  if (protectedPaths.some(p => path.startsWith(p))) {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Jika tidak login, redirect ke home
    if (!user) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    // (Opsional) Cek VIP dari database
    // const { data: profile } = await supabase
    //   .from('profiles')
    //   .select('vip_expiry')
    //   .eq('id', user.id)
    //   .single();
    // const isVip = profile?.vip_expiry ? new Date(profile.vip_expiry) > new Date() : false;
    // if (!isVip) return NextResponse.redirect(new URL('/', request.url));
  }

  await supabase.auth.getSession();

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};