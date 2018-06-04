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
let tagName = '';

/**
 * @description  Common database helper functions.
 * @constructor
 */
class DBHelper {
  /**
   * @description  Database URL. Change this to restaurants.json file location on your server.
   * @constructor
   */
  static get RESTAURANTS_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  /**
   * @description  Database URL. Change this to restaurants.json file location on your server.
   * @constructor
   */
  static get REVIEWS_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/reviews`;
  }

  /**
   * @description  Open database.
   * @constructor
   */
  static openIndexedDB() {
    // If the browser doesn't support service worker,
    // we don't care about having a database
    if (!navigator.serviceWorker) {
      return Promise.resolve();
    }

    this.dbPromise = idb.open(IDB_DB, 2, function (upgradeDb) {
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
  }

  /**
   * @description  Save data restaurant.
   * @constructor
   * @param {object} Object list - Object like restaurant, reveiw, ...
   */
  static storeIndexedDB(table, objects) {
    this.dbPromise.then(function (db) {
      if (!db) return;

      let tx = db.transaction(table, 'readwrite');
      const store = tx.objectStore(table);
      if (Array.isArray(objects)) {
        objects.forEach(function (object) {
          store.put(object);
        });
      } else {
        store.put(objects);
      }
    });
  }

  /**
   * @description  Get a collection of objects from indexedDB.
   * @constructor
   */
  static getStoredObjects(table) {
    return this.dbPromise.then(function (db) {
      if (!db) return;
      const store = db.transaction(table).objectStore(table);
      return store.getAll();
    });
  }

  /**
   * @description  Get object from indexedDB by index
   * @constructor {int} id - Restaurant id
   */
  static getStoredObjectById(table, idx, id) {
    return this.dbPromise.then(function (db) {
      if (!db) return;

      const store = db.transaction(table).objectStore(table);
      const indexId = store.index(idx);
      return indexId.getAll(id);
    });
  }

  /**
   * @description  Fetch all restaurants.
   * @constructor
   * @param {function} callback - Callback function.
   */
  static fetchRestaurants(callback) {
    fetch(DBHelper.RESTAURANTS_URL).then(response => response.json()).then(restaurants => {
      DBHelper.storeIndexedDB(IDB_RESTAURANTS, restaurants);
      callback(null, restaurants);
    }).catch(error => {
      DBHelper.getStoredObjects(IDB_RESTAURANTS).then(storedRestaurants => {
        callback(null, storedRestaurants);
      }).catch(error => {
        callback(error, null);
      });
    });
  }

  /**
   * @description  Fetch a restaurant by its ID.
   * @constructor
   * @param {int} id - Restaurant identifier.
   * @param {function} callback - Callback function.
   */
  static fetchRestaurantById(id, callback) {
    fetch(`${DBHelper.RESTAURANTS_URL}/${id}`).then(response => response.json()).then(restaurant => {
      DBHelper.storeIndexedDB(IDB_RESTAURANTS, restaurant);
      callback(null, restaurant);
    }).catch(error => {
      DBHelper.getStoredObjectById(IDB_RESTAURANTS, 'by-id', id).then(storedRestaurant => {
        callback(null, storedRestaurant);
      }).catch(error => {
        callback(error, null);
      });
    });
  }

  /**
   * @description  Fetch restaurants by a cuisine type with proper error handling.
   * @constructor
   * @param {string} cuisine - Neighborhood selected.
   * @param {function} callback - Callback function.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * @description  Fetch restaurants by a neighborhood with proper error handling.
   * @constructor
   * @param {string} neighborhood - Neighborhood selected.
   * @param {function} callback - Callback function.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * @description  Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   * @constructor
   * @param {string} cuisine - Cuisine selected.
   * @param {string} neighborhood - Neighborhood selected.
   * @param {function} callback - Callback function.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants;
        if (cuisine != 'all') {
          // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') {
          // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * @description  Fetch all neighborhoods with proper error handling.
   * @constructor
   * @param {function} callback - Callback function.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * @description  Fetch all cuisines with proper error handling.
   * @constructor
   * @param {function} callback - Callback function.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i);
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
  * @description  Fetch all reviews.
  * @constructor
  * @param {function} callback - Callback function.
  */
  static fetchReviews(callback) {
    fetch(DBHelper.REVIEWS_URL).then(response => response.json()).then(reviews => {
      DBHelper.storeIndexedDB(IDB_REVIEWS, reviews);
      callback(null, reviews);
    }).catch(error => {
      DBHelper.getStoredObjects(IDB_REVIEWS).then(storedReviews => {
        callback(null, storedReviews);
      }).catch(error => {
        callback(error, null);
      });
    });
  }

  /**
   * @description  Fetch a review by its ID.
   * @constructor
   * @param {int} id - Reviews identifier.
   * @param {function} callback - Callback function.
   */
  static fetchReviewsById(id, callback) {
    fetch(`${DBHelper.REVIEWS_URL}/${id}`).then(response => response.json()).then(review => {
      DBHelper.storeIndexedDB(IDB_REVIEWS, review);
      callback(null, review);
    }).catch(error => {
      DBHelper.getStoredObjectById(IDB_REVIEWS, 'by-id', id).then(storedReview => {
        callback(null, storedReview);
      }).catch(error => {
        callback(error, null);
      });
    });
  }

  /**
   * @description  Fetch all restaurant reviews by restaurant ID.
   * @constructor
   * @param {int} id - Restaurant identifier.
   * @param {function} callback - Callback function.
   */
  static fetchReviewsByRestId(id, callback) {
    fetch(`${DBHelper.REVIEWS_URL}/?restaurant_id=${id}`).then(response => response.json()).then(reviews => {
      DBHelper.storeIndexedDB(IDB_REVIEWS, reviews);
      callback(null, reviews);
    }).catch(error => {
      DBHelper.getStoredObjectById(IDB_REVIEWS, 'by-restaurant-id', id).then(storedReviews => {
        callback(null, storedReviews);
      }).catch(error => {
        callback(error, null);
      });
    });
  }

  /**
   * @description  Send review to server and stores it at database.
   * @constructor
   * @param {object} review - Reviwe object.
   * @param {function} callback - Callback function.
   */
  static postReview(review, callback) {
    fetch(DBHelper.REVIEWS_URL, {
      method: 'post',
      body: review
    }).then(response => response.json()).then(review => {
      DBHelper.storeIndexedDB(IDB_REVIEWS, review);
      callback(null, review);
    }).catch(error => {
      //Error sending review to server.
      DBHelper.tagName = 'review';
      DBHelper.addSyncServiceWorker();
      DBHelper.storeIndexedDB(IDB_REVIEWS, review);
      DBHelper.storeIndexedDB(IDB_PENDING_REVIEWS, JSON.parse(review));
      callback(null, review);
    });
  }

  /**
   * @description  Send request favorite/unfavorite to server and changes at database.
   * @constructor
   * @param {int} id - Restaurant identifier.
   * @param {boolean} favorite - True to mark as favorite, otherwise false.
   * @param {function} callback - Callback function.
   */
  static putFavorite(id, favorite, callback) {
    fetch(`${DBHelper.RESTAURANTS_URL}/${id}/?is_favorite=${favorite}`, {
      method: 'put',
      body: favorite
    }).then(response => response.json()).then(favorite => {
      DBHelper.storeIndexedDB(IDB_RESTAURANTS, favorite);
      callback(null, favorite);
    }).catch(error => {
      //Error sending favorite/unfavorite to server.
      DBHelper.tagName = 'favorite';
      DBHelper.addSyncServiceWorker();
      DBHelper.storeIndexedDB(IDB_RESTAURANTS, favorite);
      DBHelper.storeIndexedDB(IDB_PENDING_RESTAURANTS, JSON.parse(favorite));
      callback(null, favorite);
    });
  }

  /**
   * @description  Restaurant page URL.
   * @constructor
   * @param {object} restaurant - Restaurant information.
   */
  static urlForRestaurant(restaurant) {
    return `./restaurant.html?id=${restaurant.id}`;
  }

  /**
   * @description Restaurant image URL.
   * @constructor
   * @param {object} restaurant - Restaurant information.
   */
  static imageUrlForRestaurant(restaurant) {
    let photograph = 'photograph' in restaurant ? restaurant.photograph : restaurant.id;
    return `./img/${photograph}`;
  }

  /**
   * @description Map marker for a restaurant.
   * @constructor
   * @param {object} restaurant - Restaurant coords and name.
   * @param {object} map - Google map object.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP });
    return marker;
  }

  /**
   * @description Register ServiceWorker.
   * @constructor
   */
  static registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').then(reg => {
        console.log(`Service Worker registration successful. Its scope is ${reg.scope} `);
      }).catch(error => {
        console.log(`Service Worker registration error: ${error}`);
      });
    }
  }

  /**
   * @description Register ServiceWorker.
   * @constructor
   */
  static addSyncServiceWorker() {
    navigator.serviceWorker.ready.then(function (registration) {
      registration.sync.register(DBHelper.tagName).then(function () {
        console.log(`Registration ${DBHelper.tagName} succeeded.`);
      }, function () {
        console.error(`Registration ${DBHelper.tagName} failed!`);
      });
    });
  }

  /**
    * @description Show or hide message when Service Worker is online o offline.
    * @constructor
    * @param {string} offline - String detected.
    * @param {event} event - Event called
    */
  static showMessage(type) {
    let message = document.getElementById('sw-message');
    switch (type) {
      case 'online':
        message.style.display = 'none';
        break;
      case 'offline':
        message.style.display = 'block';
        break;
    }
  }

}
module.exports = DBHelper;

},{"idb":1}],3:[function(require,module,exports){
const DBHelper = require('./dbhelper');
let restaurants, neighborhoods, cuisines;
let map;
let markers = [];
let staticMap = false;
let is_favorite;

/**
  * @description Call functions when DOM content is loaded
  * @constructor
  * @param {string} DOMContentLoaded - String detected.
  * @param {event} event - Event called
  */
document.addEventListener('DOMContentLoaded', event => {
  DBHelper.registerServiceWorker();
  DBHelper.openIndexedDB();
  fetchNeighborhoods();
  fetchCuisines();
});

/**
  * @description Call functions when window is resized
  * @constructor
  * @param {string} resize - String detected.
  * @param {event} event - Event called
  */
window.addEventListener('resize', event => {
  initMap();
});

/**
  * @description Call functions when service worker is online.
  * @constructor
  * @param {string} online - String detected.
  * @param {event} event - Event called
  */
window.addEventListener('online', event => {
  event.preventDefault();
  DBHelper.showMessage(event.type);
});

/**
  * @description Call functions when service worker is offline.
  * @constructor
  * @param {string} offline - String detected.
  * @param {event} event - Event called
  */
window.addEventListener('offline', event => {
  event.preventDefault();
  DBHelper.showMessage(event.type);
});

/**
 * @description  Fetch all neighborhoods and set their HTML.
 * @constructor
 * @param {object} error - error object.
 * @param {object} neighborhoods - neighborhood list.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) {
      // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
};

/**
* @description  Set neighborhoods HTML.
* @constructor
* @param {object} neighborhoods - neighborhood list.
*/
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
};

/**
* @description  fetch all cuisines and set their HTML.
* @constructor
* @param {object} error - error object.
* @param {object} cuisines - cuisines list.
*/
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) {
      // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
};

/**
* @description  Set cuisines HTML.
* @constructor
* @param {object} cuisines - cuisines list.
*/
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
};

/**
* @description  Update page and map for current restaurants.
* @constructor
*/
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) {
      // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  });
};

/**
* @description  Clear current restaurants, their HTML and remove their map markers.
* @constructor
* @param {object} restaurants - restaurants list.
*/
resetRestaurants = restaurants => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  if (self.markers !== undefined) {
    self.markers.forEach(m => m.setMap(null));
  }
  self.markers = [];
  self.restaurants = restaurants;
};

/**
* @description Create all restaurants HTML and add them to the webpage.
* @constructor
* @param {object} restaurants - restaurants created.
*/
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
};

/**
* @description Create restaurant HTML.
* @constructor
* @param {object} restaurant - restaurants object.
*/
createRestaurantHTML = restaurant => {
  const li = document.createElement('li');

  const img = DBHelper.imageUrlForRestaurant(restaurant);
  const picture = document.createElement('picture');
  picture.className = 'restaurant-img';
  picture.setAttribute('aria-labelledby', `picture_${restaurant.id}`);
  picture.setAttribute('role', 'img');

  const sourceSmall = document.createElement('source');
  sourceSmall.setAttribute('media', '(max-width:480px)');
  sourceSmall.setAttribute('srcset', `${img}-380_small.jpg`);
  picture.append(sourceSmall);

  const sourceMedium = document.createElement('source');
  sourceMedium.setAttribute('media', '(min-width: 480px) and (max-width: 960px)');
  sourceMedium.setAttribute('srcset', `${img}-512_medium.jpg`);
  picture.append(sourceMedium);

  const sourceLarge = document.createElement('source');
  sourceLarge.setAttribute('media', '(min-width:961px)');
  sourceLarge.setAttribute('srcset', `${img}-800_large.jpg`);
  picture.append(sourceLarge);

  const image = document.createElement('img');
  image.id = `picture_${restaurant.id}`;
  image.className = 'restaurant-img';
  image.alt = `Picture of ${restaurant.name} restaurant`;
  image.src = `${img}-380_small.jpg`;

  picture.append(image);

  li.append(picture);

  const name = document.createElement('h2');
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const favorite = document.createElement('div');
  favorite.className = 'fav';
  const link = document.createElement('a');
  link.className = 'favorite';
  link.setAttribute('role', 'button');
  link.setAttribute('tabindex', '0');
  eventListenerFavorite(link, restaurant.id);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'svg-fav');
  svg.setAttribute('viewBox', '0 0 576 512');
  svg.setAttribute('aria-labelledby', `title-${restaurant.id} description-${restaurant.id}`);

  const title = document.createElementNS('http://www.w3.org/2000/svg', "title");
  title.setAttribute('id', `title-${restaurant.id}`);

  const desc = document.createElementNS('http://www.w3.org/2000/svg', "desc");
  desc.setAttribute('id', `description-${restaurant.id}`);
  desc.innerHTML = 'Favorite image';

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('class', 'path-fav');
  path.setAttribute('role', 'presentation');

  self.is_favorite = restaurant.is_favorite == 'true' ? true : false;
  if (self.is_favorite) {
    link.title = 'Remove favorite';
    link.setAttribute('aria-label', 'Remove favorite');
    link.dataset.favorite = 'remove';
    title.innerHTML = 'Remove favorite';
    path.setAttribute("d", "M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z");
  } else {
    link.title = 'Add to favorite';
    link.setAttribute('aria-label', 'Add to favorite');
    link.dataset.favorite = 'add';
    title.innerHTML = 'Add to favorite';
    path.setAttribute("d", "M528.1 171.5L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6zM388.6 312.3l23.7 138.4L288 385.4l-124.3 65.3 23.7-138.4-100.6-98 139-20.2 62.2-126 62.2 126 139 20.2-100.6 98z");
  }

  svg.appendChild(title);
  svg.appendChild(desc);
  svg.appendChild(path);
  link.append(svg);
  favorite.append(link);
  li.append(favorite);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.setAttribute('class', 'details');
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more);

  return li;
};

/**
* @description  Depends of resolutions initalize image map or google map.
* @constructor
*/
window.initMap = () => {
  if (window.innerWidth < 641) {
    var googleMap = document.getElementById('map');
    googleMap.style.display = 'none';
    displayStaticMap();
    self.staticMap = true;
  } else {
    var imageMap = document.getElementById('static-map');
    imageMap.style.display = 'none';
    displayMap();
    self.staticMap = false;
  }
};

/**
* @description  Initialize Google map, called from HTML.
* @constructor
*/
displayMap = () => {
  if (self.staticMap === false) {
    return;
  }
  let googleMap = document.getElementById('map');
  googleMap.style.display = 'block';
  self.staticMap = false;

  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
};

/**
* @description  Display Static map at Mobile resolutions.
* @constructor
*/
displayStaticMap = () => {
  if (self.staticMap === true) {
    return;
  }

  let imageMap = document.getElementById('static-map');
  imageMap.style.display = 'block';

  imageMap.setAttribute('src', `https://maps.googleapis.com/maps/api/staticmap?center=40.722216,-73.987501&zoom=12&size=${window.innerWidth}x400&format=jpg&maptype=roadmap&markers=color:red`);
  self.staticMap = true;

  imageMap.addEventListener('click', function (e) {
    e.preventDefault();
    imageMap.style.display = 'none';
    displayMap();
  });
};

/**
* @description Add markers for current restaurants to the map.
* @constructor
* @param {object} restaurants - restaurants list.
*/
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url;
    });
    self.markers.push(marker);
  });
};

/**
 * @description Calls click event of favorite/unfavorite button.
 * @constructor
 * @param {integer} id - restaurant identifier.
 * @param {object} link  - Link to add the event listener.
 */
eventListenerFavorite = (link, id) => {
  link.addEventListener('click', function (e) {
    event.preventDefault();
    self.is_favorite = this.dataset.favorite == 'add' ? true : false;
    DBHelper.putFavorite(id, self.is_favorite, (error, result) => {
      if (!result) {
        console.error(error);
      }
      self.restaurants.forEach(restaurant => {
        if (restaurant.id == id) {
          restaurant.is_favorite = self.is_favorite ? 'true' : 'false';
        }
      });

      if (self.is_favorite) {
        link.title = 'Remove favorite';
        link.setAttribute('aria-label', 'Remove favorite');
        link.dataset.favorite = 'remove';
        link.getElementsByTagName('title')[0].innerHTML = 'Remove favorite';
        link.getElementsByTagName('path')[0].setAttribute("d", "M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z");
      } else {
        link.title = 'Add to favorite';
        link.setAttribute('aria-label', 'Add to favorite');
        link.dataset.favorite = 'add';
        link.getElementsByTagName('title')[0].innerHTML = 'Add to favorite';
        link.getElementsByTagName('path')[0].setAttribute("d", "M528.1 171.5L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6zM388.6 312.3l23.7 138.4L288 385.4l-124.3 65.3 23.7-138.4-100.6-98 139-20.2 62.2-126 62.2 126 139 20.2-100.6 98z");
      }
    });
  });
};

},{"./dbhelper":2}]},{},[3])

//# sourceMappingURL=bundle_main.js.map
