/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.101.147'],
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'xosbxuxaopzbcuxbqgmq.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

module.exports = nextConfig