import { ACTION_HEADERS, handleActionGet, handleActionPost } from '@/lib/server/actions';

export async function OPTIONS() {
  return new Response(null, { headers: ACTION_HEADERS });
}

export async function GET(req: Request, ctx: RouteContext<'/api/actions/gift/[id]'>) {
  const { id } = await ctx.params;
  return handleActionGet(req, id);
}

export async function POST(req: Request, ctx: RouteContext<'/api/actions/gift/[id]'>) {
  const { id } = await ctx.params;
  return handleActionPost(req, id);
}
