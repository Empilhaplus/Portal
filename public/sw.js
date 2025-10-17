// public/sw.js

// Define um nome para o cache
const CACHE_NAME = 'empilha-plus-cache-v1';
// Lista de URLs que devem ser cacheadas na instalação
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
  // Adicione aqui os caminhos para outros arquivos estáticos importantes
  // Ex: '/static/js/bundle.js', '/static/css/main.css', '/logo192.png'
];

// Evento de Instalação: Ocorre quando o Service Worker é instalado pela primeira vez
self.addEventListener('install', (event) => {
  // Espera a instalação terminar para abrir o cache e adicionar nossos arquivos
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento de Fetch: Intercepta todas as requisições de rede da página
self.addEventListener('fetch', (event) => {
  event.respondWith(
    // Tenta encontrar a requisição no cache primeiro
    caches.match(event.request)
      .then((response) => {
        // Se encontrar no cache, retorna a resposta do cache
        if (response) {
          return response;
        }
        // Se não encontrar, faz a requisição à rede
        return fetch(event.request);
      })
  );
});

// Evento de Ativação: Limpa caches antigos se houver uma nova versão
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});