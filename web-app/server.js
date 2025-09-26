const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');

let tasks = [
  { id: 1, title: '每日回顧', description: '花 10 分鐘回顧今日亮點與待改進事項', completed: false },
  { id: 2, title: '專注時間', description: '使用番茄鐘完成一個 25 分鐘專注時段', completed: true },
  { id: 3, title: '健康補給', description: '喝滿 2000cc 水並完成 30 分鐘運動', completed: false }
];

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString('utf-8');
      if (body.length > 1e6) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });
  });
}

function serveStatic(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        sendJSON(res, 404, { error: 'Not Found' });
      } else {
        sendJSON(res, 500, { error: 'Server Error' });
      }
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml'
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const { pathname } = parsedUrl;

  if (pathname === '/api/tasks' && req.method === 'GET') {
    return sendJSON(res, 200, tasks);
  }

  if (pathname === '/api/tasks' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      if (!body.title || typeof body.title !== 'string') {
        return sendJSON(res, 400, { error: '缺少任務標題' });
      }

      const newTask = {
        id: Date.now(),
        title: body.title.trim(),
        description: (body.description || '').trim(),
        completed: false
      };

      tasks.push(newTask);
      return sendJSON(res, 201, newTask);
    } catch (error) {
      return sendJSON(res, 400, { error: error.message });
    }
  }

  const toggleMatch = pathname.match(/^\/api\/tasks\/(\d+)\/toggle$/);
  if (toggleMatch && req.method === 'PATCH') {
    const taskId = Number(toggleMatch[1]);
    const task = tasks.find((item) => item.id === taskId);
    if (!task) {
      return sendJSON(res, 404, { error: '找不到任務' });
    }

    task.completed = !task.completed;
    return sendJSON(res, 200, task);
  }

  const deleteMatch = pathname.match(/^\/api\/tasks\/(\d+)$/);
  if (deleteMatch && req.method === 'DELETE') {
    const taskId = Number(deleteMatch[1]);
    const initialLength = tasks.length;
    tasks = tasks.filter((item) => item.id !== taskId);
    if (tasks.length === initialLength) {
      return sendJSON(res, 404, { error: '找不到任務' });
    }
    res.writeHead(204);
    res.end();
    return;
  }

  if (pathname.startsWith('/api/')) {
    return sendJSON(res, 404, { error: 'API 路徑不存在' });
  }

  let filePath = path.join(publicDir, pathname);
  if (pathname === '/') {
    filePath = path.join(publicDir, 'index.html');
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      if (err.code === 'ENOENT') {
        return sendJSON(res, 404, { error: 'Not Found' });
      }
      return sendJSON(res, 500, { error: 'Server Error' });
    }

    if (stats.isDirectory()) {
      const indexPath = path.join(filePath, 'index.html');
      return serveStatic(res, indexPath);
    }

    serveStatic(res, filePath);
  });
});

server.listen(PORT, () => {
  console.log(`Productivity Planner server listening on port ${PORT}`);
});
