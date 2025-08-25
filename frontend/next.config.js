/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  async rewrites() {
    const backend = process.env.BACKEND_ORIGIN || 'http://localhost:8000'
    return [
      {
        source: '/uploads/:path*',
        destination: `${backend}/uploads/:path*`,
      },
    ]
  },
}
