import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Inter (латиница + кириллица, включая казахские буквы) — без него next/og рисует «тофу» вместо русского текста. */

export const OG_SIZE = { width: 1200, height: 630 };

export async function ogFonts() {
  const dir = join(process.cwd(), 'assets/fonts');
  const [w700, w800] = await Promise.all([
    readFile(join(dir, 'inter-700.ttf')),
    readFile(join(dir, 'inter-800.ttf')),
  ]);
  return [
    { name: 'Inter', data: w700, weight: 700 as const, style: 'normal' as const },
    { name: 'Inter', data: w800, weight: 800 as const, style: 'normal' as const },
  ];
}

export async function coverDataUrl(path: string): Promise<string | null> {
  if (!path.startsWith('/covers/')) return null;
  try {
    const buf = await readFile(join(process.cwd(), 'public', path));
    return `data:image/jpeg;base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

export function LogoBadge() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 15,
          background: 'linear-gradient(135deg,#9945FF,#7C3AED 55%,#14F195)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 30,
          fontWeight: 800,
        }}
      >
        S
      </div>
      <div style={{ fontSize: 34, fontWeight: 800, color: '#0B1220', display: 'flex' }}>SolWish</div>
    </div>
  );
}
