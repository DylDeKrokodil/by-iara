module.exports = {
  '/api': {
    target: process.env.WEBSITE_API_PROXY_TARGET || 'http://localhost:8080',
    secure: false,
    changeOrigin: true,
  },
};
