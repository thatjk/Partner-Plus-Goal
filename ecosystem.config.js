module.exports = {
  apps: [
    {
      name: 'partnerplus',
      script: 'server.js',
      cwd: __dirname,
      interpreter: 'node',
      env: {
        PORT: 8413,
        NODE_ENV: 'production'
      },
      restart_delay: 3000,
      time: true
    }
  ]
};
