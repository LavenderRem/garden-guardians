// Windows 双击入口：在本机启动游戏，复用已运行的实例。
const { spawn } = require('node:child_process');
const { mkdirSync, openSync, closeSync, existsSync } = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const net = require('node:net');
const root = path.resolve(__dirname, '..');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function isGame(url) {
  return new Promise(resolve => {
    const request = http.get(url, { timeout: 1000 }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve(response.statusCode === 200 && body.includes('<title>庭院守卫')));
    });
    request.on('timeout', () => request.destroy());
    request.on('error', () => resolve(false));
  });
}
function portAvailable(port) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen(port, '127.0.0.1', () => server.close(() => resolve(true)));
  });
}
async function main() {
  const vite = path.join(root, 'node_modules/vite/bin/vite.js');
  if (!existsSync(vite)) throw new Error('游戏依赖尚未安装。请在项目目录运行 pnpm install 后重试。');
  let url;
  for (let port = 5173; port <= 5183; port++) {
    const candidate = `http://127.0.0.1:${port}/`;
    if (await isGame(candidate)) { url = candidate; break; }
    if (!(await portAvailable(port))) continue;
    const logDir = path.join(root, 'output/launch');
    mkdirSync(logDir, { recursive: true });
    const log = openSync(path.join(logDir, 'server.log'), 'a');
    const child = spawn(process.execPath, [vite, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
      cwd: root, detached: true, windowsHide: true, stdio: ['ignore', log, log],
    });
    child.unref(); closeSync(log);
    for (let attempt = 0; attempt < 30; attempt++) {
      await wait(300);
      if (await isGame(candidate)) { url = candidate; break; }
    }
    if (!url) throw new Error('启动没有完成，请查看 output/launch/server.log。');
    break;
  }
  if (!url) throw new Error('可用端口已被占用，请关闭旧的试玩服务后重试。');
  console.log(`庭院已经准备好了：${url}`);
  if (!process.argv.includes('--no-open')) {
    const opener = spawn('explorer.exe', [url], { detached: true, windowsHide: true, stdio: 'ignore' });
    opener.on('error', () => console.log('请把上方网址复制到浏览器地址栏。'));
    opener.unref();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
