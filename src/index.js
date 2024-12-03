import { serve } from '@hono/node-server';
import { readFileSync } from 'fs';
import { Hono } from 'hono';
import { cache } from 'hono/cache';
import { etag } from 'hono/etag';
import { logger } from 'hono/logger';
import { serveStatic } from '@hono/node-server/serve-static';
const app = new Hono();
app.use(logger());
app.use('/public/*', etag());
// متغیر کش برای نگهداری فایل
let cachedFile = null;
app.use('/public/*', serveStatic({
    root: './sounds',
    rewriteRequestPath: (path) => path.replace(/^\/public/, '')
}));
app.get('/faal', cache({
    cacheName: 'faal',
    cacheControl: 'max-age=3600',
}), async (c) => {
    let hafez;
    if (cachedFile) {
        hafez = JSON.parse(cachedFile);
    }
    else {
        cachedFile = readFileSync('./src/data.json', { encoding: 'utf8' });
        hafez = JSON.parse(cachedFile);
    }
    const randomIndex = Math.floor(Math.random() * hafez.length);
    let randomFal = hafez[randomIndex];
    randomFal['src'] = `/public/Hafez-Song${String(randomIndex + 1).padStart(3, '0')}.mp3`;
    return c.json(randomFal);
});
const port = 3000;
console.log(`Server is running on http://localhost:${port}`);
serve({
    fetch: app.fetch,
    port
});
