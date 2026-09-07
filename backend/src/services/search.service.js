const https = require('https');
const tls = require('tls');
const logger = require('../config/logger');
const { PROXY_HOST, PROXY_PORT, PROXY_AUTH } = require('../config/proxy');

const SERPER_API_KEY = process.env.SERPER_API_KEY || '';

function proxyRequest(hostname, path, method = 'GET', body = null) {
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
          let reqHeaders = `${method} ${path} HTTP/1.1\r\nHost: ${hostname}\r\nConnection: close\r\nUser-Agent: Mozilla/5.0\r\nAccept: application/json\r\nAccept-Encoding: identity\r\n`;
          if (body) {
            reqHeaders += `Content-Type: application/json\r\nContent-Length: ${Buffer.byteLength(body)}\r\n`;
          }
          reqHeaders += '\r\n';
          if (body) reqHeaders += body;
          tlsSocket.write(reqHeaders);
        });
        let buf = '';
        tlsSocket.on('data', (c) => { buf += c.toString(); });
        tlsSocket.on('end', () => {
          const idx = buf.indexOf('\r\n\r\n');
          let respBody = idx >= 0 ? buf.substring(idx + 4) : buf;
          try {
            let decoded = '';
            let pos = 0;
            while (pos < respBody.length) {
              const chunkSizeMatch = respBody.substring(pos).match(/^([0-9a-fA-F]+)\r\n/);
              if (!chunkSizeMatch) break;
              const chunkSize = parseInt(chunkSizeMatch[1], 16);
              if (chunkSize === 0) break;
              pos += chunkSizeMatch[0].length;
              decoded += respBody.substring(pos, pos + chunkSize);
              pos += chunkSize + 2;
            }
            if (decoded) respBody = decoded;
          } catch {}
          try { resolve(JSON.parse(respBody)); } catch { resolve(respBody); }
        });
        tlsSocket.on('error', reject);
      } else if (headerBuf.includes('\r\n\r\n')) {
        proxySocket.removeListener('data', onProxyData);
        reject(new Error('Proxy failed'));
      }
    };
    proxySocket.on('data', onProxyData);
    proxySocket.on('error', (e) => reject(new Error('Proxy error: ' + e.message)));
    proxySocket.on('timeout', () => { proxySocket.destroy(); reject(new Error('timeout')); });
  });
}

async function searchSerper(query, numResults = 5) {
  if (!SERPER_API_KEY) return null;
  try {
    const body = JSON.stringify({ q: query, num: numResults, hl: 'fa', gl: 'ir' });
    const data = await proxyRequest('google.serper.dev', '/search', 'POST', body);
    if (!data || !data.organic) return null;
    return data.organic.slice(0, numResults).map(r => ({
      title: r.title || '',
      snippet: r.snippet || '',
      url: r.link || '',
      source: 'Google'
    }));
  } catch (error) {
    logger.error('Serper search failed:', error.message);
    return null;
  }
}

async function searchDuckDuckGo(query, numResults = 5) {
  try {
    const encoded = encodeURIComponent(query);
    const data = await proxyRequest('api.duckduckgo.com', `/?q=${encoded}&format=json&no_html=1&skip_disambig=1`);
    if (typeof data !== 'object' || !data) return [];
    const results = [];
    if (data.AbstractText) {
      results.push({ title: data.Heading || query, snippet: data.AbstractText.substring(0, 300), url: data.AbstractURL || '', source: 'DuckDuckGo' });
    }
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics.slice(0, numResults)) {
        if (topic.Text && topic.FirstURL) {
          results.push({ title: topic.Text.substring(0, 100), snippet: topic.Text.substring(0, 300), url: topic.FirstURL, source: 'DuckDuckGo' });
        }
        if (topic.Topics) {
          for (const sub of topic.Topics.slice(0, 2)) {
            if (sub.Text && sub.FirstURL) {
              results.push({ title: sub.Text.substring(0, 100), snippet: sub.Text.substring(0, 300), url: sub.FirstURL, source: 'DuckDuckGo' });
            }
          }
        }
      }
    }
    if (results.length === 0 && data.Answer) {
      results.push({ title: data.Heading || 'پاسخ', snippet: data.Answer, url: data.AbstractURL || '', source: 'DuckDuckGo' });
    }
    return results.slice(0, numResults);
  } catch (error) {
    logger.error('DuckDuckGo search failed:', error.message);
    return [];
  }
}

function deduplicateResults(results) {
  const seen = new Set();
  return results.filter(r => {
    const key = r.url || r.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function searchWeb(query, numResults = 5) {
  let results = [];

  const serperResults = await searchSerper(query, numResults);
  if (serperResults && serperResults.length > 0) {
    results = serperResults;
    logger.info(`[searchWeb] Serper: ${results.length} results`);
  } else {
    results = await searchDuckDuckGo(query, numResults);
    logger.info(`[searchWeb] DuckDuckGo fallback: ${results.length} results`);
  }

  return deduplicateResults(results).slice(0, numResults);
}

module.exports = { searchWeb };
