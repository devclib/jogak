/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@jogak/core', '@jogak/react', '@jogak/ui'],
  reactStrictMode: true,
  webpack(config) {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js'],
    }
    return config
  },
  turbopack: {
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
  },
}

export default nextConfig
