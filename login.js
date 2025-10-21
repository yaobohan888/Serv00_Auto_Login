// 引入 Node.js 内置的文件系统模块，用于读取 accounts.json 文件。
const fs = require('fs');
// 引入 Puppeteer 库，用于控制 Chromium 浏览器，实现自动化操作。
const puppeteer = require('puppeteer');

/**
 * 将 Date 对象格式化为 YYYY-MM-DD HH:MM:SS 格式的字符串。
 * @param {Date} date - 要格式化的日期对象。
 * @returns {string} 格式化后的日期时间字符串。
 */
function formatToISO(date) {
    // 调用 toISOString() 获取标准 ISO 格式，然后进行替换清理，移除 'T'、'Z' 和毫秒部分。
    return date.toISOString().replace('T', ' ').replace('Z', '').replace(/\.\d{3}Z/, '');
}

/**
 * 异步延时函数，用于暂停脚本执行一段时间。
 * @param {number} ms - 延时的毫秒数。
 * @returns {Promise<void>}
 */
async function delayTime(ms) {
    // 返回一个 Promise，在 setTimeout 指定的时间后 resolve。
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 立即执行的异步函数表达式 (IIFE)，作为脚本的主入口点。
(async () => {
    try {
        // 读取 accounts.json 中的 JSON 字符串。使用同步方法读取，确保文件内容已获取。
        const accountsJson = fs.readFileSync('accounts.json', 'utf-8');
        // 将 JSON 字符串解析成 JavaScript 数组或对象。
        const accounts = JSON.parse(accountsJson);

        // 遍历 accounts 数组中的每一个账号对象。
        for (const account of accounts) {
            // 使用解构赋值提取当前账号的用户名、密码和面板编号。
            const { username, password, panelnum } = account;

            // 启动一个新的 Chromium 浏览器实例。
            const browser = await puppeteer.launch({
                // ✨【重大修改点 1】: 将 headless 改为 true，在无头环境 (如 xvfb-run) 下更稳定和高效。
                headless: true, 
                // args: 传入给 Chromium 进程的命令行参数。
                args: [
                    '--no-sandbox', // 禁用沙盒模式 (常见于 CI/Docker 环境)
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage', // 优化内存使用
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process' // 强制使用单进程模式
                ]
            });
            // 在浏览器中创建一个新的页面 (Tab) 实例。
            const page = await browser.newPage();

            // 根据 panelnum 构造 Serv00 面板的登录 URL。
            let url = `https://panel${panelnum}.serv00.com/login/?next=/`;

            try {
                // 导航到构造的登录页面 URL。
                await page.goto(url);

                // ✨【重大修改点 2】: 使用 page.waitForSelector 强制等待元素加载，解决“找不到元素”的问题。
                
                // 1. 等待用户名输入框加载完成，最长等待 10 秒
                await page.waitForSelector('#id_username', { timeout: 10000 });
                
                // 清空用户名输入框的原有值：点击三次选中内容，然后按退格键清除
                // 现在的 page.click 和 page.keyboard.press 可以直接在等待元素后使用。
                await page.click('#id_username', { clickCount: 3 }); 
                await page.keyboard.press('Backspace');

                // 2. 输入实际的账号和密码
                await page.type('#id_username', username);
                await page.type('#id_password', password);

                // 3. 等待并点击登录按钮
                const loginButtonSelector = '#submit';
                // ✨【重大修改点 3】: 强制等待登录按钮加载完成，最长等待 10 秒。
                await page.waitForSelector(loginButtonSelector, { timeout: 10000 });
                
                // 提交登录表单
                await page.click(loginButtonSelector);
                
                // 4. 等待页面跳转完成。
                await page.waitForNavigation();

                // === 登录判断保持不变 ===
                
                // 在浏览器环境中执行代码，判断是否登录成功。
                const isLoggedIn = await page.evaluate(() => {
                    // 尝试查找指向 "/logout/" 的链接（即登出按钮）。
                    const logoutButton = document.querySelector('a[href="/logout/"]');
                    // 如果找到了登出按钮，则认为登录成功。
                    return logoutButton !== null;
                });

                // 根据登录结果输出信息。
                if (isLoggedIn) {
                    // 获取当前的 UTC 时间并格式化。
                    const nowUtc = formatToISO(new Date());// UTC时间
                    // 通过时间戳计算获取当前的北京时间（东八区：当前时间 + 8小时）。
                    const nowBeijing = formatToISO(new Date(new Date().getTime() + 8 * 60 * 60 * 1000)); 
                    // 输出登录成功的日志。
                    console.log(`账号 ${username} 于北京时间 ${nowBeijing}（UTC时间 ${nowUtc}）登录成功！`);
                } else {
                    // 输出登录失败的错误日志。
                    console.error(`账号 ${username} 登录失败，请检查账号和密码是否正确。`);
                }
            } catch (error) {
                // ✨【重大修改点 4】: 更改错误日志输出，使用 error.message 以便在出现超时等错误时输出更清晰的信息。
                console.error(`账号 ${username} 登录时出现错误: ${error.message}`);
            } finally {
                // 无论 try 块是否成功，此块代码都会执行。
                // 关闭当前页面。
                await page.close();
                // 关闭浏览器实例。
                await browser.close();

                // 生成一个 1000ms (1秒) 到 8999ms (约9秒) 之间的随机延时。
                const delay = Math.floor(Math.random() * 8000) + 1000; 
                // 执行延时，暂停进入下一个账号的循环。
                await delayTime(delay);
            }
        }

        // 所有账号处理完成后，输出完成消息。
        console.log('所有账号登录完成！');

    } catch (e) {
        // 处理读取或解析 accounts.json 文件时发生的错误。
        console.error(`脚本启动错误，请检查 accounts.json 文件：${e.message}`);
    }
})();

// 注意：这个 delayTime 函数在前面已经定义过，属于冗余定义，但不会影响程序运行。
// function delayTime(ms) {
//     return new Promise(resolve => setTimeout(resolve, ms));
// }
