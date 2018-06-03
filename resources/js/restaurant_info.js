const DBHelper = require('./dbhelper');
let restaurant;
let reviews;
let is_favorite;
let map;
let staticMap = false;
const MONTH = {
  0: 'January',
  1: 'February',
  2: 'March',
  3: 'April',
  4: 'May',
  5: 'June',
  6: 'July',
  7: 'August',
  8: 'September',
  9: 'October',
  10: 'November',
  11: 'December'
};

/**
  * @description Call functions when DOM content is loaded
  * @constructor
  * @param {string} DOMContentLoaded - String detected.
  * @param {event} event - Event called
  */
document.addEventListener('DOMContentLoaded', (event) => {
  DBHelper.registerServiceWorker();
  DBHelper.openIndexedDB();
  eventListenerSubmitedReview();
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
 * @description  Fetch reviews by restaurant id and set their HTML.
 * @constructor
 * @param {object} error - error object.
 * @param {object} neighborhoods - neighborhood list.
 */
fetchReviewsByRestId = (id) => {
  DBHelper.fetchReviewsByRestId(id, (error, reviews) => {
    self.reviews = reviews;
    if (!reviews) {
      console.error(error);
      return;
    } else {
      fillReviewsHTML();
    }
  });
}


/**
  * @description Get current restaurant from page URL.
  * @constructor
  * @param {callback} callback - Callback returned.
  */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      if (!restaurant) {
        console.error(error);
        return;
      }
      self.restaurant = restaurant;
      self.is_favorite = (restaurant.is_favorite == 'true') ? true: false;addEventListener
      fillRestaurantHTML();
      callback(null, restaurant);
    });
  }
}


/**
 * @description Create restaurant HTML and add it to the webpage.
 * @constructor
 * @param {object} restaurant - All restaurant info.
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const favorite = document.getElementById('favorite');
  const link = document.createElement('a');
  link.className = 'favorite';
  link.setAttribute('role', 'button');
  link.setAttribute('tabindex', '0');
  eventListenerFavorite(link);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class','svg-fav');
  svg.setAttribute('viewBox','0 0 576 512');
  svg.setAttribute('aria-labelledby','title description');

  const title = document.createElementNS('http://www.w3.org/2000/svg', "title");
  title.setAttribute('id', 'title');

  const desc = document.createElementNS('http://www.w3.org/2000/svg', "desc");
  desc.setAttribute('id', 'description');
  desc.innerHTML = 'Favorite image';

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('class','path-fav');
  path.setAttribute('role','presentation');

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

  const img = DBHelper.imageUrlForRestaurant(restaurant);
  const picture = document.getElementById('restaurant-picture');
  picture.className = 'restaurant-img';
  picture.setAttribute('aria-labelledby', `restaurant-img`);
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

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img';
  image.alt = `Picture of ${restaurant.name} restaurant`;
  image.src = `${img}-380_small.jpg`;

  picture.append(image);

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }

  fetchReviewsByRestId(restaurant.id);
}


/**
  * @description Create restaurant operating hours HTML table and add it to the webpage.
  * @constructor
  * @param {object} operatingHours - All restaurant operating hours.
  */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}


/**
 * @description Create all reviews HTML and add them to the webpage.
 * @constructor
 * @param {object} reviews - All reviews related to a restaurant.
 */
fillReviewsHTML = (reviews = self.reviews) => {

  if (!reviews) {
    fetchReviewsByRestId(self.restaurant.id);
  }
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h3');
  title.innerHTML = '';
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  ul.innerHTML = '';

  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}


/**
 * @description Create review HTML and add it to the webpage.
 * @constructor
 * @param {object} review - One reveiw from a restaurant.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  let fullDate = new Date(review.createdAt);
  date.innerHTML	= `${MONTH[fullDate.getMonth()]} ${fullDate.getDate()}, ${fullDate.getFullYear()}`;
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}


/**
 * @description Add restaurant name to the breadcrumb navigation menu.
 * @constructor
 * @param {object} restaurant - Restaurant information.
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * @description Get a parameter by name from page URL.
 * @constructor
 * @param {string} name - parameter name
 * @param {string} url - url requested
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
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
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      let googleMap = document.getElementById('map');
      googleMap.style.display = 'block';
      self.staticMap = false;

      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });

      DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    }
  });

}


/**
* @description  Display Static map at Mobile resolutions.
* @constructor
*/
displayStaticMap = () => {
  if(self.staticMap === true) {
    return;
  }
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      let imageMap = document.getElementById('static-map');
      imageMap.style.display = 'block';
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
      imageMap.setAttribute('src',`https://maps.googleapis.com/maps/api/staticmap?center=${restaurant.latlng.lat},${restaurant.latlng.lng}&size=${window.innerWidth}x400&format=jpg&maptype=roadmap&markers=color:red|${restaurant.latlng.lat},${restaurant.latlng.lng}&key=AIzaSyCtvz3BAT5-XChlZ_dhuW3GAglJeHk_2Os`);
      self.staticMap = true;
      imageMap.addEventListener('click',function(e) {
        e.preventDefault();
        imageMap.style.display ='none';
        displayMap();
      });
    }
  });
}


/**
 * @description Calls click event of submited button.
 * @constructor
 */
eventListenerSubmitedReview = () => {
  let submitReview = document.getElementById('submit');
  submitReview.addEventListener('click',function(e) {
    e.preventDefault();
    const alert = document.getElementById('alert');
    alert.innerHTML = '';
    alert.style.display = 'none';
    const success = document.getElementById('success');
    success.style.display = 'none';

    let review = {
      'restaurant_id': self.restaurant.id,
      'name': document.getElementById('name').value,
      'rating': document.querySelector('#rating').value,
      'comments': document.getElementById('review').value,
      'createdAt': Date.now(),
      'updatedAt': Date.now()
    }

    if (validateForm(review)) {
      sendReview(review, e);
      success.style.display = 'block';
    } else {
      alert.style.display = 'block';
    }
  });
}


/**
 * @description Validate review form.
 * @constructor
 */
validateForm = (review) => {
  //All fields are required.
  let name = review.name;
  let rating = review.rating;
  let comment = review.review;
  let isValid = true;
  const alert = document.getElementById('alert');
  alert.innerHTML = '';
  let aTitle = document.createElement('p');
  aTitle.innerHTML = 'Please fill required fields:';
  alert.appendChild(aTitle);

  if( name == "" ) {
    isValid =false;
    let aName = document.createElement('p');
    aName.innerHTML = '* Name is required.';
    alert.appendChild(aName);
  }
  if( rating == "" ) {
    isValid =false;
    let aRating = document.createElement('p');
    aRating.innerHTML = '* Review is required';
    alert.appendChild(aRating);
  }
  if( comment == "" ) {
    isValid =false;
    let aReview = document.createElement('p');
    aReview.innerHTML = '* Rating is required';
    alert.appendChild(aReview);
  }
  return isValid;
}


/**
 * @description Create a new review
 * @constructor
 * @param {e} error  - Error handle.
 */
sendReview = (review, e) => {
  DBHelper.postReview(JSON.stringify(review), (error, result) => {
    if (!result) {
      console.error(error);
      return;
    }
    self.reviews.push(review);
    fillReviewsHTML();
  });
}


/**
 * @description Calls click event of favorite/unfavorite button.
 * @constructor
 * @param {object} link  - Link to add the event listener.
 */
eventListenerFavorite = (link) => {
  link.addEventListener('click', function(e) {
    event.preventDefault();
    self.is_favorite = (this.dataset.favorite == 'add') ? true : false;
    DBHelper.putFavorite(self.restaurant.id, self.is_favorite, (error, result) => {
      if (!result) {
        console.error(error);
        return;
      }
      self.restaurant.is_favorite = self.is_favorite ? 'true' : 'false';
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
