import { z } from 'zod';
import { insertVideoSchema, insertLogSchema, videos, logs } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  videos: {
    list: {
      method: 'GET' as const,
      path: '/api/videos',
      responses: {
        200: z.array(z.custom<typeof videos.$inferSelect>()),
      },
    },
    daily: {
      method: 'POST' as const,
      path: '/api/video/daily',
      responses: {
        200: z.object({ success: z.boolean(), message: z.string() }),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/videos/:id',
      responses: {
        200: z.custom<typeof videos.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/videos',
      input: z.object({
        forcePrompt: z.string().optional(),
      }),
      responses: {
        201: z.custom<typeof videos.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  logs: {
    list: {
      method: 'GET' as const,
      path: '/api/logs',
      responses: {
        200: z.array(z.custom<typeof logs.$inferSelect>()),
      },
    },
  },
  stats: {
    get: {
      method: 'GET' as const,
      path: '/api/stats',
      responses: {
        200: z.object({
          totalVideos: z.number(),
          publishedVideos: z.number(),
          failedVideos: z.number(),
          pendingVideos: z.number(),
          lastRun: z.string().nullable(),
        }),
      },
    },
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
