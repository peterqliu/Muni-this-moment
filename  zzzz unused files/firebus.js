var buses = { };
var map;

function initialize() {
  var mapOptions = {
    center: new google.maps.LatLng(37.7789, -122.3917),
    zoom: 15,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };
  map = new google.maps.Map(document.getElementById("map_canvas"), mapOptions);
}
      
var f = new Firebase("https://publicdata-transit.firebaseio.com/sf-muni/data");

function newBus(bus, firebaseId) {
    var directionColor = bus.dirTag && bus.dirTag.indexOf('OB') > -1 ? "7094FF" : "FF6262";
    var iconType = bus.vtype; // 'train' looks nearly identical to bus at rendered size
    
    var busLatLng = new google.maps.LatLng(bus.lat, bus.lon);
    
    var marker = new google.maps.Marker({ icon: 'http://chart.googleapis.com/chart?chst=d_bubble_icon_text_small&chld=' + iconType + '|bbT|'+bus.routeTag+'|' + directionColor + '|eee', position: busLatLng, map: map });
    buses[firebaseId] = marker;
}

f.once("value", function(s) {
  s.forEach(function(b) {
    newBus(b.val(), b.name());
  });
});

f.on("child_changed", function(s) {
  var busMarker = buses[s.name()];
  if(typeof busMarker === 'undefined') {
    newBus(s.val(), s.name());
  }
  else {
    busMarker.animatedMoveTo(s.val().lat, s.val().lon);
  }
});

f.on("child_removed", function(s) {
  var busMarker = buses[s.name()];
  if(typeof busMarker !== 'undefined') {
    busMarker.setMap(null);
    delete buses[s.name()];
  }
});
