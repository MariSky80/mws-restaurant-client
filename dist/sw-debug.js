(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

(function() {
  function toArray(arr) {
    return Array.prototype.slice.call(arr);
  }

  function promisifyRequest(request) {
    return new Promise(function(resolve, reject) {
      request.onsuccess = function() {
        resolve(request.result);
      };

      request.onerror = function() {
        reject(request.error);
      };
    });
  }

  function promisifyRequestCall(obj, method, args) {
    var request;
    var p = new Promise(function(resolve, reject) {
      request = obj[method].apply(obj, args);
      promisifyRequest(request).then(resolve, reject);
    });

    p.request = request;
    return p;
  }

  function promisifyCursorRequestCall(obj, method, args) {
    var p = promisifyRequestCall(obj, method, args);
    return p.then(function(value) {
      if (!value) return;
      return new Cursor(value, p.request);
    });
  }

  function proxyProperties(ProxyClass, targetProp, properties) {
    properties.forEach(function(prop) {
      Object.defineProperty(ProxyClass.prototype, prop, {
        get: function() {
          return this[targetProp][prop];
        },
        set: function(val) {
          this[targetProp][prop] = val;
        }
      });
    });
  }

  function proxyRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return promisifyRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function proxyMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return this[targetProp][prop].apply(this[targetProp], arguments);
      };
    });
  }

  function proxyCursorRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return promisifyCursorRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function Index(index) {
    this._index = index;
  }

  proxyProperties(Index, '_index', [
    'name',
    'keyPath',
    'multiEntry',
    'unique'
  ]);

  proxyRequestMethods(Index, '_index', IDBIndex, [
    'get',
    'getKey',
    'getAll',
    'getAllKeys',
    'count'
  ]);

  proxyCursorRequestMethods(Index, '_index', IDBIndex, [
    'openCursor',
    'openKeyCursor'
  ]);

  function Cursor(cursor, request) {
    this._cursor = cursor;
    this._request = request;
  }

  proxyProperties(Cursor, '_cursor', [
    'direction',
    'key',
    'primaryKey',
    'value'
  ]);

  proxyRequestMethods(Cursor, '_cursor', IDBCursor, [
    'update',
    'delete'
  ]);

  // proxy 'next' methods
  ['advance', 'continue', 'continuePrimaryKey'].forEach(function(methodName) {
    if (!(methodName in IDBCursor.prototype)) return;
    Cursor.prototype[methodName] = function() {
      var cursor = this;
      var args = arguments;
      return Promise.resolve().then(function() {
        cursor._cursor[methodName].apply(cursor._cursor, args);
        return promisifyRequest(cursor._request).then(function(value) {
          if (!value) return;
          return new Cursor(value, cursor._request);
        });
      });
    };
  });

  function ObjectStore(store) {
    this._store = store;
  }

  ObjectStore.prototype.createIndex = function() {
    return new Index(this._store.createIndex.apply(this._store, arguments));
  };

  ObjectStore.prototype.index = function() {
    return new Index(this._store.index.apply(this._store, arguments));
  };

  proxyProperties(ObjectStore, '_store', [
    'name',
    'keyPath',
    'indexNames',
    'autoIncrement'
  ]);

  proxyRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'put',
    'add',
    'delete',
    'clear',
    'get',
    'getAll',
    'getKey',
    'getAllKeys',
    'count'
  ]);

  proxyCursorRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'openCursor',
    'openKeyCursor'
  ]);

  proxyMethods(ObjectStore, '_store', IDBObjectStore, [
    'deleteIndex'
  ]);

  function Transaction(idbTransaction) {
    this._tx = idbTransaction;
    this.complete = new Promise(function(resolve, reject) {
      idbTransaction.oncomplete = function() {
        resolve();
      };
      idbTransaction.onerror = function() {
        reject(idbTransaction.error);
      };
      idbTransaction.onabort = function() {
        reject(idbTransaction.error);
      };
    });
  }

  Transaction.prototype.objectStore = function() {
    return new ObjectStore(this._tx.objectStore.apply(this._tx, arguments));
  };

  proxyProperties(Transaction, '_tx', [
    'objectStoreNames',
    'mode'
  ]);

  proxyMethods(Transaction, '_tx', IDBTransaction, [
    'abort'
  ]);

  function UpgradeDB(db, oldVersion, transaction) {
    this._db = db;
    this.oldVersion = oldVersion;
    this.transaction = new Transaction(transaction);
  }

  UpgradeDB.prototype.createObjectStore = function() {
    return new ObjectStore(this._db.createObjectStore.apply(this._db, arguments));
  };

  proxyProperties(UpgradeDB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

  proxyMethods(UpgradeDB, '_db', IDBDatabase, [
    'deleteObjectStore',
    'close'
  ]);

  function DB(db) {
    this._db = db;
  }

  DB.prototype.transaction = function() {
    return new Transaction(this._db.transaction.apply(this._db, arguments));
  };

  proxyProperties(DB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

  proxyMethods(DB, '_db', IDBDatabase, [
    'close'
  ]);

  // Add cursor iterators
  // TODO: remove this once browsers do the right thing with promises
  ['openCursor', 'openKeyCursor'].forEach(function(funcName) {
    [ObjectStore, Index].forEach(function(Constructor) {
      Constructor.prototype[funcName.replace('open', 'iterate')] = function() {
        var args = toArray(arguments);
        var callback = args[args.length - 1];
        var nativeObject = this._store || this._index;
        var request = nativeObject[funcName].apply(nativeObject, args.slice(0, -1));
        request.onsuccess = function() {
          callback(request.result);
        };
      };
    });
  });

  // polyfill getAll
  [Index, ObjectStore].forEach(function(Constructor) {
    if (Constructor.prototype.getAll) return;
    Constructor.prototype.getAll = function(query, count) {
      var instance = this;
      var items = [];

      return new Promise(function(resolve) {
        instance.iterateCursor(query, function(cursor) {
          if (!cursor) {
            resolve(items);
            return;
          }
          items.push(cursor.value);

          if (count !== undefined && items.length == count) {
            resolve(items);
            return;
          }
          cursor.continue();
        });
      });
    };
  });

  var exp = {
    open: function(name, version, upgradeCallback) {
      var p = promisifyRequestCall(indexedDB, 'open', [name, version]);
      var request = p.request;

      request.onupgradeneeded = function(event) {
        if (upgradeCallback) {
          upgradeCallback(new UpgradeDB(request.result, event.oldVersion, request.transaction));
        }
      };

      return p.then(function(db) {
        return new DB(db);
      });
    },
    delete: function(name) {
      return promisifyRequestCall(indexedDB, 'deleteDatabase', [name]);
    }
  };

  if (typeof module !== 'undefined') {
    module.exports = exp;
    module.exports.default = module.exports;
  }
  else {
    self.idb = exp;
  }
}());

},{}],2:[function(require,module,exports){
const idb = require('idb');
const IDB_DB = 'restaurant-db';
const IDB_RESTAURANTS = 'restaurants';
const IDB_PENDING_RESTAURANTS = 'pending_restaurants';
const IDB_REVIEWS = 'reviews';
const IDB_PENDING_REVIEWS = 'pending_reviews';

const dbPromise = idb.open(IDB_DB, 2, function (upgradeDb) {
  switch (upgradeDb.oldVersion) {
    case 0:
    case 1:
    case 2:
      const storeRestaurant = upgradeDb.createObjectStore(IDB_RESTAURANTS, {
        keyPath: 'id'
      });
      storeRestaurant.createIndex('by-id', 'id', { unique: true });

      const storeReviews = upgradeDb.createObjectStore(IDB_REVIEWS, {
        keyPath: 'id'
      });
      //storeReviews.createIndex('by-id', 'id', { unique: true });
      storeReviews.createIndex('by-restaurant-id', 'restaurant_id');

      const pendingRestaurants = upgradeDb.createObjectStore(IDB_PENDING_RESTAURANTS, {
        keyPath: 'id'
      });
      pendingRestaurants.createIndex('by-id', 'id', { unique: true });

      const pendingReviews = upgradeDb.createObjectStore(IDB_PENDING_REVIEWS, {
        keyPath: 'id', autoIncrement: true
      });
      pendingReviews.createIndex('by-id', 'id', { unique: true });
  }
});

const staticCacheName = 'mws-restaurant-stage-3';

let filesToCache = ['/', 'manifest.json', 'index.html', 'restaurant.html', 'css/main.css', 'css/detail.css', 'js/bundle_main.js', 'js/bundle_restaurant.js', 'sw.js', 'img/favicon/apple-icon-57x57.png', 'img/favicon/apple-icon-60x60.png', 'img/favicon/apple-icon-72x72.png', 'img/favicon/apple-icon-76x76.png', 'img/favicon/apple-icon-114x114.png', 'img/favicon/apple-icon-120x120.png', 'img/favicon/apple-icon-144x144.png', 'img/favicon/apple-icon-152x152.png', 'img/favicon/apple-icon-180x180.png', 'img/favicon/android-icon-192x192.png', 'img/favicon/favicon-32x32.png', 'img/favicon/favicon-96x96.png', 'img/favicon/favicon-16x16.png', 'img/favicon/ms-icon-144x144.png', 'img/favicon/ms-icon-70x70.png', 'img/favicon/ms-icon-150x150.png', 'img/favicon/ms-icon-310x310.png', 'img/favicon/android-icon-512x512.png', 'img/favicon/favicon.ico', 'img/1-380_small.jpg', 'img/1-512_medium.jpg', 'img/1-800_large.jpg', 'img/2-380_small.jpg', 'img/2-512_medium.jpg', 'img/2-800_large.jpg', 'img/3-380_small.jpg', 'img/3-512_medium.jpg', 'img/3-800_large.jpg', 'img/4-380_small.jpg', 'img/4-512_medium.jpg', 'img/4-800_large.jpg', 'img/5-380_small.jpg', 'img/5-512_medium.jpg', 'img/5-800_large.jpg', 'img/6-380_small.jpg', 'img/6-512_medium.jpg', 'img/6-800_large.jpg', 'img/7-380_small.jpg', 'img/7-512_medium.jpg', 'img/7-800_large.jpg', 'img/8-380_small.jpg', 'img/8-512_medium.jpg', 'img/8-800_large.jpg', 'img/9-380_small.jpg', 'img/9-512_medium.jpg', 'img/9-800_large.jpg', 'img/10-380_small.jpg', 'img/10-512_medium.jpg', 'img/10-800_large.jpg'];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(staticCacheName).then(function (cache) {
    return cache.addAll(filesToCache);
  }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (cacheNames) {
    return Promise.all(cacheNames.filter(function (cacheName) {
      return cacheName.startsWith('mws-') && cacheName != staticCacheName;
    }).map(function (cacheName) {
      return caches.delete(cacheName);
    })).then(() => {
      console.log('Service worker active');
    });
  }));
});

self.addEventListener('fetch', function (event) {
  event.respondWith(caches.match(event.request).then(function (response) {
    return response || fetch(event.request);
  }));
});

self.addEventListener('message', function (event) {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

//Based on https://github.com/WICG/BackgroundSync/blob/master/explainer.md
self.addEventListener('sync', function (event) {
  switch (event.tag) {
    case 'review':
      event.waitUntil(sendAllReviews());
      break;
    case 'favorite':
      event.waitUntil(sendAllFavorites());
      break;
  }
});

/**
 * @description  Send review to server and stores it at database.
 * @constructor
 * @param {object} review - Reviwe object.
 * @param {function} callback - Callback function.
 */
function postReview(review) {
  return fetch(`http://localhost:1337/reviews`, {
    method: 'post',
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(review)
  }).then(response => response.json()).then(review => console.log(review));
}

/**
 * @description  Send review to server and stores it at database.
 * @constructor
 * @param {object} review - Reviwe object.
 * @param {function} callback - Callback function.
 */
function putFavorite(favorite) {
  return fetch(`http://localhost:1337/restaurants/${favorite.restaurant_id}/?is_favorite=${favorite.is_favorite}`, {
    method: 'put',
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(favorite)
  }).then(response => response.json()).then(favorite => console.log(favorite));
}

/**
 * @description  Send all reviews to server
 * @constructor
 */
function sendAllReviews() {
  dbPromise.then(db => {
    if (!db) return;
    return db.transaction(IDB_PENDING_REVIEWS).objectStore(IDB_PENDING_REVIEWS).getAll();
  }).then(reviews => {
    const reviewList = [];
    reviews.forEach(function (review) {
      let rev = {
        'restaurant_id': review.restaurant_id,
        'name': review.name,
        'rating': review.rating,
        'comments': review.comments,
        'createdAt': review.createdAt,
        'updatedAt': review.updatedAt
      };
      reviewList.push(postReview(rev));
    });
    return Promise.all(reviewList);
  }).then(reviews => {
    dbPromise.then(db => {
      if (!db) return;
      const clear = db.transaction(IDB_PENDING_REVIEWS, "readwrite");
      clear.objectStore(IDB_PENDING_REVIEWS).clear();
      return clear.complete;
    });
  }).catch(error => {
    console.error(error);
  });
}

/**
 * @description  Send all reviews to server
 * @constructor
 */
function sendAllFavorites() {
  dbPromise.then(db => {
    if (!db) return;
    return db.transaction(IDB_PENDING_RESTAURANTS).objectStore(IDB_PENDING_RESTAURANTS).getAll();
  }).then(favorites => {
    const favoriteList = [];
    favorites.forEach(function (favorite) {
      favoriteList.push(putFavorite(favorite));
    });
    return Promise.all(favoriteList);
  }).then(favorites => {
    dbPromise.then(db => {
      if (!db) return;
      const clear = db.transaction(IDB_PENDING_RESTAURANTS, "readwrite");
      clear.objectStore(IDB_PENDING_RESTAURANTS).clear();
      return clear.complete;
    });
  }).catch(error => {
    console.error(error);
  });
}

},{"idb":1}]},{},[2])

//# sourceMappingURL=sw.js.map
