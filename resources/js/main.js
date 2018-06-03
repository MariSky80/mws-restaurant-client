const DBHelper = require('./dbhelper');
let restaurants,
  neighborhoods,
  cuisines;
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
document.addEventListener('DOMContentLoaded', (event) => {
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
window.addEventListener('resize', (event) =>{
  initMap();
});


/**
  * @description Call functions when service worker is online.
  * @constructor
  * @param {string} online - String detected.
  * @param {event} event - Event called
  */
 window.addEventListener('online',(event)=>{
   event.preventDefault();
   DBHelper.showMessage(event.type);
 });


 /**
   * @description Call functions when service worker is offline.
   * @constructor
   * @param {string} offline - String detected.
   * @param {event} event - Event called
   */
 window.addEventListener('offline',(event)=>{
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
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}


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
}


/**
* @description  fetch all cuisines and set their HTML.
* @constructor
* @param {object} error - error object.
* @param {object} cuisines - cuisines list.
*/
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}


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
}


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
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
}


/**
* @description  Clear current restaurants, their HTML and remove their map markers.
* @constructor
* @param {object} restaurants - restaurants list.
*/
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  if(self.markers !== undefined) {
    self.markers.forEach(m => m.setMap(null));
  }
  self.markers = [];
  self.restaurants = restaurants;

}


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
}


/**
* @description Create restaurant HTML.
* @constructor
* @param {object} restaurant - restaurants object.
*/
createRestaurantHTML = (restaurant) => {
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
  svg.setAttribute('class','svg-fav');
  svg.setAttribute('viewBox','0 0 576 512');
  svg.setAttribute('aria-labelledby', `title-${restaurant.id} description-${restaurant.id}`);

  const title = document.createElementNS('http://www.w3.org/2000/svg', "title");
  title.setAttribute('id', `title-${restaurant.id}`);

  const desc = document.createElementNS('http://www.w3.org/2000/svg', "desc");
  desc.setAttribute('id', `description-${restaurant.id}`);
  desc.innerHTML = 'Favorite image';

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('class','path-fav');
  path.setAttribute('role','presentation');

  self.is_favorite = (restaurant.is_favorite == 'true') ? true : false;
  if( self.is_favorite ) {
    link.title = 'Remove favorite';
    link.setAttribute('aria-label', 'Remove favorite');
    link.dataset.favorite = 'remove';
    title.innerHTML = 'Remove favorite';
    path.setAttribute("d","M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z");
  } else {
    link.title = 'Add to favorite';
    link.setAttribute('aria-label', 'Add to favorite');
    link.dataset.favorite = 'add';
    title.innerHTML = 'Add to favorite';
    path.setAttribute("d","M528.1 171.5L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6zM388.6 312.3l23.7 138.4L288 385.4l-124.3 65.3 23.7-138.4-100.6-98 139-20.2 62.2-126 62.2 126 139 20.2-100.6 98z");
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
  li.append(more)

  return li
}


/**
* @description  Depends of resolutions initalize image map or google map.
* @constructor
*/
window.initMap = () => {
  if(window.innerWidth < 641) {
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
}


/**
* @description  Initialize Google map, called from HTML.
* @constructor
*/
displayMap = () => {
  if(self.staticMap === false) {
    return;
  }
  let googleMap = document.getElementById('map');
  googleMap.style.display = 'block';
  self.staticMap = false;

  let loc = {
    lat: 40.722216,
    lng: -73.987501
  }
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
}


/**
* @description  Display Static map at Mobile resolutions.
* @constructor
*/
displayStaticMap = () => {
  if(self.staticMap === true) {
    return;
  }

  let imageMap = document.getElementById('static-map');
  imageMap.style.display = 'block';

  imageMap.setAttribute('src',`https://maps.googleapis.com/maps/api/staticmap?center=40.722216,-73.987501&zoom=12&size=${window.innerWidth}x400&format=jpg&maptype=roadmap&markers=color:red`);
  self.staticMap = true;

  imageMap.addEventListener('click',function(e) {
    e.preventDefault();
    imageMap.style.display ='none';
    displayMap();
  });
}


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
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
}


/**
 * @description Calls click event of favorite/unfavorite button.
 * @constructor
 * @param {integer} id - restaurant identifier.
 * @param {object} link  - Link to add the event listener.
 */
 eventListenerFavorite = (link, id) => {
   link.addEventListener('click', function(e) {
     event.preventDefault();
     self.is_favorite = (this.dataset.favorite == 'add') ? true : false;
     DBHelper.putFavorite(id, self.is_favorite, (error, result) => {
       if (!result) {
         console.error(error);
         return;
       }
       self.restaurants.forEach(restaurant => {
         if( restaurant.id == id ) {
           restaurant.is_favorite = self.is_favorite ? 'true' : 'false';
         }
       });

       if( self.is_favorite ) {
         link.title = 'Remove favorite';
         link.setAttribute('aria-label', 'Remove favorite');
         link.dataset.favorite = 'remove';
         link.getElementsByTagName('title')[0].innerHTML = 'Remove favorite';
         link.getElementsByTagName('path')[0].setAttribute("d","M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z");
       } else {
         link.title = 'Add to favorite';
         link.setAttribute('aria-label', 'Add to favorite');
         link.dataset.favorite = 'add';
         link.getElementsByTagName('title')[0].innerHTML = 'Add to favorite';
         link.getElementsByTagName('path')[0].setAttribute("d","M528.1 171.5L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6zM388.6 312.3l23.7 138.4L288 385.4l-124.3 65.3 23.7-138.4-100.6-98 139-20.2 62.2-126 62.2 126 139 20.2-100.6 98z");
       }
     });
   });
 }
