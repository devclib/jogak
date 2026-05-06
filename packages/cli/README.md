# @jogak/cli

`jogak dev` / `jogak build` / `jogak generate` — CLI for the [Jogak](https://github.com/devclib/jogak) component showcase.

## Install

```bash
pnpm add -D @jogak/cli @jogak/react
```

## Usage

```bash
# author *.jogak.tsx next to your components, then:

npx jogak dev          # dev server (default port 5173)
npx jogak build        # static build → ./jogak-static/
npx jogak generate     # codegen .jogak/registry.ts for host-bundler embedding
```

### Common options

```
--patterns <glob[,glob...]>   *.jogak.tsx globs (default: src/**/*.jogak.{ts,tsx})
--cwd <path>                  user project root
--ts-config <path>            tsconfig path (default: <cwd>/tsconfig.json)
--code-theme <name>           prism theme (default: vsDark)
```

### `jogak dev` options

```
--port <number>               default 5173
--host <string>               'true'/'false'/host string
--open [path]                 open browser on start
--no-generate                 skip .jogak/registry.ts safety-net codegen
```

### `jogak build` options

```
--out-dir <path>              default 'jogak-static'
--base <string>               public path (default './')
--minify <boolean|esbuild|terser>  default 'esbuild'
--sourcemap                   default false
--emit-registry               also emit .jogak/registry.ts during build
```

The build output (`jogak-static/`) is `index.html` + a single JS chunk and works on GitHub Pages, Vercel, Netlify, S3, etc.

See the [main README](https://github.com/devclib/jogak#readme) for `*.jogak.tsx` conventions and Storybook benchmarks.

- Repository: https://github.com/devclib/jogak
- Issues: https://github.com/devclib/jogak/issues
- License: [MIT](./LICENSE)
