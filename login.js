const puppeteer = require('puppeteer');

(async () => {
    try {
        // 启动浏览器，增加无沙箱参数，适合 CI/CD 或 Linux 环境
        const browser = await puppeteer.launch({
            headless: true, // 无头模式
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        });

        const page = await browser.newPage();

        // 打开登录页面
        await page.goto('https://panel6.serv00.com/', { waitUntil: 'networkidle2' });

        // 填写登录信息
        await page.type('#username', '你的用户名');  // 替换为你的用户名
        await page.type('#password', '你的密码');   // 替换为你的密码

        // 点击登录按钮
        await page.click('#loginButton');

        // 等待页面跳转完成
        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        console.log('登录成功');

        // 这里可以执行后续操作，例如抓取数据
        // const data = await page.evaluate(() => {
        //     return document.querySelector('body').innerText;
        // });
        // console.log(data);

        await browser.close();
    } catch (err) {
        console.error('登录失败:', err);
    }
})();
