/* Remove quasi-stale data */

var Firebase = require('firebase');

var firebusRef = new Firebase('https://firebus.firebaseio.com/');
var updateInterval = 200;
var reapAge = 400;
var agencyList = [ 'sf-muni' ];

function reap() {
  var runTs = Date.now() / 1000;
  agencyList.forEach(function(item) {
    firebusRef.child(item).once('value', function(s) {
       s.forEach(function(busSnap) {
         var age = runTs - busSnap.val().ts;
	 if(age > reapAge) {
           busSnap.ref().remove();
	 }
       });
    });
  });
}

reap();

setInterval((function() {
  reap();
}), updateInterval);
