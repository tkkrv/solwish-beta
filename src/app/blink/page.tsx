import { redirect } from 'next/navigation';

/** Ссылки первой версии (/blink?id=wish_xxx) ведут на новую страницу вишлиста. */
export default async function LegacyBlinkPage({ searchParams }: PageProps<'/blink'>) {
  const { id } = await searchParams;
  const wishId = Array.isArray(id) ? id[0] : id;
  redirect(wishId ? `/w/${encodeURIComponent(wishId)}` : '/');
}
