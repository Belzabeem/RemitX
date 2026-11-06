// Ambient module declaration as fallback for CI environments where
// prisma devDependency type declarations may not resolve.
declare module "prisma/config" {
  export function defineConfig(config: Record<string, unknown>): Record<string, unknown>;
}

