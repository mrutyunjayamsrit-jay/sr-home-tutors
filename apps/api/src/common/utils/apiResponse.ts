import type { Response } from "express";

/**
 * Every successful API response uses this exact envelope shape, so the
 * frontend never has to special-case per-endpoint response formats.
 *   { success: true, data, meta? }
 * Errors use the mirror shape produced by middleware/errorHandler.ts:
 *   { success: false, error: { code, message, details? } }
 */
export interface ApiMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
}

export function ok<T>(res: Response, data: T, meta?: ApiMeta, statusCode = 200): void {
  res.status(statusCode).json(meta ? { success: true, data, meta } : { success: true, data });
}

export function created<T>(res: Response, data: T, meta?: ApiMeta): void {
  ok(res, data, meta, 201);
}

export function noContent(res: Response): void {
  res.status(204).send();
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export function parsePagination(query: Record<string, unknown>): PaginationParams {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
  return { page, pageSize };
}

export function paginationMeta(params: PaginationParams, total: number): ApiMeta {
  return {
    page: params.page,
    pageSize: params.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}
