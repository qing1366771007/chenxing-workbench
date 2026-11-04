// ============================================================
// 辰星工作台 - 多账号云端服务
// 基于 JSON 文件存储，无需数据库，部署简单
// ============================================================
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'chenxing-workbench-2024-secret-key';
const DATA_DIR = path.join(__dirname, 'data');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ============================================================
// JSON 数据库工具函数
// ============================================================
function readJSON(filename, defaultValue) {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) return defaultValue;
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  } catch (e) {
    return defaultValue;
  }
}

function writeJSON(filename, data) {
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
}

// 数据文件
let users = readJSON('users.json', []);
let userData = readJSON('user_data.json', {}); // { userId: { key: { value, updatedAt } } }
let studyLogs = readJSON('study_logs.json', []);
let nextUserId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
let nextLogId = studyLogs.length > 0 ? Math.max(...studyLogs.map(l => l.id)) + 1 : 1;

function saveUsers() { writeJSON('users.json', users); }
function saveUserData() { writeJSON('user_data.json', userData); }
function saveStudyLogs() { writeJSON('study_logs.json', studyLogs); }

// ============================================================
// JWT 认证中间件
// ============================================================
function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '未登录' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

// ============================================================
// 用户注册
// ============================================================
app.post('/api/register', (req, res) => {
  const { username, password, nickname, avatar, role, parentCode } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
  if (username.length < 2) return res.status(400).json({ error: '用户名至少2个字符' });
  if (password.length < 4) return res.status(400).json({ error: '密码至少4位' });

  // 检查用户名是否存在
  const exist = users.find(u => u.username === username);
  if (exist) return res.status(400).json({ error: '用户名已存在' });

  let parentId = 0;
  // 如果有家长邀请码（家长用户名），查找家长
  if (parentCode) {
    const parent = users.find(u => u.username === parentCode && u.role === 'parent');
    if (parent) parentId = parent.id;
  }

  const hash = bcrypt.hashSync(password, 10);
  const user = {
    id: nextUserId++,
    username,
    password: hash,
    nickname: nickname || username,
    avatar: avatar || '👦',
    role: role || 'child',
    parent_id: parentId,
    created_at: new Date().toISOString()
  };
  users.push(user);
  saveUsers();

  // 初始化用户数据空间
  userData[user.id] = {};
  saveUserData();

  const token = jwt.sign({ id: user.id, username, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      role: user.role
    }
  });
});

// ============================================================
// 用户登录
// ============================================================
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });

  const user = users.find(u => u.username === username);
  if (!user) return res.status(400).json({ error: '用户名或密码错误' });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(400).json({ error: '用户名或密码错误' });

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      role: user.role
    }
  });
});

// ============================================================
// 获取当前用户信息
// ============================================================
app.get('/api/user', auth, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json({
    user: {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      role: user.role
    }
  });
});

// ============================================================
// 修改用户信息
// ============================================================
app.put('/api/user', auth, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  const { nickname, avatar } = req.body;
  if (nickname) user.nickname = nickname;
  if (avatar) user.avatar = avatar;
  saveUsers();
  res.json({ ok: true });
});

// ============================================================
// 保存用户数据（key-value形式，存储所有模块数据）
// ============================================================
app.post('/api/data/:key', auth, (req, res) => {
  const { key } = req.params;
  const value = req.body;
  const now = new Date().toISOString();
  
  if (!userData[req.user.id]) userData[req.user.id] = {};
  userData[req.user.id][key] = { value, updatedAt: now };
  saveUserData();

  res.json({ ok: true, updatedAt: now });
});

// ============================================================
// 获取用户数据
// ============================================================
app.get('/api/data/:key', auth, (req, res) => {
  const data = userData[req.user.id]?.[req.params.key];
  if (!data) return res.json({ value: null, updatedAt: null });
  res.json({ value: data.value, updatedAt: data.updatedAt });
});

// ============================================================
// 获取用户所有数据（首次登录同步用）
// ============================================================
app.get('/api/data', auth, (req, res) => {
  const result = userData[req.user.id] || {};
  res.json(result);
});

// ============================================================
// 记录学习日志
// ============================================================
app.post('/api/log', auth, (req, res) => {
  const { module, action, detail, score } = req.body;
  const log = {
    id: nextLogId++,
    user_id: req.user.id,
    module: module || 'unknown',
    action: action || 'study',
    detail: detail || '',
    score: score || 0,
    created_at: new Date().toISOString()
  };
  studyLogs.push(log);
  // 只保留最近10000条，防止文件过大
  if (studyLogs.length > 10000) {
    studyLogs = studyLogs.slice(-10000);
  }
  saveStudyLogs();
  res.json({ ok: true });
});

// ============================================================
// 统计辅助函数
// ============================================================
function getUserLogs(userId) {
  return studyLogs.filter(l => l.user_id === userId);
}

function getTodayLogs(logs) {
  const today = new Date().toISOString().slice(0, 10);
  return logs.filter(l => l.created_at.slice(0, 10) === today);
}

function getWeekLogs(logs) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  return logs.filter(l => l.created_at >= weekAgo);
}

function sumCountAndScore(logs) {
  return {
    cnt: logs.length,
    score: logs.reduce((s, l) => s + (l.score || 0), 0)
  };
}

// ============================================================
// 获取学习统计（今日/本周/总）
// ============================================================
app.get('/api/stats', auth, (req, res) => {
  const logs = getUserLogs(req.user.id);
  const todayLogs = getTodayLogs(logs);
  const weekLogs = getWeekLogs(logs);
  
  // 各模块统计
  const moduleMap = {};
  logs.forEach(l => {
    if (!moduleMap[l.module]) moduleMap[l.module] = { module: l.module, cnt: 0, score: 0 };
    moduleMap[l.module].cnt++;
    moduleMap[l.module].score += l.score || 0;
  });
  const byModule = Object.values(moduleMap).sort((a, b) => b.cnt - a.cnt);
  
  // 最近7天趋势
  const dailyMap = {};
  weekLogs.forEach(l => {
    const date = l.created_at.slice(0, 10);
    if (!dailyMap[date]) dailyMap[date] = { date, cnt: 0, score: 0 };
    dailyMap[date].cnt++;
    dailyMap[date].score += l.score || 0;
  });
  const daily = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
  
  res.json({
    today: sumCountAndScore(todayLogs),
    week: sumCountAndScore(weekLogs),
    total: sumCountAndScore(logs),
    byModule,
    daily
  });
});

// ============================================================
// 家长端 - 获取孩子列表
// ============================================================
app.get('/api/parent/children', auth, (req, res) => {
  if (req.user.role !== 'parent') return res.status(403).json({ error: '仅家长可访问' });
  
  // 找出所有孩子
  const children = users
    .filter(u => u.role === 'child')
    .map(u => ({
      id: u.id,
      username: u.username,
      nickname: u.nickname,
      avatar: u.avatar,
      created_at: u.created_at
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  
  res.json({ children });
});

// ============================================================
// 家长端 - 获取某个孩子的学习详情
// ============================================================
app.get('/api/parent/child/:id/stats', auth, (req, res) => {
  if (req.user.role !== 'parent') return res.status(403).json({ error: '仅家长可访问' });
  
  const childId = parseInt(req.params.id);
  const child = users.find(u => u.id === childId);
  if (!child) return res.status(404).json({ error: '孩子不存在' });
  
  const logs = getUserLogs(childId);
  const todayLogs = getTodayLogs(logs);
  const weekLogs = getWeekLogs(logs);
  
  // 各模块统计
  const moduleMap = {};
  logs.forEach(l => {
    if (!moduleMap[l.module]) moduleMap[l.module] = { module: l.module, cnt: 0, score: 0 };
    moduleMap[l.module].cnt++;
    moduleMap[l.module].score += l.score || 0;
  });
  const byModule = Object.values(moduleMap).sort((a, b) => b.cnt - a.cnt);
  
  // 最近7天趋势
  const dailyMap = {};
  weekLogs.forEach(l => {
    const date = l.created_at.slice(0, 10);
    if (!dailyMap[date]) dailyMap[date] = { date, cnt: 0, score: 0 };
    dailyMap[date].cnt++;
    dailyMap[date].score += l.score || 0;
  });
  const daily = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
  
  // 最近20条学习记录
  const recentLogs = logs
    .slice(-20)
    .reverse()
    .map(l => ({
      module: l.module,
      action: l.action,
      detail: l.detail,
      score: l.score,
      created_at: l.created_at
    }));
  
  res.json({
    child: {
      id: child.id,
      username: child.username,
      nickname: child.nickname,
      avatar: child.avatar
    },
    today: sumCountAndScore(todayLogs),
    week: sumCountAndScore(weekLogs),
    total: sumCountAndScore(logs),
    byModule,
    daily,
    recentLogs
  });
});

// ============================================================
// 家长端 - 排行榜
// ============================================================
app.get('/api/parent/ranking', auth, (req, res) => {
  if (req.user.role !== 'parent') return res.status(403).json({ error: '仅家长可访问' });
  
  const children = users.filter(u => u.role === 'child');
  
  function getChildStats(childId, filterFn) {
    const logs = getUserLogs(childId).filter(filterFn);
    return sumCountAndScore(logs);
  }
  
  const today = children.map(c => {
    const stats = getChildStats(c.id, l => l.created_at.slice(0, 10) === new Date().toISOString().slice(0, 10));
    return { id: c.id, nickname: c.nickname, avatar: c.avatar, cnt: stats.cnt, score: stats.score };
  }).sort((a, b) => b.score - a.score || b.cnt - a.cnt);
  
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const week = children.map(c => {
    const stats = getChildStats(c.id, l => l.created_at >= weekAgo);
    return { id: c.id, nickname: c.nickname, avatar: c.avatar, cnt: stats.cnt, score: stats.score };
  }).sort((a, b) => b.score - a.score || b.cnt - a.cnt);
  
  res.json({ today, week });
});

// ============================================================
// 健康检查
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), users: users.length });
});

// ============================================================
// 静态文件服务（前端页面）
// ============================================================
app.use(express.static(__dirname));

// 根路径直接打开工作台
app.get('/', (req, res) => {
res.sendFile(path.join(__dirname, 'index.html'));
});

// ============================================================
// 启动服务
// ============================================================
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║       辰星工作台 · 云端服务启动成功       ║');
  console.log('  ╠══════════════════════════════════════════╣');
  console.log('  ║  本地访问: http://localhost:' + PORT + '           ║');
  console.log('  ║  局域网:  http://<你的IP>:' + PORT + '            ║');
  console.log('  ║  数据文件: server/data/                  ║');
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');
});
