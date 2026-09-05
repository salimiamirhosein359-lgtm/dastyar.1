/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://212.23.201.113:5000/api',
  },
  images: { domains: ['localhost', '212.23.201.113'] },
};

module.exports = nextConfig;