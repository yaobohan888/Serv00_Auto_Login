const fs = require('fs');
const puppeteer = require('puppeteer');

/**
 * 将 Date 对象格式化为 'YYYY-MM-DD HH:MM:SS' 格式的字符串
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的日期字符串
 */
function formatToDateTime(date) {
    return date.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
}

/**
 * 暂停指定毫秒数
 * @param {number} ms - 暂停的毫秒数
 * @returns {Promise<void>}
 */
function delayTime(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 单个账户的登录流程
 * @param {object} browser - Puppeteer 浏览器实例
 * @param {object} account - 包含用户名、密码和面板编号的账户对象
 */
async function loginAccount(browser, account) {
    const { username, password, panelnum } = account;
    const page = await browser.newPage();
    const url = `https://panel${panelnum}.serv00.com/login/?next=/`;

    try {
        console.log(`[${username}] - 正在尝试登录...`);
        await page.goto(url, { waitUntil: 'networkidle2' });

        // 输入账号和密码
        await page.type('#id_username', username);
        await page.type('#id_password', password);

        // 模拟按回车键提交表单，而不是点击按钮
        await page.keyboard.press('Enter');

        // 等待登出链接出现，作为登录成功的标志，超时时间设置为15秒
        await page.waitForSelector('a[href="/logout/"]', { timeout: 15000 });

        // 获取当前的UTC时间和北京时间
        const nowUtc = formatToDateTime(new Date()); // UTC时间
        const nowBeijing = formatToDateTime(new Date(Date.now() + 8 * 60 * 60 * 1000)); // 北京时间 (UTC+8)

        console.log(`✅ [${username}] - 登录成功！`);
        console.log(`   - 北京时间: ${nowBeijing}`);
        console.log(`   - UTC 时间: ${nowUtc}`);

    } catch (error) {
        console.error(`❌ [${username}] - 登录失败或超时。错误信息: ${error.message.split('\n')[0]}`);
    } finally {
        await page.close(); // 完成后关闭页面
    }
}

/**
 * 主执行函数
 */
async function main() {
    let browser;
    try {
        // 读取并解析 accounts.json 文件
        // 优先从环境变量读取，如果不存在则从文件读取
        const accountsJson = process.env.ACCOUNTS_JSON || fs.readFileSync('accounts.json', 'utf-8');
        const accounts = JSON.parse(accountsJson);

        console.log('启动浏览器...');
        // 启动一个浏览器实例用于所有操作
        // 在 CI/CD 环境中，必须添加 --no-sandbox 参数并使用无头模式
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        for (const account of accounts) {
            await loginAccount(browser, account);

            // 在处理下一个用户前，增加一个随机延时
            const delay = Math.floor(Math.random() * 8000) + 1000; // 随机延时1到8秒
            console.log(`--- 等待 ${delay / 1000} 秒后继续... ---\n`);
            await delayTime(delay);
        }

    } catch (error) {
        console.error(`脚本执行时发生严重错误: ${error}`);
    } finally {
        if (browser) {
            await browser.close(); // 所有账户处理完毕后关闭浏览器
        }
        console.log('所有账号处理完成，浏览器已关闭。');
    }
}

// 运行主函数
main();

