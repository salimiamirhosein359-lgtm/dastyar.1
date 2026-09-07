const PROXY_HOST = process.env.PROXY_HOST || 'free-los-angeles-https-1.cloudburstcdn.com';
const PROXY_PORT = parseInt(process.env.PROXY_PORT || '443', 10);
const PROXY_AUTH = 'Basic ' + Buffer.from(`${process.env.PROXY_USER}:${process.env.PROXY_PASS}`).toString('base64');

module.exports = { PROXY_HOST, PROXY_PORT, PROXY_AUTH };
