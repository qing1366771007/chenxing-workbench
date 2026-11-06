// 辰星工作台 Service Worker
const CACHE_NAME = 'chenxing-workbench-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// 安装
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS).catch(function() {
        // 部分文件可能不存在，不影响安装
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// 激活
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) {
          return key !== CACHE_NAME;
        }).map(function(key) {
          return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// 拦截请求
self.addEventListener('fetch', function(event) {
  const url = new URL(event.request.url);
  
  // API 请求不缓存，直接走网络
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request).catch(function() {
      return new Response(JSON.stringify({ error: '网络连接失败' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }));
    return;
  }
  
  // 静态资源：缓存优先，网络更新
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      const networkFetch = fetch(event.request).then(function(response) {
        // 更新缓存
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function() {
        return cached;
      });
      
      return cached || networkFetch;
    })
  );
});
