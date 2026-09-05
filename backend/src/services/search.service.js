const https = require('https');
const http = require('http');
const { URL } = require('url');
const logger = require('../config/logger');

const PROXY_HOST = 'free-los-angeles-https-1.cloudburstcdn.com';
const PROXY_PORT = 443;
const PROXY_AUTH = 'Basic ' + Buffer.from('a2epfq5ugq0u:ptkx3fqg6v7n').toString('base64');
const tls = require('tls');

function proxyRequest(hostname, path) {
  return new Promise((resolve, reject) => {
    const proxySocket = tls.connect(PROXY_PORT, PROXY_HOST, { servername: PROXY_HOST, timeout: 15000 }, () => {
      proxySocket.write([
        `CONNECT ${hostname}:443 HTTP/1.1`,
        `Host: ${hostname}:443`,
        `Proxy-Authorization: ${PROXY_AUTH}`,
        `Proxy-Connection: keep-alive`, ``, ``,
      ].join('\r\n'));
    });
    let headerBuf = '';
    const onProxyData = (chunk) => {
      headerBuf += chunk.toString();
      if (headerBuf.includes('\r\n\r\n') && headerBuf.includes('200')) {
        proxySocket.removeListener('data', onProxyData);
        const tlsSocket = tls.connect({ socket: proxySocket, servername: hostname, timeout: 15000 }, () => {
          tlsSocket.write(`GET ${path} HTTP/1.1\r\nHost: ${hostname}\r\nConnection: close\r\nUser-Agent: Mozilla/5.0\r\nAccept: application/json\r\n\r\n`);
        });
        let buf = '';
        tlsSocket.on('data', (c) => { buf += c.toString(); });
        tlsSocket.on('end', () => {
          const idx = buf.indexOf('\r\n\r\n');
          const body = idx >= 0 ? buf.substring(idx + 4) : buf;
          try { resolve(JSON.parse(body)); } catch { resolve(body); }
        });
        tlsSocket.on('error', reject);
      } else if (headerBuf.includes('\r\n\r\n')) {
        proxySocket.removeListener('data', onProxyData);
        reject(new Error('Proxy failed'));
      }
    };
    proxySocket.on('data', onProxyData);
    proxySocket.on('error', reject);
    proxySocket.on('timeout', () => { proxySocket.destroy(); reject(new Error('timeout')); });
  });
}

async function searchWeb(query, numResults = 5) {
  try {
    const encoded = encodeURIComponent(query);
    const data = await proxyRequest(
      'api.duckduckgo.com',
      `/?q=${encoded}&format=json&no_html=1&skip_disambig=1`
    );

    const results = [];

    if (data.AbstractText) {
      results.push({
        title: data.Heading || query,
        snippet: data.AbstractText.substring(0, 300),
        url: data.AbstractURL || '',
        source: 'DuckDuckGo'
      });
    }

    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics.slice(0, numResults)) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.substring(0, 100),
            snippet: topic.Text.substring(0, 300),
            url: topic.FirstURL,
            source: 'DuckDuckGo'
          });
        }
        if (topic.Topics) {
          for (const sub of topic.Topics.slice(0, 2)) {
            if (sub.Text && sub.FirstURL) {
              results.push({
                title: sub.Text.substring(0, 100),
                snippet: sub.Text.substring(0, 300),
                url: sub.FirstURL,
                source: 'DuckDuckGo'
              });
            }
          }
        }
      }
    }

    if (results.length === 0 && data.Answer) {
      results.push({
        title: data.Heading || 'پاسخ',
        snippet: data.Answer,
        url: data.AbstractURL || '',
        source: 'DuckDuckGo'
      });
    }

    return results.slice(0, numResults);
  } catch (error) {
    logger.error('Web search error:', error.message);
    return [];
  }
}

module.exports = { searchWeb };
