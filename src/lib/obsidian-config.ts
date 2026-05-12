export type ResolveVaultPathOptions = {
  flag?: string
}

export function resolveVaultPath(opts: ResolveVaultPathOptions): string {
  if (opts.flag) return opts.flag
  const env = process.env.OBSIDIAN_VAULT
  if (env) return env
  throw new Error("vault not found: set --vault or OBSIDIAN_VAULT")
}
