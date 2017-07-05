var map, places, autocomplete, largeInfowindow, final_zoom, infoWindow, geocoder;
var curAmen, place;
var markers = [];
var neigh, listingVis;
var fourSqList = {};
/**
 * @description Loads the map and applies knockout Bindings
 */
function initMap() {

  map = new google.maps.Map(document.getElementById('map'), {
    mapTypeControl: false
  });

  google.maps.event.addDomListener(window, "resize", function() {
    var center = map.getCenter();
    google.maps.event.trigger(map, "resize");
    map.setCenter(center);
  });

  largeInfowindow = new google.maps.InfoWindow({
    maxWidth: 300
  });

  // Geocoder used to find the latLng of the entered place
  geocoder = new google.maps.Geocoder();

  // Eanbling autocomplete for the search bar
  autocomplete = new google.maps.places.Autocomplete((document.getElementById('places-search')));
  autocomplete.bindTo('bounds', map);


  places = new google.maps.places.PlacesService(map);

  ko.applyBindings(new NeighborhoodViewModel());
  neigh.showListings();
}

/**
 * @description Google maps API request failure Handler
 */
function gErrorHandler() {
  ko.applyBindings(new NeighborhoodViewModel());
  neigh.curentListings(true);
  listingVis.push({
    vis: ko.observable(true),
    title: "Couldn't reach the server please try again",
    vicinity: ""
  });

}

var AmenitiesFunc = function(name, keyWord) {
  this.kw = keyWord;
  this.name = name;
};


/**
 * @description Model View for knockout
 */
var NeighborhoodViewModel = function() {
  neigh = this;

  this.curentListings = ko.observable(false);

  this.mobView = ko.observable(false);

  this.inputLocation = ko.observable("East University Drive, Tempe, AZ");

  this.dynamicVal = ko.observable("");

  listingVis = ko.observableArray([]);

  this.amenities = ko.observableArray([
    new AmenitiesFunc('Hospitals', 'hospital'),
    new AmenitiesFunc("Groceries", "department_store"),
    new AmenitiesFunc("Gym", "gym"),
    new AmenitiesFunc("Schools", "school"),
    new AmenitiesFunc("Restaurants", "restaurant"),
    new AmenitiesFunc("Car Rentals", "car_rental"),
    new AmenitiesFunc("Churches", "church"),
    new AmenitiesFunc("Mosques", "mosque"),
    new AmenitiesFunc("Temples", "hindu_temple"),
  ]);

  this.curAmen = ko.observable("");

  //Handles showing results in smaller viewports. Binded to 'Show Listings' button in smaller view ports
  this.mobTogglelist = function() {
    if (neigh.curentListings()) {
      neigh.curentListings(false);
    } else {
      neigh.curentListings(true);
    }
  };

  //Handles the search request. Binded to 'Go' Button
  this.showListings = function() {

    clearMarkers();

    // Neighborhood of Interest
    var address = neigh.inputLocation();
    // Geocoding the entered Location
    if (address == +'') {
      window.alert('You must enter an area, or address.');
    } else {
      geocoder.geocode({
        address: address,
      }, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          place = results[0];
          curAmen = neigh.curAmen();
          nearby();
        } else {
          window.alert('We could not find that location - try entering ' +
            'a more specific place.');
        }
      });
    }

    if ($(window).width() < 701) {
      neigh.mobView(true);
    } else {
      neigh.curentListings(true);
    }

    // Handles window resizing
    $(window).resize(function() {
      windowDisplay();
    });

  };

  // Filter the results
  this.dynamicKeyup = function() {

    var fill = neigh.dynamicVal().replace("*", "\\*");
    fill = fill.replace("[", "\\[");
    fill = fill.replace("\\", "\\\\");
    fill = "\\b" + fill;
    var Re = new RegExp(fill, 'gi');
    for (var i = 0; i < markers.length; i++) {
      if (!(Re.exec(markers[i].title))) {
        markers[i].setVisible(false);
        listingVis()[i].vis(false);
      } else {
        markers[i].setVisible(true);
        listingVis()[i].vis(true);
      }
    }
  };

  this.listClick = function(i) {
    map.setCenter(markers[i].getPosition());
    populateInfoWindow(markers[i], largeInfowindow);
    map.panTo(markers[i].getPosition());
    if (typeof final_zoom !== "undefined")
      map.setZoom(final_zoom);
  };

};

/**
 * @description Searches for requested amenities in the neighborhood of interest
 */
function nearby() {

  if (place.geometry) {
    map.panTo(place.geometry.location);
    map.setZoom(5);
  }

  var search = {
    bounds: map.getBounds(),
    types: [curAmen]
  };

  places.nearbySearch(search, function(results, status) {

    for (var i = 0; i < results.length; i++) {
      var position = results[i].geometry.location;

      var title = results[i].name;

      var vicinity = results[i].vicinity;

      var marker = new google.maps.Marker({
        position: position,
        title: title,
        animation: google.maps.Animation.DROP,
        id: i,
        vicinity: vicinity,
      });

      if (results[i].photos) {
        marker.photo = results[i].photos[0].getUrl({
          maxHeight: 100,
          maxWidth: 200
        });
      }

      markers.push(marker);
      listingVis.push({
        vis: ko.observable(true),
        title: marker.title,
        vicinity: marker.vicinity,
      });
      fourSq(marker.title, marker.getPosition().toJSON().lat, marker.getPosition().toJSON().lng);
    }

    markers.forEach(function(marker) {
      markerClick(marker);
    });
    buildHtml();
  });
}

/**
 * @description Creates DOM elements to display the results
 */

function buildHtml() {
  var bounds = new google.maps.LatLngBounds();
  for (var i = 0; i < markers.length; i++) {
    markers[i].setMap(map);
    bounds.extend(markers[i].position);
  }
  map.fitBounds(bounds);
  google.maps.event.addDomListener(window, 'resize', function() {
    map.fitBounds(bounds);
  });
  final_zoom = map.getZoom();
}

/**
 * @description Populate the infowindow called upon clicking on marker or listing corresponding to it
 */
function populateInfoWindow(marker, infowindow) {

  // Set Animation for the marker
  marker.setAnimation(google.maps.Animation.BOUNCE);
  // If Infowindow already exists, kill its animation
  if (typeof infowindow.marker != "undefined")
    infowindow.marker.setAnimation(null);

  infowindow.marker = marker;

  var windowContent = '<h4>' + marker.title + '</h4><p>' + marker.vicinity + '</p>';

  windowContent += '<dl id="nytlist"><img width="20" height="20" alt="fourSq logo" src="https://images.vexels.com/media/users/3/137279/isolated/preview/e489b2b3639a9179cf9caa168ca24911-foursquare-icon-logo-by-vexels.png">fourSq Details<br/>';

  if (typeof fourSqList[marker.title].error == "undefined") {
    if (typeof fourSqList[marker.title] !== "undefined") {
      var temp_fourSq = fourSqList[marker.title];
      windowContent += '<dt class=nyarticle> <a href="' + temp_fourSq.url + '"target=_blank> Link to fourSq page</a></dt>';
      if (typeof(temp_fourSq.img) !== "undefined")
        windowContent += '<br><img width="300" alt="Could not load foursquare image" height="200" src="' + temp_fourSq.img + '">';
      windowContent += 'No images found for this place<br><br>';
      if (temp_fourSq.open) {
        windowContent += '<dt> The Place is open</dt>';
      } else {
        windowContent += '<dt> The Place is closed</dt>';
      }
      if (typeof(temp_fourSq.rating) !== "undefined")
        windowContent += '<dt> Rating: ' + temp_fourSq.rating + '</dt>';
      windowContent += '<dt> Number of checkins: ' + temp_fourSq.checkinsCount + '</dt>';
    } else {
      windowContent += '<dt> No details found for this location</dt>';
    }
  } else {
    windowContent += '<dt>'+fourSqList[marker.title].error+'</dt>';
  }
  windowContent += "</dl>";
  infowindow.setContent(windowContent);
  infowindow.open(map, marker);

  infowindow.addListener('closeclick', function() {
    infowindow.marker.setAnimation(null);
  });

}

/**
 * @description Clear the present markers after a new search request is made
 */
function clearMarkers() {
  listingVis([]);
  fourSqList = {};
  for (var i = 0; i < markers.length; i++) {
    if (markers[i]) {
      markers[i].setMap(null);
    }
  }
  markers = [];
}

/**
 * @description Adjust the html based window size
 */
function windowDisplay() {
  if ($(window).width() < 701) {
    neigh.curentListings(false);
    if (markers.length)
      neigh.mobView(true);
  } else {
    if (markers.length) {
      neigh.curentListings(true);
    }
    neigh.mobView(false);
  }
}

/**
 * @description // Add click listener to the marker to pop up InfoWindow
 */
function markerClick(marker) {
  marker.addListener('click', function() {
    map.setCenter(this.getPosition());
    populateInfoWindow(this, largeInfowindow);
    map.panTo(this.getPosition());
    if (typeof final_zoom !== "undefined")
      map.setZoom(final_zoom);
  });
}

function fourSq(place,lat, lng) {
  $.getJSON({
    url: "https://api.foursquare.com/v2/venues/search?v=20161016&ll="+lat+","+lng+"&radius=100&intent=browse&client_id=Y0ZENNXBQKBOMGPPCP2K4PUZSGJOMAN14Z1ENF1MPS1LVRCG&client_secret=1SEY0XIEAMPE5BHANAZV3GELZUI440TOUJBI1URZCCHFDHD0",
    success: (function(data) {
      var pattern = new RegExp("\\b" + place.replace(/ +/g, "\\b.*\\b") + "\\b", "i");
      data.response.venues.forEach(function(result){
        if(result.name.match(pattern)) {
          fourSqData(place,result.id);
        }
      });
      if (typeof(fourSqList[place]) === "undefined"){
        fourSqList[place]= {error : "No Details found for this location"}; // Notify if no details were found on foursquare
      }
    })
  }).fail(function(e) {
    fourSqList[place] = {error: "Couldn't reach fourSq servers. Links to fourSq servers will not be present"}; // Error reported if foursquare servers cannot be reach at all.
  });
}

function fourSqData(place,id){
  $.getJSON({
    url: "https://api.foursquare.com/v2/venues/"+id+"?v=20170101&client_id=Y0ZENNXBQKBOMGPPCP2K4PUZSGJOMAN14Z1ENF1MPS1LVRCG&client_secret=1SEY0XIEAMPE5BHANAZV3GELZUI440TOUJBI1URZCCHFDHD0",
    success: (function(data) {

      var res = data.response.venue;
      fourSqList[place] = {
        url: res.shortUrl,
        rating: res.rating,
        checkinsCount: res.stats.checkinsCount,
      };
      if (typeof(res.bestPhoto) !== "undefined"){

        fourSqList[place].img = res.bestPhoto.prefix+"200x200"+res.bestPhoto.suffix;
      }
      if (typeof(res.hours) !== "undefined"){
        fourSqList[place].open = res.hours.isOpen;
      }
    })
  }).fail(function(e) {
    fourSqList[place] = {error: "Network issues"}; // Error reported if async calls fail during individual requests, Hard to reproduce as it has to done between requests
  });
}
