// src/app/og/route.tsx
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    <div
      style={{
        background: 'linear-gradient(135deg, #0d1117 0%, #1a2332 50%, #0d1117 100%)',
        width: 1200,
        height: 630,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 60,
        position: 'relative',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Decorative circle top-right */}
      <div
        style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(3,102,214,0.15) 0%, transparent 70%)',
        }}
      />

      {/* Decorative circle bottom-left */}
      <div
        style={{
          position: 'absolute',
          bottom: -150,
          left: -150,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(3,102,214,0.1) 0%, transparent 70%)',
        }}
      />

      {/* Main content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
        }}
      >
        {/* Timer icon + CHRONOS */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            marginBottom: 20,
          }}
        >
          {/* Ikon Timer (SVG) */}
          <svg
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0366d6"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" stroke="#0366d6" strokeWidth="2" />
            <polyline points="12 6 12 12 16 14" stroke="#0366d6" strokeWidth="2" />
            <path d="M12 2v2" stroke="#0366d6" strokeWidth="2" />
            <path d="M4 4l2 2" stroke="#0366d6" strokeWidth="2" />
            <path d="M20 4l-2 2" stroke="#0366d6" strokeWidth="2" />
            <path d="M12 22v-2" stroke="#0366d6" strokeWidth="2" />
          </svg>

          <div style={{ fontSize: 80, fontWeight: 800, color: '#e6edf3', letterSpacing: '8px' }}>
            CHRONOS
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            fontWeight: 600,
            color: '#0366d6',
            marginTop: 8,
            letterSpacing: '2px',
          }}
        >
          Fokus & Produktivitas Maksimal
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 20,
            color: '#8b949e',
            marginTop: 12,
            fontWeight: 400,
            letterSpacing: '1px',
          }}
        >
          ⏱️ Pomodoro Timer Premium • Alarm • Statistik • Bebas Iklan
        </div>

        {/* Divider */}
        <div
          style={{
            width: 120,
            height: 2,
            background: '#0366d6',
            marginTop: 20,
            borderRadius: 2,
          }}
        />

        {/* URL / Brand */}
        <div
          style={{
            fontSize: 16,
            color: '#8b949e',
            marginTop: 20,
            fontWeight: 400,
            letterSpacing: '1px',
          }}
        >
          chronos.vercel.app
        </div>
      </div>

      {/* Bottom gradient line */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 4,
          background: 'linear-gradient(90deg, #0366d6, #58a6ff, #0366d6)',
        }}
      />
    </div>,
    {
      width: 1200,
      height: 630,
    }
  );
}