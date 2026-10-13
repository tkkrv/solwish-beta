import 'server-only';
import { NextResponse } from 'next/server';
import { DatabaseNotConfiguredError } from './supabase';

export type ApiErrorCode =
  | 'invalid_input'
  | 'not_found'
  | 'rate_limited'
  | 'db_not_configured'
  | 'server_error'
  | 'memo_too_long'
  | 'invalid_amount'
  | 'invalid_account';

export function apiError(
  code: ApiErrorCode,
  status: number,
  extra?: Record<string, unknown>,
  headers?: HeadersInit
) {
  return NextResponse.json({ error: code, ...extra }, { status, headers });
}

/** Логирует подробности на сервере, клиенту отдаёт только код (без внутренних сообщений БД). */
export function handleServerError(err: unknown, where: string, headers?: HeadersInit) {
  if (err instanceof DatabaseNotConfiguredError) {
    return apiError('db_not_configured', 503, undefined, headers);
  }
  console.error(`[${where}]`, err);
  return apiError('server_error', 500, undefined, headers);
}
