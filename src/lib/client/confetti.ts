export async function celebrate() {
  try {
    const confetti = (await import('canvas-confetti')).default;
    const colors = ['#7C3AED', '#9945FF', '#14F195', '#F59E0B', '#EC4899'];
    confetti({ particleCount: 110, spread: 75, origin: { y: 0.65 }, colors, disableForReducedMotion: true });
    setTimeout(
      () => confetti({ particleCount: 60, spread: 110, origin: { y: 0.6 }, colors, disableForReducedMotion: true }),
      250
    );
  } catch {
    // конфетти — необязательное украшение
  }
}
