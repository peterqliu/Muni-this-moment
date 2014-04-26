/* Populate Firebase from the NextBus XML API:
      agency list: http://webservices.nextbus.com/service/publicXMLFeed?command=agencyList
      route list: http://webservices.nextbus.com/service/publicXMLFeed?command=routeList&a=sf-muni
      vehic loc : http://webservices.nextbus.com/service/publicXMLFeed?command=vehicleLocations&a=sf-muni&t=1362432121000
*/

var Firebase = require('firebase');
var xml2js = require('xml2js');
var rest = require('restler');
var crc = require('crc');

var firebusRef = new Firebase('https://firebus.firebaseio.com/');

var lastTime = Date.now() - 3600000;
var updateInterval = 5000;

var agencyList = [ 'sf-muni' ];

function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function coerce(n) {
  return isNumber(n) ? Number(n) : n;
}

function traverseAndCoerce(o) {
  var result = { };
  for(var key in o) {
    result[key] = coerce(o[key]);
  }
  return result;
}

function vehicleLocation(agency) {
  var dev = "http://misc.firebase.com/~vikrum/nextbus.xml?dumb&a=";
  var prod = "http://webservices.nextbus.com/service/publicXMLFeed?command=vehicleLocations&a=";
  
  var result = prod + agency + "&t=" + lastTime;
  lastTime = Date.now();

  return result;
}


function updateFirebaseWithData() {
  agencyList.forEach(function(agency) {
    rest.get(vehicleLocation(agency)).on('complete', function(data) {
      var parser = new xml2js.Parser();
      console.log(data);
      parser.parseString(data, function (err, result) {
        if(result && result.body && result.body.vehicle) {
          var i = 0;
          result.body.vehicle.forEach(function(item) {
           var vehicle = item['$'];
           if(vehicle && vehicle.id) {
             var firebaseId = crc.crc32(vehicle.id + vehicle.routeTag);
             vehicle = traverseAndCoerce(vehicle);
	     vehicle.ts = (Date.now() / 1000) - vehicle.secsSinceReport;
	     vehicle.vtype = 'FJLMNXKT'.indexOf(vehicle.routeTag) > -1 ? 'train' : 'bus'; 
	     firebusRef.child(agency).child(firebaseId).set(vehicle);
           }
	   else {
             console.log("bad vehicle ->");
	     console.log(vehicle);
	   }
           i++;
          });
        }
      });
    });
  });
}

setInterval((function() {
  updateFirebaseWithData();
}), updateInterval);
