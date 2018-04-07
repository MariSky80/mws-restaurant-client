 /**
  * @description  Common database helper functions.
  * @constructor
  */
class DBHelper {

 /**
  * @description  Database URL. Change this to restaurants.json file location on your server.
  * @constructor
  */
  static get DATABASE_URL() {
    const port = 8000 // Change this to your server port
    return `http://localhost:${port}/data/restaurants.json`;
  }


 /**
  * @description  Fetch all restaurants.
  * @constructor
  * @param {function} callback - Callback function.
  */
  static fetchRestaurants(callback) {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', DBHelper.DATABASE_URL);
    xhr.onload = () => {
      if (xhr.status === 200) { // Got a success response from server!
        const json = JSON.parse(xhr.responseText);
        const restaurants = json.restaurants;
        callback(null, restaurants);
      } else { // Oops!. Got an error from server.
        const error = (`Request failed. Returned status of ${xhr.status}`);
        callback(error, null);
      }
    };
    xhr.send();
  }


 /**
  * @description  Fetch a restaurant by its ID.
  * @constructor
  * @param {int} id - Restaurant identifier.
  * @param {function} callback - Callback function.
  */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
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
        let results = restaurants
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
    return (`/img/${restaurant.photograph}`);
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

}
