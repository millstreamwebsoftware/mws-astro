/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="unplugin-icons/types/astro" />

interface ImportMetaEnv {
  readonly ENV_BOOKSHOP_LIVE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
