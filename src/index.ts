import { serve } from '@hono/node-server'
import { readFileSync } from 'fs'
import { Hono, type Context, type Next } from 'hono'
import { cache } from 'hono/cache'
import { etag } from 'hono/etag'
import { logger } from 'hono/logger'
import { serveStatic } from '@hono/node-server/serve-static';
import { getConnInfo } from 'hono/cloudflare-workers'
import { RateLimit } from "@rlimit/http";
import { html, raw } from 'hono/html'

const app = new Hono()

app.use(logger());
app.use('/public/*', etag())

const rlimit = new RateLimit({
  namespace: "example", // your rlimit.com namespace
  maximum: 1000,
  interval: "1s",
});

const rateLimitMiddleware = async (c: Context, next: Next) => {
  const identifier =
    c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "anon";

  console.info(identifier);

  const limit = await rlimit.check(identifier);
  console.info(limit, identifier);

  if (!limit.ok) {
    return c.json({ "message": "too many requests" }, 429);
  }

  await next();
};

app.use(rateLimitMiddleware);

// متغیر کش برای نگهداری فایل
let cachedFile: string | null = null;
let indexFile: string | null = null;

app.use(
  '/public/*',
  serveStatic({
    root: './sounds',
    rewriteRequestPath: (path: string) => path.replace(/^\/public/, '')
  })
);

app.get(
  '/health', cache({
    cacheName: 'hello',
    cacheControl: 'max-age=3600',
  }), async (c: Context) => {
    const info = getConnInfo(c) // info is `ConnInfo`

    return c.json({ 'ok': true, time: new Date().getTime(), ip: info.remote.address })
  });

app.get(
  '/', cache({
    cacheName: 'index',
    cacheControl: 'max-age=3600',
  }), async (c: Context) => {
    const info = getConnInfo(c) // info is `ConnInfo`
    let indexFile;
    if (indexFile) {
    } else {
      indexFile = readFileSync('./template/index.html',
        { encoding: 'utf8' });
    }

    return c.html(indexFile);
  });


app.get(
  '/faal',
  cache({
    cacheName: 'faal',
    cacheControl: 'max-age=3600',
  }), async (c: Context) => {
    let hafez;
    if (cachedFile) {
      hafez = JSON.parse(cachedFile);
    } else {
      cachedFile = readFileSync('./src/data.json',
        { encoding: 'utf8' });
      hafez = JSON.parse(cachedFile);
    }

    const randomIndex = Math.floor(Math.random() * hafez.length);
    let randomFal = hafez[randomIndex];

    randomFal['src'] = `/public/Hafez-Song${String(randomIndex + 1).padStart(3, '0')}.mp3`


    return c.json(randomFal)
  }
)


const port = 3000
console.log(`Server is running on http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port
})
