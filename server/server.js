// ============================================================
// 辰星工作台 - 多账号云端服务
// 基于 Supabase 数据库，数据永久保存
// ============================================================
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'chenxing-workbench-2024-secret-key';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Supabase 客户端
let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false }
  });
  console.log('✅ Supabase 已连接');
} else {
  console.log('⚠️  未配置 Supabase，使用内存存储（重启会丢失数据）');
}

// 内存兜底存储（如果 Supabase 未配置）
let memUsers = [];
let memUserData = {};
let memStudyLogs = [];
let memNextUserId = 1;
let memNextLogId = 1;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ============================================================
// 数据库操作辅助函数
// ============================================================
async function dbGetUserByUsername(username) {
  if (supabase) {
    try {
      const { data } = await supabase.from('users').select('*').eq('username', username).single();
      return data;
    } catch (e) {
      return null;
    }
  }
  return memUsers.find(u => u.username === username);
}

async function dbGetUserById(id) {
  if (supabase) {
    try {
      const { data } = await supabase.from('users').select('*').eq('id', id).single();
      return data;
    } catch (e) {
      return null;
    }
  }
  return memUsers.find(u => u.id === id);
}

async function dbCreateUser(userData) {
  if (supabase) {
    const { data, error } = await supabase.from('users').insert([userData]).select().single();
    if (error) throw error;
    return data;
  }
  const user = { id: memNextUserId++, ...userData, created_at: new Date().toISOString() };
  memUsers.push(user);
  return user;
}

async function dbGetAllUserData(userId) {
  if (supabase) {
    const { data } = await supabase.from('user_data').select('data_key,data_value,updated_at').eq('user_id', userId);
    const result = {};
    (data || []).forEach(item => {
      let val = item.data_value;
      try { val = JSON.parse(item.data_value); } catch (e) {}
      result[item.data_key] = { value: val, updatedAt: item.updated_at };
    });
    return result;
  }
  return memUserData[userId] || {};
}

async function dbSetUserData(userId, key, value) {
  const now = new Date().toISOString();
  if (supabase) {
    // upsert：有则更新，无则插入
    let existing = null;
    try {
      const { data } = await supabase.from('user_data').select('id').eq('user_id', userId).eq('data_key', key).single();
      existing = data;
    } catch (e) {
      existing = null;
    }
    if (existing) {
      await supabase.from('user_data').update({ data_value: JSON.stringify(value), updated_at: now }).eq('id', existing.id);
    } else {
      await supabase.from('user_data').insert([{ user_id: userId, data_key: key, data_value: JSON.stringify(value), updated_at: now }]);
    }
    return { ok: true, updatedAt: now };
  }
  if (!memUserData[userId]) memUserData[userId] = {};
  memUserData[userId][key] = { value, updatedAt: now };
  return { ok: true, updatedAt: now };
}

async function dbBatchSyncUserData(userId, localData) {
  const now = new Date().toISOString();
  let merged = 0;
  
  if (supabase) {
    // 获取云端已有数据
    const { data: cloudData } = await supabase.from('user_data').select('data_key,data_value').eq('user_id', userId);
    const cloudMap = {};
    (cloudData || []).forEach(item => {
      let val = item.data_value;
      try { val = JSON.parse(item.data_value); } catch (e) {}
      cloudMap[item.data_key] = val;
    });
    
    const inserts = [];
    const updates = [];
    
    Object.keys(localData).forEach(key => {
      const localVal = localData[key];
      const cloudVal = cloudMap[key];
      
      if (cloudVal === undefined) {
        // 云端没有，插入
        inserts.push({ user_id: userId, data_key: key, data_value: JSON.stringify(localVal), updated_at: now });
        merged++;
      } else if (key === 'cx_stars') {
        // 星星取最大值
        const localStars = parseInt(localVal || '0');
        const cloudStars = parseInt(cloudVal || '0');
        if (localStars > cloudStars) {
          updates.push({ key, value: localVal });
          merged++;
        }
      }
    });
    
    if (inserts.length > 0) {
      await supabase.from('user_data').insert(inserts);
    }
    for (const u of updates) {
      await supabase.from('user_data').update({ data_value: JSON.stringify(u.value), updated_at: now }).eq('user_id', userId).eq('data_key', u.key);
    }
    
    return { ok: true, merged, total: Object.keys(cloudMap).length + inserts.length };
  }
  
  // 内存模式
  if (!memUserData[userId]) memUserData[userId] = {};
  Object.keys(localData).forEach(key => {
    const localVal = localData[key];
    const cloudItem = memUserData[userId][key];
    if (!cloudItem) {
      memUserData[userId][key] = { value: localVal, updatedAt: now };
      merged++;
    } else if (key === 'cx_stars') {
      const localStars = parseInt(localVal || '0');
      const cloudStars = parseInt(cloudItem.value || '0');
      if (localStars > cloudStars) {
        memUserData[userId][key] = { value: localVal, updatedAt: now };
        merged++;
      }
    }
  });
  return { ok: true, merged, total: Object.keys(memUserData[userId]).length };
}

async function dbAddStudyLog(userId, logData) {
  if (supabase) {
    const { data, error } = await supabase.from('study_logs').insert([{ user_id: userId, ...logData }]).select().single();
    if (error) throw error;
    return data;
  }
  const log = { id: memNextLogId++, user_id: userId, ...logData, created_at: new Date().toISOString() };
  memStudyLogs.push(log);
  return log;
}

async function dbGetStudyLogs(userId, limit = 50) {
  if (supabase) {
    const { data } = await supabase.from('study_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
    return data || [];
  }
  return memStudyLogs.filter(l => l.user_id === userId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, limit);
}

async function dbGetAllChildren() {
  if (supabase) {
    const { data } = await supabase.from('users').select('id,username,nickname,avatar,role,created_at').eq('role', 'child');
    return data || [];
  }
  return memUsers.filter(u => u.role === 'child').map(u => ({ id: u.id, username: u.username, nickname: u.nickname, avatar: u.avatar, role: u.role, created_at: u.created_at }));
}

async function dbGetAllLogs(limit = 100) {
  if (supabase) {
    const { data } = await supabase.from('study_logs').select('*,users(username,nickname,avatar)').order('created_at', { ascending: false }).limit(limit);
    return (data || []).map(l => ({
      id: l.id,
      user_id: l.user_id,
      module: l.module,
      action: l.action,
      detail: l.detail,
      score: l.score,
      created_at: l.created_at,
      username: l.users?.username,
      nickname: l.users?.nickname,
      avatar: l.users?.avatar
    }));
  }
  return memStudyLogs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, limit).map(l => {
    const u = memUsers.find(u => u.id === l.user_id) || {};
    return { ...l, username: u.username, nickname: u.nickname, avatar: u.avatar };
  });
}

async function dbGetChildDetail(childId) {
  const user = await dbGetUserById(childId);
  if (!user) return null;
  
  const logs = await dbGetStudyLogs(childId, 20);
  const userData = await dbGetAllUserData(childId);
  
  return {
    user: {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      role: user.role,
      created_at: user.created_at
    },
    logs,
    userData
  };
}

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

// 轻量API调用函数
function api(path, options = {}) {
  return fetch(API_BASE + path, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { 'Authorization': 'Bearer ' + options.token } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  }).then(r => r.json());
}

// ============================================================
// 用户注册
// ============================================================
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, nickname, avatar, role, parentCode } = req.body;
    if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
    if (username.length < 2) return res.status(400).json({ error: '用户名至少2个字符' });
    if (password.length < 4) return res.status(400).json({ error: '密码至少4位' });

    // 检查用户名是否存在
    const exist = await dbGetUserByUsername(username);
    if (exist) return res.status(400).json({ error: '用户名已存在' });

    let parentId = 0;
    if (parentCode) {
      const parent = await dbGetUserByUsername(parentCode);
      if (parent && parent.role === 'parent') parentId = parent.id;
    }

    const hash = bcrypt.hashSync(password, 10);
    const user = await dbCreateUser({
      username,
      password: hash,
      nickname: nickname || username,
      avatar: avatar || '👦',
      role: role || 'child',
      parent_id: parentId
    });

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
  } catch (e) {
    console.error('注册失败:', e);
    res.status(500).json({ error: '注册失败：' + e.message });
  }
});

// ============================================================
// 用户登录
// ============================================================
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });

    const user = await dbGetUserByUsername(username);
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
  } catch (e) {
    console.error('登录失败:', e);
    res.status(500).json({ error: '登录失败' });
  }
});

// ============================================================
// 获取当前用户信息
// ============================================================
app.get('/api/user', auth, async (req, res) => {
  try {
    const user = await dbGetUserById(req.user.id);
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
  } catch (e) {
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// ============================================================
// 保存单个用户数据
// ============================================================
app.post('/api/data/:key', auth, async (req, res) => {
  try {
    const { key } = req.params;
    const value = req.body;
    const result = await dbSetUserData(req.user.id, key, value);
    res.json(result);
  } catch (e) {
    console.error('保存数据失败:', e);
    res.status(500).json({ error: '保存失败' });
  }
});

// ============================================================
// 获取单个用户数据
// ============================================================
app.get('/api/data/:key', auth, async (req, res) => {
  try {
    const allData = await dbGetAllUserData(req.user.id);
    const data = allData[req.params.key];
    if (!data) return res.json({ value: null, updatedAt: null });
    res.json({ value: data.value, updatedAt: data.updatedAt });
  } catch (e) {
    res.status(500).json({ error: '获取失败' });
  }
});

// ============================================================
// 获取用户所有数据（首次登录同步用）
// ============================================================
app.get('/api/data', auth, async (req, res) => {
  try {
    const result = await dbGetAllUserData(req.user.id);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: '获取失败' });
  }
});

// ============================================================
// 批量同步数据（本地->云端，以新的为准）
// ============================================================
app.post('/api/data/batch/sync', auth, async (req, res) => {
  try {
    const localData = req.body || {};
    const result = await dbBatchSyncUserData(req.user.id, localData);
    res.json(result);
  } catch (e) {
    console.error('批量同步失败:', e);
    res.status(500).json({ error: '同步失败' });
  }
});

// ============================================================
// 记录学习日志
// ============================================================
app.post('/api/log', auth, async (req, res) => {
  try {
    const { module, action, detail, score } = req.body;
    const log = await dbAddStudyLog(req.user.id, {
      module: module || 'unknown',
      action: action || 'study',
      detail: detail || '',
      score: score || 0
    });
    res.json({ ok: true, id: log.id });
  } catch (e) {
    console.error('记录日志失败:', e);
    res.status(500).json({ error: '记录失败' });
  }
});

// ============================================================
// 获取我的学习日志
// ============================================================
app.get('/api/logs', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = await dbGetStudyLogs(req.user.id, limit);
    res.json(logs);
  } catch (e) {
    res.status(500).json({ error: '获取失败' });
  }
});

// ============================================================
// 家长中心 - 获取所有孩子列表
// ============================================================
app.get('/api/parent/children', auth, async (req, res) => {
  try {
    if (req.user.role !== 'parent') return res.status(403).json({ error: '仅家长可访问' });
    const children = await dbGetAllChildren();
    res.json(children);
  } catch (e) {
    res.status(500).json({ error: '获取失败' });
  }
});

// ============================================================
// 家长中心 - 今日排行榜
// ============================================================
app.get('/api/parent/ranking', auth, async (req, res) => {
  try {
    if (req.user.role !== 'parent') return res.status(403).json({ error: '仅家长可访问' });
    
    const children = await dbGetAllChildren();
    const allLogs = await dbGetAllLogs(200);
    
    const today = new Date().toDateString();
    const todayLogs = allLogs.filter(l => new Date(l.created_at).toDateString() === today);
    
    const result = children.map(child => {
      const childLogs = todayLogs.filter(l => l.user_id === child.id);
      const totalScore = childLogs.reduce((sum, l) => sum + (l.score || 0), 0);
      const logCount = childLogs.length;
      return {
        id: child.id,
        username: child.username,
        nickname: child.nickname,
        avatar: child.avatar,
        score: totalScore,
        count: logCount
      };
    }).sort((a, b) => b.score - a.score);
    
    res.json(result);
  } catch (e) {
    console.error('排行榜失败:', e);
    res.status(500).json({ error: '获取失败' });
  }
});

// ============================================================
// 家长中心 - 查看某个孩子详情
// ============================================================
app.get('/api/parent/child/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'parent') return res.status(403).json({ error: '仅家长可访问' });
    
    const childId = parseInt(req.params.id);
    const detail = await dbGetChildDetail(childId);
    if (!detail) return res.status(404).json({ error: '孩子不存在' });
    
    // 计算统计数据
    const logs = detail.logs || [];
    const today = new Date().toDateString();
    const todayLogs = logs.filter(l => new Date(l.created_at).toDateString() === today);
    
    // 本周统计
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekLogs = logs.filter(l => new Date(l.created_at) >= weekStart);
    
    const stars = detail.userData?.cx_stars?.value || '0';
    
    res.json({
      user: detail.user,
      stats: {
        todayScore: todayLogs.reduce((s, l) => s + (l.score || 0), 0),
        todayCount: todayLogs.length,
        weekScore: weekLogs.reduce((s, l) => s + (l.score || 0), 0),
        weekCount: weekLogs.length,
        totalStars: parseInt(stars) || 0
      },
      logs: detail.logs,
      userData: detail.userData
    });
  } catch (e) {
    console.error('孩子详情失败:', e);
    res.status(500).json({ error: '获取失败' });
  }
});

// ============================================================
// 健康检查
// ============================================================
app.get('/api/health', async (req, res) => {
  const userCount = supabase ? 'supabase' : memUsers.length;
  res.json({ status: 'ok', time: new Date().toISOString(), storage: userCount });
});

// ============================================================
// 静态文件服务（前端页面）
// ============================================================
// 强制不缓存，确保App/WebView每次都加载最新版本
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});
app.use(express.static(__dirname));

// ============================================================
// 百度TTS代理接口 - 解决App/WebView防盗链问题
// ============================================================
app.get('/api/tts', async (req, res) => {
  const text = req.query.text || '';
  const lang = req.query.lang || 'zh';
  const spd = req.query.spd || '3';

  if (!text) {
    return res.status(400).send('text is required');
  }

  const baiduLan = lang.startsWith('en') ? 'en' : 'zh';
  const url = `https://fanyi.baidu.com/gettts?lan=${baiduLan}&text=${encodeURIComponent(text)}&spd=${spd}&source=web`;

  try {
    const https = require('https');
    https.get(url, {
      headers: {
        'Referer': 'https://fanyi.baidu.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (response) => {
      if (response.statusCode === 200) {
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        response.pipe(res);
      } else {
        res.status(response.statusCode).send('TTS request failed');
      }
    }).on('error', (err) => {
      res.status(500).send('TTS proxy error: ' + err.message);
    });
  } catch (err) {
    res.status(500).send('TTS proxy error');
  }
});

// ============================================================
// 语音识别（百度短语音）— 让小孩读、系统听
// 需要在 Render 环境变量里配：BAIDU_ASR_KEY / BAIDU_ASR_SECRET
// 未配置时 /api/asr/status 返回 ready=false，前端自动降级
// ============================================================
let _bdAsrTok = { token: '', exp: 0 };

app.get('/api/asr/status', (req, res) => {
  res.json({
    ready: !!(process.env.BAIDU_ASR_KEY && process.env.BAIDU_ASR_SECRET),
    engine: 'baidu'
  });
});

function getBaiduAsrToken() {
  return new Promise((resolve) => {
    const key = process.env.BAIDU_ASR_KEY;
    const sec = process.env.BAIDU_ASR_SECRET;
    if (!key || !sec) return resolve(null);
    if (_bdAsrTok.token && Date.now() < _bdAsrTok.exp) return resolve(_bdAsrTok.token);
    const https = require('https');
    const url = 'https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=' +
      encodeURIComponent(key) + '&client_secret=' + encodeURIComponent(sec);
    const rq = https.request(url, { method: 'POST', headers: { 'Content-Length': 0 } }, (r) => {
      let body = '';
      r.on('data', (d) => { body += d; });
      r.on('end', () => {
        try {
          const j = JSON.parse(body);
          if (j.access_token) {
            _bdAsrTok = {
              token: j.access_token,
              exp: Date.now() + ((j.expires_in || 2592000) - 7200) * 1000
            };
            resolve(j.access_token);
          } else {
            console.log('❌ 百度 ASR token 失败:', body.slice(0, 200));
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    });
    rq.on('error', () => resolve(null));
    rq.end();
  });
}

app.post('/api/asr', async (req, res) => {
  const audio = req.body && req.body.audio;
  const rate = Number((req.body && req.body.rate) || 16000);
  if (!audio) return res.status(400).json({ ok: false, err: 'no_audio' });

  const token = await getBaiduAsrToken();
  if (!token) return res.status(503).json({ ok: false, err: 'no_key' });

  try {
    const https = require('https');
    const payload = JSON.stringify({
      format: 'wav',
      rate: rate,
      channel: 1,
      cuid: 'chenxing-workbench-2026',
      token: token,
      speech: audio,
      dev_pid: 1537
    });
    const out = await new Promise((resolve) => {
      const rq = https.request('https://vop.baidu.com/server_api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      }, (r) => {
        let b = '';
        r.on('data', (d) => { b += d; });
        r.on('end', () => resolve(b));
      });
      rq.on('error', (e) => resolve(JSON.stringify({ err_no: -1, err_msg: e.message })));
      rq.write(payload);
      rq.end();
    });

    let j = {};
    try { j = JSON.parse(out); } catch (e) {}
    if (j.err_no === 0 && Array.isArray(j.result) && j.result.length) {
      return res.json({ ok: true, text: j.result[0] });
    }
    if (j.err_no === 110 || j.err_no === 111) {
      _bdAsrTok = { token: '', exp: 0 };
      return res.json({ ok: false, err: 'token_expired' });
    }
    return res.json({ ok: false, err: j.err_msg || 'asr_fail', code: j.err_no });
  } catch (e) {
    return res.json({ ok: false, err: e.message });
  }
});

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
  console.log('  ║  存储方式: ' + (supabase ? 'Supabase 数据库' : '内存（重启丢失）') + '        ║');
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');
});
