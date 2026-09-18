/**
 * 果核AI 一键启动脚本
 *
 * 自动检查环境、安装依赖、启动开发服务器、打开浏览器
 * 支持 Windows / macOS / Linux
 */

import { spawn, execSync } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const port = process.env.PORT || '3000';
const isWin = process.platform === 'win32';
const pnpmCmd = isWin ? 'pnpm.cmd' : 'pnpm';

function openBrowser(url) {
  if (isWin) {
    execSync(`start "" "${url}"`, { stdio: 'ignore' });
  } else if (process.platform === 'darwin') {
    execSync(`open "${url}"`, { stdio: 'ignore' });
  } else {
    execSync(`xdg-open "${url}"`, { stdio: 'ignore' });
  }
}

function checkCommand(cmd) {
  try {
    execSync(`${cmd} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

console.log('');
console.log('============================================');
console.log('  果核AI - 正在启动...');
console.log('============================================');
console.log('');

// 检查 Node.js
const nodeVer = process.version;
console.log(`[检查] Node.js: ${nodeVer}`);

// 检查 pnpm
const hasPnpm = checkCommand('pnpm');
if (!hasPnpm) {
  console.log('[提示] 正在安装 pnpm...');
  try {
    execSync('npm install -g pnpm', { stdio: 'inherit' });
    console.log('[完成] pnpm 安装成功');
  } catch (e) {
    console.error('[错误] pnpm 安装失败');
    console.error('请手动执行: npm install -g pnpm');
    process.exit(1);
  }
} else {
  console.log('[检查] pnpm: 已就绪');
}

// 检查依赖
const projectDir = process.cwd();
const nodeModulesPath = path.join(projectDir, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('');
  console.log('[提示] 首次运行，正在安装依赖包...');
  console.log('       这可能需要几分钟，请耐心等待。');
  console.log('');
  try {
    execSync(`${pnpmCmd} install`, { stdio: 'inherit', shell: isWin });
    console.log('[完成] 依赖安装成功');
  } catch (e) {
    console.error('[错误] 依赖安装失败');
    console.error('请尝试删除 pnpm-lock.yaml 后重新运行');
    process.exit(1);
  }
}

// 启动开发服务器
console.log('');
console.log('[启动] 正在启动服务...');
console.log('');

const server = spawn(pnpmCmd, ['run', 'dev'], {
  stdio: 'inherit',
  shell: isWin,
  env: { ...process.env },
});

let browserOpened = false;

// 轮询直到服务器就绪，然后打开浏览器
const checkInterval = setInterval(() => {
  const req = http.get(`http://localhost:${port}`, (res) => {
    if (res.statusCode && !browserOpened) {
      browserOpened = true;
      clearInterval(checkInterval);
      const url = `http://localhost:${port}`;
      console.log('');
      console.log(`> 浏览器已打开: ${url}`);
      console.log('> 按 Ctrl+C 停止服务');
      console.log('');
      try {
        openBrowser(url);
      } catch {
        console.log(`> 请手动打开浏览器访问: ${url}`);
      }
    }
    res.destroy();
  });
  req.on('error', () => {
    // 服务器尚未就绪，继续轮询
  });
  req.setTimeout(2000, () => {
    req.destroy();
  });
}, 1500);

// 清理退出
function cleanup(code) {
  clearInterval(checkInterval);
  try {
    server.kill('SIGINT');
  } catch {
    // ignore
  }
  process.exit(code ?? 0);
}

server.on('exit', (code) => {
  cleanup(code ?? 0);
});

process.on('SIGINT', () => {
  console.log('\n> 正在停止服务...');
  cleanup(0);
});

process.on('SIGTERM', () => {
  cleanup(0);
});
