// Ambient module declarations as fallbacks for CI environments where
// package type declarations may not resolve. When packages are installed
// with their own types, TypeScript uses those instead of these fallbacks.
declare module "prisma/config" {
  export function defineConfig(config: Record<string, unknown>): Record<string, unknown>;
}

declare module "@prisma/adapter-pg" {
  export class PrismaPg {
    constructor(options: Record<string, unknown>);
  }
}

declare module "@/generated/prisma/client" {
  export class PrismaClient {
    constructor(options?: Record<string, unknown>);
    [key: string]: unknown;
  }
}

declare module "@supabase/supabase-js" {
  export function createClient<_T = unknown>(
    url: string,
    key: string,
    options?: Record<string, unknown>
  ): SupabaseClient<_T>;

  export class SupabaseClient<_T = unknown> {
    from(table: string): unknown;
    auth: unknown;
    [key: string]: unknown;
  }
}
