import { serve } from '@hono/node-server';
import { readFileSync } from 'fs';
import { Hono } from 'hono';
import { cache } from 'hono/cache';
import { etag } from 'hono/etag';
import { logger } from 'hono/logger';
import { serveStatic } from '@hono/node-server/serve-static';
import { getConnInfo } from 'hono/cloudflare-workers';
import { RateLimit } from "@rlimit/http";
import { html, raw } from 'hono/html';
import { isMiddleware } from 'hono/utils/handler';
const app = new Hono();
let cachedFile = null;
let indexFile = null;
let countedIpTable = [];
app.use(logger());
app.use('/public/*', etag());
const rlimit = new RateLimit({
    namespace: "example", // your rlimit.com namespace
    maximum: 500,
    interval: "1s",
});
const rateLimitMiddleware = async (c, next) => {
    const identifier = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "anon";
    console.info(identifier);
    const limit = await rlimit.check(identifier);
    console.info(limit, identifier);
    if (!limit.ok) {
        return c.json({ "message": "too many requests" }, 429);
    }
    await next();
};
app.use(rateLimitMiddleware);
const getIp = async (c) => {
    // بررسی هدرهای استاندارد برای دریافت IP
    const forwarded = c.req.header('x-forwarded-for'); // از Hono می‌خوانیم
    const realIp = c.req.header('x-real-ip');
    const cfIp = c.req.header('cf-connecting-ip');
    // در نهایت، دریافت IP از درخواست خام در صورتی که هیچ‌یک موجود نبود
    const rawHeaders = c.req.raw.headers;
    const remoteAddr = rawHeaders.get('remote-addr'); // با استفاده از get()
    const ip = forwarded || realIp || cfIp || remoteAddr || 'Unknown IP';
    return ip;
};
app.use('/public/*', serveStatic({
    root: './sounds',
    rewriteRequestPath: (path) => path.replace(/^\/public/, '')
}));
app.use('/static/*', serveStatic({
    root: './public',
    rewriteRequestPath: (path) => path.replace(/^\/static/, '')
}));
// Middleware برای چک کردن دامنه‌ها
const checkDomainMiddleware = async (c, next) => {
    // const origin = c.req.header('origin')
    // const referer = c.req.header('Referer') || 'No Referer'
    const ip = await getIp(c);
    let indexIP = countedIpTable.findIndex((item) => item.ip === ip);
    if (indexIP === -1) {
        countedIpTable.push({ ip: ip, count: 1, time: new Date(), allCount: 0 });
    }
    else {
        countedIpTable[indexIP].count = countedIpTable[indexIP].count + 1;
        const firstItem = countedIpTable[indexIP];
        const currentTime = new Date();
        const timeDifference = currentTime.getTime() - new Date(firstItem.time).getTime();
        if (timeDifference >= 2 * 60 * 60 * 1000) {
            console.log("Resetting value for:", firstItem);
            firstItem.allCount = firstItem.allCount + firstItem.count;
            firstItem.count = 1;
            firstItem.time = currentTime; // به‌روزرسانی تاریخ به زمان فعلی
        }
        else {
            console.log("Not yet 2 hours. Remaining time:", 2 * 60 * 60 * 1000 - timeDifference, "ms");
        }
    }
    if (indexIP > -1 && countedIpTable[indexIP].count < 300000) {
        await next();
    }
    else {
        return c.json({ ok: false, message: 'Too Many Requests for this ip' }, 426);
    }
};
app.get('/health', cache({
    cacheName: 'hello',
    cacheControl: 'max-age=3600',
}), async (c) => {
    const info = await getConnInfo(c); // info is `ConnInfo`
    console.log(info);
    let ip = await getIp(c);
    return c.json({ 'ok': true, time: new Date().getTime(), ip: ip });
});
app.get('/', cache({
    cacheName: 'index',
    cacheControl: 'max-age=3600',
}), async (c) => {
    const info = getConnInfo(c); // info is `ConnInfo`
    let indexFile;
    if (indexFile) {
    }
    else {
        indexFile = readFileSync('./template/index.html', { encoding: 'utf8' });
    }
    return c.html(indexFile);
});
app.get('/faal', checkDomainMiddleware, cache({
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
    console.log(`IP Table : `, countedIpTable);
    const randomIndex = Math.floor(Math.random() * hafez.length);
    let randomFal = hafez[randomIndex];
    randomFal['src'] = `/public/Hafez-Song${String(randomIndex + 1).padStart(3, '0')}.mp3`;
    return c.json(randomFal);
});
app.get('/falfront', rateLimitMiddleware, (c) => {
    let hafez;
    if (cachedFile) {
        hafez = JSON.parse(cachedFile);
    }
    else {
        cachedFile = readFileSync('./src/data.json', { encoding: 'utf8' });
        hafez = JSON.parse(cachedFile);
    }
    console.log(`IP Table : `, countedIpTable);
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
