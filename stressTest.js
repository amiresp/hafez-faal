import axios from 'axios';
// const targetUrl = 'http://localhost:3000/faal';
const targetUrl = 'https://faal.liara.run/faal';
// const targetUrl = 'http://localhost:3000/public/Hafez-Song271.mp3';
const numRequests = 1000;
const concurrency = 500;
let successCount = 0;
let failureCount = 0;
let totalResponseTime = 0;
async function sendRequest(requestNumber) {
    const startTime = Date.now(); // زمان شروع درخواست
    try {
        const response = await axios.get(`${targetUrl}?t=${new Date().getTime() * Math.random()}`);
        const duration = Date.now() - startTime; // زمان پاسخگویی درخواست
        totalResponseTime += duration; // جمع‌آوری زمان‌ها برای محاسبه میانگین
        successCount++; // شمارش درخواست‌های موفق
        console.log(`Request ${requestNumber} - Status: ${response.status} - Time: ${duration}ms`);
    }
    catch (error) {
        const duration = Date.now() - startTime; // زمان پاسخگویی درخواست ناموفق
        totalResponseTime += duration; // حتی زمان درخواست‌های ناموفق را جمع می‌کنیم
        failureCount++; // شمارش درخواست‌های ناموفق
        console.error(`Request ${requestNumber} - Error: ${error.message} - Time: ${duration}ms`);
    }
}
// تابع تست استرس برای مدیریت درخواست‌های همزمان
async function stressTest() {
    const requests = [];
    // ارسال درخواست‌ها به صورت دسته‌ای و همزمان
    for (let i = 0; i < numRequests; i++) {
        if (i % concurrency === 0 && i > 0) {
            // صبر کردن برای اتمام دسته فعلی از درخواست‌ها قبل از ارسال دسته بعدی
            await Promise.all(requests);
            requests.length = 0; // خالی کردن آرایه درخواست‌ها
        }
        requests.push(sendRequest(i));
    }
    // منتظر ماندن برای اتمام هر درخواست باقی‌مانده
    await Promise.all(requests);
    // محاسبه و نمایش نتایج نهایی
    const successRate = (successCount / numRequests) * 100; // درصد درخواست‌های موفق
    const failureRate = (failureCount / numRequests) * 100; // درصد درخواست‌های ناموفق
    const averageResponseTime = totalResponseTime / numRequests; // میانگین زمان پاسخگویی
    console.log('Stress test complete.');
    console.log(`Total requests: ${numRequests}`);
    console.log(`Successful requests: ${successCount} (${successRate.toFixed(2)}%)`);
    console.log(`Failed requests: ${failureCount} (${failureRate.toFixed(2)}%)`);
    console.log(`Average response time: ${averageResponseTime.toFixed(2)}ms`);
}
stressTest().catch((err) => console.error('Stress test failed:', err));
