import { createMDX } from 'fumadocs-mdx/next';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: resolve(appDir, '../..'),
  },
  webpack: (config, { webpack }) => {
    const useReact18ForIsoflow = (resource) => {
      const issuer = resource.contextInfo?.issuer ?? resource.context ?? '';

      return (
        issuer.includes('/node_modules/isoflow/') || issuer.includes('/node_modules/react-dom18/')
      );
    };

    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^react$/, (resource) => {
        if (useReact18ForIsoflow(resource)) {
          resource.request = 'react18';
        }
      }),
      new webpack.NormalModuleReplacementPlugin(/^react-dom$/, (resource) => {
        if (useReact18ForIsoflow(resource)) {
          resource.request = 'react-dom18';
        }
      }),
    );

    return config;
  },
};

const withMDX = createMDX();

export default withMDX(nextConfig);
