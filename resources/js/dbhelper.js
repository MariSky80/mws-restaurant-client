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
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  /**
   * @description  Database URL. Change this to restaurants.json file location on your server.
   * @constructor
   */
   static get REVIEWS_URL() {
     const port = 1337 // Change this to your server port
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
          pendingRestaurants.createIndex('by-id', 'id', {unique:true});

          const pendingReviews = upgradeDb.createObjectStore(IDB_PENDING_REVIEWS, {
            keyPath:'id', autoIncrement:true
          });
          pendingReviews.createIndex('by-id', 'id', {unique:true});
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
      if(!db) return;

      let tx = db.transaction(table, 'readwrite');
      const store = tx.objectStore(table);
      if (Array.isArray(objects)) {
        objects.forEach(function(object){
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
    return this.dbPromise.then(function(db) {
      if(!db) return;
      const store = db.transaction(table).objectStore(table);
      return store.getAll();
    })
  }


  /**
   * @description  Get object from indexedDB by index
   * @constructor {int} id - Restaurant id
   */
  static getStoredObjectById(table, idx, id) {
    return this.dbPromise.then(function(db) {
      if(!db) return;

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
    fetch(DBHelper.RESTAURANTS_URL)
      .then(response => response.json())
      .then(restaurants => {
        DBHelper.storeIndexedDB(IDB_RESTAURANTS, restaurants);
        callback(null, restaurants);
      })
      .catch(error => {
        DBHelper.getStoredObjects(IDB_RESTAURANTS)
        .then((storedRestaurants) => {
          callback(null, storedRestaurants);
        }).catch(error => {
          callback(error, null);
        })
      });
  }


 /**
  * @description  Fetch a restaurant by its ID.
  * @constructor
  * @param {int} id - Restaurant identifier.
  * @param {function} callback - Callback function.
  */
  static fetchRestaurantById(id, callback) {
    fetch(`${DBHelper.RESTAURANTS_URL}/${id}`)
      .then(response => response.json())
      .then(restaurant => {
        DBHelper.storeIndexedDB(IDB_RESTAURANTS, restaurant);
        callback(null, restaurant);
      })
      .catch(error => {
        DBHelper.getStoredObjectById(IDB_RESTAURANTS, 'by-id' ,id)
        .then((storedRestaurant) => {
          callback(null, storedRestaurant);
        }).catch(error => {
          callback(error, null);
        })
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
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
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
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
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
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
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
    fetch(DBHelper.REVIEWS_URL)
      .then(response => response.json())
      .then(reviews => {
        DBHelper.storeIndexedDB(IDB_REVIEWS, reviews);
        callback(null, reviews);
      })
      .catch(error => {
        DBHelper.getStoredObjects(IDB_REVIEWS)
        .then((storedReviews) => {
          callback(null, storedReviews);
        }).catch(error => {
          callback(error, null);
        })
      });
  }


  /**
   * @description  Fetch a review by its ID.
   * @constructor
   * @param {int} id - Reviews identifier.
   * @param {function} callback - Callback function.
   */
   static fetchReviewsById(id, callback) {
     fetch(`${DBHelper.REVIEWS_URL}/${id}`)
       .then(response => response.json())
       .then(review => {
         DBHelper.storeIndexedDB(IDB_REVIEWS, review);
         callback(null, review)
       })
       .catch(error => {
         DBHelper.getStoredObjectById(IDB_REVIEWS, 'by-id', id)
         .then((storedReview) => {
           callback(null, storedReview);
         }).catch(error => {
           callback(error, null);
         })
       });
   }


 /**
  * @description  Fetch all restaurant reviews by restaurant ID.
  * @constructor
  * @param {int} id - Restaurant identifier.
  * @param {function} callback - Callback function.
  */
  static fetchReviewsByRestId(id, callback) {
    fetch(`${DBHelper.REVIEWS_URL}/?restaurant_id=${id}`)
      .then(response => response.json())
      .then(reviews => {
        DBHelper.storeIndexedDB(IDB_REVIEWS, reviews);
        callback(null, reviews)
      })
      .catch(error => {
        DBHelper.getStoredObjectById(IDB_REVIEWS, 'by-restaurant-id', id)
        .then((storedReviews) => {
          callback(null, storedReviews);
        }).catch(error => {
          callback(error, null);
        })
      });
  }


  /**
   * @description  Send review to server and stores it at database.
   * @constructor
   * @param {object} review - Reviwe object.
   * @param {function} callback - Callback function.
   */
  static postReview(review, callback) {
    fetch(DBHelper.REVIEWS_URL,
      {
        method:'post',
        body:review
      })
      .then(response => response.json())
      .then(review => {
        DBHelper.storeIndexedDB(IDB_REVIEWS, review);
        callback(null, review);
      })
      .catch(error => {
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
    fetch(`${DBHelper.RESTAURANTS_URL}/${id}/?is_favorite=${favorite}`,
      {
        method:'put',
        body:favorite
      })
      .then(response => response.json())
      .then(favorite => {
        DBHelper.storeIndexedDB(IDB_RESTAURANTS, favorite);
        callback(null, favorite);
      })
      .catch(error => {
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
    return (`./restaurant.html?id=${restaurant.id}`);
  }


 /**
  * @description Restaurant image URL.
  * @constructor
  * @param {object} restaurant - Restaurant information.
  */
  static imageUrlForRestaurant(restaurant) {
    let photograph = ('photograph' in restaurant) ? restaurant.photograph : restaurant.id;
    return (`./img/${photograph}`);
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
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }


 /**
  * @description Register ServiceWorker.
  * @constructor
  */
  static registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js')
        .then((reg) => {
          console.log(`Service Worker registration successful. Its scope is ${reg.scope} `);
        }).catch((error) => {
          console.log(`Service Worker registration error: ${error}`);
        });
    }
  }

  /**
   * @description Register ServiceWorker.
   * @constructor
   */
   static addSyncServiceWorker() {
     navigator.serviceWorker.ready.then(function(registration) {
       registration.sync.register(DBHelper.tagName).then(function() {
         console.log(`Registration ${DBHelper.tagName} succeeded.`);
       }, function() {
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
      switch(type) {
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
