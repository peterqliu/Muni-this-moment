//Automatically reload page if no bus markers in 4 seconds
setTimeout(function() {
	console.log('pinging');
	if (document.getElementsByClassName('busmarker').length == 0) {
		location.reload(true)
	};
	console.log('pinging')
}, 4000);

//defines functionality of moving markers to the front when clicked
d3.selection.prototype.moveToFront = function() {
	return this.each(function() {
		this.parentNode.appendChild(this);
	});
};



//places dot given lat-lon

function current_location(lat, lon) {

	if ($('#iamhere').length == 0) {
		d3.select('#markers')
			.append('circle')
			.attr('cx', lonx(lon))
			.attr('cy', laty(lat))
			.attr('id', 'iamhere')
			.on('mouseout', function() {
				removelabel()
			});

		$('.busmarker').attr('class', 'busmarker selected');
	};



	d3.select('#iamhere')
		.attr('cx', lonx(lon))
		.attr('cy', laty(lat))
		.attr('r', 4)
		.on('mouseover', function() {
			var position = Math.round(lat * 1000) / 1000 + ' latitude, ' + Math.round(lon * 1000) / 1000 + ' longitude';
			makelabel(lonx(lon), laty(lat), "That's you!", 'purple', '(Location based on IP address)')
		})
		.on('click', function() {
			var myx = $(this)[0].getAttribute('cx');
			var myy = $(this)[0].getAttribute('cy');

			zoomto(myx, myy);
			$('.busmarker').attr('class', 'busmarker selected');
			$('.stopmarker').remove();

		})


}


//Contingencies    
function show_map_error() {};

function supports(bool, suffix) {
	var s = "Your browser ";
	if (bool) {
		s += "supports " + suffix + ".";
	} else {
		s += "does not support " + suffix + ". :(";
	}
	return s;
};

//detects whether geolocation is possible
$(function() {
	if (geoPosition.init()) {
		$("#live-geolocation").html(supports(true, "geolocation") + ' <a href="#" onclick="lookup_location();return false">Click to look up your location</a>.');
	} else {
		$("#live-geolocation").html(supports(false, "geolocation"));
		$('#findme').remove();
	}
});


//	Managing bus markers
var buses = {};
var map;

window.outboundcolor = '#41A6B2';
window.inboundcolor = '#AA3345';
var f = new Firebase("https://publicdata-transit.firebaseio.com/sf-muni/data");

function newBus(bus, firebaseId) {

	var marker_path = "M-5.392-5.018c-2.977,2.979-2.977,7.807,0,10.783c2.978,2.979,7.805,2.979,10.783,0c2.979-2.977,2.979-7.805,0-10.783l-5.392-5.391L-5.392-5.018z";

	//determine bus direction for marker color
	var direction = bus.dirTag && bus.dirTag.indexOf('OB') > -1 ? "_OB" : "_IB";
	var directionColor = direction.indexOf('OB') > -1 ? outboundcolor : inboundcolor;
	//Creates a new bus marker
	var newmarker = d3.select('#markers').append('g');

	var xcoord = lonx(bus.lon);
	var ycoord = laty(bus.lat);
	newmarker.attr('style', '-webkit-transform:translate(' + xcoord + 'px,' + ycoord + 'px)')
		.attr('class', 'busmarker ' + 'route' + bus.routeTag)
		.attr('transform', 'scale3d(0,0,0)')
		.attr('id', 'bus' + firebaseId)
		.attr('xcoord', xcoord + 20)
		.attr('ycoord', ycoord - 10)
		.attr('type', bus.vtype)
		.attr('route', bus.routeTag)
		.attr('direction', direction)
		//.attr('onclick','showbusesonline("'+bus.routeTag+'", "'+direction+'"), showroutestops("'+bus.routeTag+direction+'","'+directionColor+'");')
		.on('mouseover', function() {

			//Fire only when the mouse isn't already held down (i.e. dragging)
			if ($('body:active').length == 0) {

				$('.viewport').attr('highlighting', 'yes');
				var target = d3.select(this);
				var xcoordforlabel = $(this).attr('xcoord') + 500;
				var ycoordforlabel = $(this).attr('ycoord');
				var directionColor = $(this).attr('direction').indexOf('OB') > -1 ? outboundcolor : inboundcolor;
				var directiontag = $(this).attr('direction').indexOf('OB') > -1 ? ' outbound' : ' inbound';

				d3.json('stops.refactored.v3.json', function(json) {

					var busname = json[bus.routeTag + direction]['Name'];
					var destination = function() {
						if ($('.zoomed').length == 0) {
							return 'Click to inspect '
						} else {
							return json[fudge(bus.routeTag + direction)]['Title'];
						}
					}
					makelabel(xcoordforlabel + '500', ycoordforlabel, busname, directionColor, destination, directiontag);
				})

				if ($('.zoomed').length == 0) {
					drawpath(bus.routeTag + direction, directionColor);
				}

			}
		})
		.on('mouseleave', function() {
			removelabel();
			$('.viewport').attr('highlighting', 'no');
		})
		.on('click', function() {
			var xcoordforlabel = d3.select(this).attr('xcoord');
			var ycoordforlabel = d3.select(this).attr('ycoord');
			zoomto(xcoordforlabel, ycoordforlabel);

			showbusesonline(bus.routeTag, direction);
			showroutestops(bus.routeTag + direction, directionColor, bus.vtype);
		})
		.append('g')
		.attr('class', 'grower')
		.append('path')
		.attr('transform', 'rotate(' + bus.heading + ')')
		.attr('d', marker_path)




	//Bus marker text	
	d3.select('#bus' + firebaseId + ' .grower')
		.append('text')
		//fudge font-size to position route number in the middle of the marker
		.attr('y', function() {
			if (bus.routeTag.toString().length < 3) {
				return 3
			} else {
				return 5 - (bus.routeTag.toString().length)
			}
		})
		.attr('font-size', function() {
			if (bus.routeTag.toString().length < 3) {
				return 8
			} else {
				return 10 - (bus.routeTag.toString().length * 1.5)
			}
		})
		.attr('class', 'busmarkertext')
		.text(bus.routeTag);

	//Add the entry to log of active buses	
	buses[firebaseId] = firebaseId;



}

//On page load, create all new bus markers
f.once("value", function(s) {

	while (document.getElementsByClassName('busmarker').length == 0) {
		s.forEach(function(b) {
			newBus(b.val(), b.name());
		});
	}
	countbuses();
	$('#loader').fadeOut(600);
	$('.blurred').attr('class', '')


});

//Whenever a child has changed, either make a new marker (if not on list) or move it (if it is on the list)
f.on("child_changed", function(s) {
	console.log('update');

	var busMarker = buses[s.name()];

	//new bus  
	if (typeof busMarker === 'undefined') {
		newBus(s.val(), s.name());

	}
	//existing bus
	else {

		var bus = s.val();
		var xcoord = lonx(s.val().lon);
		var ycoord = laty(s.val().lat);
		var direction = bus.dirTag && bus.dirTag.indexOf('OB') > -1 ? "_OB" : "_IB";
		var route = bus.routeTag;

		//if bus changed direction, update the routes they bring up
		if (direction != d3.select('#bus' + busMarker).attr('direction')) {
			d3.select('#bus' + busMarker)
				.attr('direction', direction)
				.attr('route', route)
				.on('click', null)
				.on('mouseover', null)
				.on('mouseleave', null)

			.on('click', function() {
					var xcoordforlabel = d3.select(this).attr('xcoord');
					var ycoordforlabel = d3.select(this).attr('ycoord');
					zoomto(xcoordforlabel, ycoordforlabel);

					showbusesonline(bus.routeTag, direction);

					var directionColor = direction.indexOf('OB') > -1 ? outboundcolor : inboundcolor;
					showroutestops(bus.routeTag + direction, directionColor, bus.vtype);
				})
				.on('mouseover', function() {

					//Fire only when the mouse isn't already held down (i.e. dragging)
					if ($('body:active').length == 0) {

						$('.viewport').attr('highlighting', 'yes');
						var target = d3.select(this);
						var xcoordforlabel = $(this).attr('xcoord') + 500;
						var ycoordforlabel = $(this).attr('ycoord');
						var directionColor = $(this).attr('direction').indexOf('OB') > -1 ? outboundcolor : inboundcolor;
						var directiontag = $(this).attr('direction').indexOf('OB') > -1 ? ' outbound' : ' inbound';

						d3.json('stops.refactored.v3.json', function(json) {
							var busname = json[bus.routeTag + direction]['Name'];
							var destination = function() {
								if ($('.zoomed').length == 0) {
									return 'Click to inspect '
								} else {
									return json[fudge(bus.routeTag + direction)]['Title'];
								}
							}


							makelabel(xcoordforlabel + '500', ycoordforlabel, busname, directionColor, destination, directiontag);
						})

						if ($('.zoomed').length == 0) {
							drawpath(bus.routeTag + direction, directionColor);
						}

					}
				})
				.on('mouseleave', function() {
					removelabel();
					$('.viewport').attr('highlighting', 'no');
				})
		}

		$('#bus' + busMarker)
			.attr('style', '-webkit-transform:translate(' + xcoord + 'px,' + ycoord + 'px)')
			.attr('xcoord', xcoord + 20)
			.attr('ycoord', ycoord - 10)
			.select('path')
			.attr('transform', 'rotate(' + s.val().heading + ')')
			.attr('onclick', '')

		countbuses();

	}
});

//When a child is removed, take out the marker and its corresponding entry in the list
f.on("child_removed", function(s) {
	var busMarker = buses[s.name()];

	if (typeof busMarker !== 'undefined') {
		//console.log(buses[s.name()]+" just went into the pen!");
		delete buses[s.name()];

		d3.select('#bus' + busMarker)
			.remove();

	}
});



////// PREVIOUSLY IN INDEX.HTML

window.dragreset = 'no';
$(document).ready(function() {
	//$('#svg').load('sfmap.svg');
});
$('#dragger').pep();


// LAT-LON MASTER CONVERTERS
function lonx(lon) {
	return (8823 * lon) + 1081060 - 4;
}

function laty(lat) {
	return 422405 - (11164.4 * lat);
}




function zoomto(x, y) {

	//if it's already in a zoomed state
	dragreset = 'yes';

	$('#viewport').attr('style', 'transform-origin:' + '50%' + ' ' + '50%' + ' ');

	setTimeout(function() {
		$('#viewport').attr('class', 'viewport zoomed');
	}, 0);



	$('.viewport').attr('highlighting', 'no');
	$('#zoomout').attr('style', '');
	$('#dragger').attr('style', '-webkit-transform:translate(0,0); -webkit-transition:all 1.5s');

	removelabel();
};

function lookup() {
	var number = $('#routenumber').val().toUpperCase();
	var direction = $('#routedirection').attr('val');
	var targetbuses = $('g[route=' + number + '][direction="' + direction + '"]');

	if (number.length != 0) {
		if (targetbuses.length == 0) {
			$('#searchreply').html('No results');
			console.log('nonereturned')
		} else {

			//zoom in on the center bus in the DOM (more likely to be near center of map)
			var middlebus = Math.ceil((targetbuses.length) * 0.5) - 1;
			var horiz = targetbuses[middlebus].getAttribute('xcoord');
			var vert = targetbuses[middlebus].getAttribute('ycoord');

			$('#searchreply').html(targetbuses.length + ' found')
			zoomto(horiz, vert);
			showbusesonline(number, direction);
			showroutestops(number + direction);
			drawpath(number + direction);
			$('input').blur();
			//console.log(number+direction);
		}
	}
}


//draw the overall route path (deprecated)
function drawroute(line, color) {
	d3.json('stops.refactored.v3.json', function(json) {
		//alert('sdfsd');
		var data = json['RoutePaths'][line]['Subsegments'];
		//console.log(json['RoutePaths'][22]['Subsegments'])
		d3.select('#busstops')
			.selectAll('path')
			.data(data)
			.enter()
			.append("path")
			.attr('d', function(d, i) {
				return data[i]
			})
			.attr('stroke-width', 3)
			.attr('class', 'routepatha')
			.attr('fill', 'none')
			.attr('stroke', 'purple');

	})
}

//draw bus route based on stops' positions only
function drawpath(routedir, marker) {
	$('.routepath').remove();

	var directionColor = routedir.indexOf('OB') > -1 ? outboundcolor : inboundcolor;

	d3.json('stops.refactored.v3.json', function(json) {

		var data = json[routedir]['Stops'];
		var datalen = data.length;
		var pathdata = json[routedir]['Path'];

		d3.select('#markers')
			.append("path")
			.attr('d', pathdata)
			.attr('class', 'routepath')
			.attr('fill', 'none')
			.attr('stroke', directionColor)
			.attr('stroke-linecap', 'round')
			.attr('stroke-linejoin', 'round');
		setTimeout(function() {
			$('.routepath').attr('style', 'stroke-dashoffset:0');
		}, 0);


		//define the position of both ends of the route for the endcaps
		var endcaps = [data[0]['xpos'], data[0]['ypos'], data[datalen - 1]['xpos'], data[datalen - 1]['ypos']];

		//draw endcap circles for the route
		for (k = 0; k < 2; k++) {
			d3.select('#markers')
				.append("circle")
				.attr('cx', endcaps[k * 2])
				.attr('cy', endcaps[(k * 2) + 1])
				.attr('r', 4)
				.attr('id', 'endcap')
				.attr('class', 'routepath coast')
				//.attr('fill', 'none')
				.attr('stroke', directionColor)
		}

		d3.selectAll('#busstops').moveToFront();
		d3.selectAll('.selected').moveToFront();
	})
}

//Emerge stop markers when a bus is clicked
function showroutestops(routedir, color, vtype) {

	//clears previous stop markers
	$('.stopmarker').remove();

	if ($('.zoomed').length == 1) {
		drawpath(routedir);
	}

	d3.json('stops.refactored.v3.json', function(json) {

		var data = json[routedir]['Stops'];


		d3.select('#busstops')
			.selectAll("circle")
			.data(data)
			.enter()
			.append("circle")
			.attr("r", 0)
			.attr('class', 'stopmarker')
			.attr('tag', function(d, i) {
				return data[i]['Tag']
			})
			.attr('stoptype', function(d, i) {
				if (i != 0 && i != data.length - 1) {
					return 'stop'
				} else {
					return 'terminal'
				}
			})
			.attr('direction', function(d, i) {
				if (routedir.indexOf('OB') > -1) {
					return '_OB'
				} else {
					return '_IB'
				}
			})
			.attr('cx', function(d, i) {
				return data[i]['xpos']
			})
			.attr('cy', function(d, i) {
				return data[i]['ypos']
			})
			.attr('stroke-width', function(d, i) {
				if (i != 0 && i != data.length - 1) {
					return 1.5
				} else {
					return 2.5
				}
			})
			.on('mouseover', function(d, i) {

				//Generate label
				var color = function() {
					if (routedir.indexOf('OB') > -1) {
						return outboundcolor
					} else {
						return inboundcolor
					}
				};
				var stopdirection = function() {
					if (routedir.indexOf('OB') > -1) {
						if (i == 0) {
							return 'Outbound line departs here'
						}
						if (i == data.length - 1) {
							return 'Outbound line ends here'
						} else {
							return ' Outbound stop'
						}
					} else {
						if (i == 0) {
							return 'Inbound line departs here'
						}
						if (i == data.length - 1) {
							return 'Inbound line ends here'
						} else {
							return 'Inbound stop'
						}
					}
				};
				makelabel(data[i]['xpos'], data[i]['ypos'], data[i]['Intersection'], color, stopdirection);

				//get bus prediction
				var stoptag = $(this)[0].getAttribute('tag');

				getprediction(routedir, stoptag, vtype);
			})
			.on('mouseout', function() {
				removelabel();
				$(this).attr('r', 2.5);
			})
			.transition()
			.delay(function(d, i) {
				return 5 * i
			})
			.duration(500)
			.attr("r", 2.5)
	})
	d3.select('.busmarker:hover').moveToFront();
}

//When a bus is clicked, grey out all buses that aren't on the same line, reveal stops, and move relevant stops and buses to the top of the stack		
function showbusesonline(line, direction) {

	if (direction != null) {
		$('.busmarker:not([route="' + line + '"][direction="' + direction + '"])').attr('class', 'busmarker unselected');
		$('.busmarker[route="' + line + '"][direction="' + direction + '"]').attr('class', 'busmarker selected');
	} else {
		$('.busmarker:not([route="' + line + '"])').attr('class', 'busmarker unselected');
		$('[route="' + line + '"]').attr('class', 'busmarker selected');
	}

	d3.select('#busstops').moveToFront();
	d3.selectAll('.selected').moveToFront();
}



//Restore view to full, remove all stop markers and restore all buses to full color
function zoombackout() {
	dragreset = 'yes';
	$('.viewport').attr('highlighting', 'no');
	$('#dragger').attr('style', '-webkit-transform:translate(0,0); -webkit-transition:-webkit-transform 1s');
	$('#view').attr('class', '');
	$('#zoomout').attr('style', 'opacity:0');

	d3.select('.viewport')
		.attr('class', 'viewport');

	$('.busmarker').attr('class', 'busmarker');
	$('.stopmarker').remove();
	$('.routepath').remove();
	removelabel();


}

//hack to fix erroneous routdirs
function fudge(routedir) {
	var lastB = routedir.lastIndexOf('B');
	return routedir.substr(0, lastB + 1);

}

window.labelscalefactor;

//make label
function makelabel(x, y, text, textcolor, subtext, directiontag) {
	removelabel();
	if ($('.zoomed').length == 0) {
		labelscalefactor = ' scale(2.2)';
	} else {
		labelscalefactor = ' scale(1)'
	}
	d3.selectAll('#stoplabel').remove();

	//Fire only when the mouse isn't already held down (i.e. dragging)
	if ($('body:active').length == 0) {
		d3.select('#busstoplabels')
			.attr('transform', 'translate(' + (x + 8) + ' ' + (y - 10) + ') ' + labelscalefactor)
			.append('text')
			.attr('x', 6)
			.attr('y', 13)
			.attr('font-size', 8)
			.attr('fill', '#666')
			.text(text)
			.attr('font-weight', '500')
			.attr('id', 'stoplabel')
			.attr('class', 'heading');

		d3.select('#busstoplabels')
			.append('text')
			.attr('x', 6)
			.attr('y', 22)
			.attr('font-size', 6)
			.text(subtext)
			.attr('id', 'stoplabel')
			.attr('class', 'subtext')
			.append('tspan')
			.attr('class', 'directionspecifier')
			.attr('fill', textcolor)
			.attr('font-weight', '400')
			.text(directiontag)
			.append('tspan')
			.text(' line')
			.attr('class', 'subtext');

		//create background rectangle for label
		d3.select('#busstoplabels')
			.insert('rect', 'text')
			.attr('width', function() {
				return Math.max($('#stoplabel')[0].getComputedTextLength(), $('.subtext')[0].getComputedTextLength()) + 12
			})
			.attr('height', 28)
			.attr('stroke', '#eee')
			.attr('stroke-width', 0.5)
			.attr('id', 'labelrect');
	}

}

function removelabel() {
	d3.selectAll('#stoplabel').remove();
	d3.selectAll('#labelrect').remove();
}


function countbuses() {
		//count buses and trains
		var busquant = $('[type="bus"]').length;
		var trainquant = $('[type="train"]').length;

		$('#busquant').text(busquant + ' ');
		$('#trainquant').text(trainquant);
	}
	//Update user position		

function gps() {

	window.finding = setInterval(function() {
		$('#loadermessage').text('Getting your position...');
		$('#spinner').attr('fill', 'purple');
		$('#svg').addClass('blurred');
		$('#loader').show();
		$('.routepath').remove();
		$('.stopmarker').remove();

		if ($('#iamhere').length == 0) {
			geoPosition.getCurrentPosition(get_latlon, show_map_error);
			current_location(lat, lon);
			console.log('poll');
		}

		if ($('#iamhere').length != 0) {
			removegpsloader();
			if ((lon >= -122.516613) && (lon <= -122.358685) && (lat <= 37.841898) && (lat >= 37.702273)) {
				zoomto(lonx(lon), laty(lat));
			} else {
				alert("Whoops, it doesn't look like you're in the area. This feature is limited to San Francisco.")
			};
		}
	}, 0);
}

function removegpsloader() {
	clearInterval(finding);
	$('#loader').hide();
	$('#svg').removeClass('blurred');
}



function getprediction(routedir, stoptag, vtype) {

	//strips direction from routedir
	var justtheroute = routedir.substr(0, routedir.lastIndexOf("_"));
	var targeturl = 'http://webservices.nextbus.com/service/publicXMLFeed?command=predictions&a=sf-muni&r=' + justtheroute + '&s=' + stoptag;

	var directionColor = routedir.indexOf('OB') > -1 ? outboundcolor : inboundcolor;
	var heading = routedir.indexOf('OB') > -1 ? 'outbound' : 'inbound';

	//set default vehicle type to 'bus' (in case the data provides an 'undefined')
	function vehicle(input) {
		if (input == 'train') {
			return 'train'
		} else {
			return 'bus'
		}
	};

	//retrieve data via asynchronous call

	$.ajax({
		dataType: "xml",
		url: targeturl,
		success: function(response) {

			var path = "//prediction/@seconds";

			var nodes = response.evaluate(path, response, null, XPathResult.ANY_TYPE, null);
			var result = nodes.iterateNext();
			var predictionlist = [];
			while (result) {
				//grabs all available predictions for that route and stop
				predictionlist.push(result.childNodes[0].nodeValue);
				result = nodes.iterateNext();
			}


			//converts seconds to minutes, if necessary				
			function timeconverter(seconds) {
				var minutes = Math.round(seconds / 60);
				if (seconds < 60) {
					return seconds + ' seconds'
				} else {
					if (minutes > 1) {
						return minutes + ' minutes'
					} else {
						return minutes + ' minute'
					}
				}
			}

			// if the prediction actually returns a number (instead of NaN)
			if (predictionlist[0] > 0) {
				d3.select('.subtext')
					.text('Next ' + heading + ' ' + vehicle(vtype) + ' in ')
					.append('tspan')
					.attr('fill', directionColor)
					.attr('font-weight', '400')
					.text(timeconverter(predictionlist[0]));
			}

			//if not, just say that there's no available prediction
			else {
				$('.subtext').append(' (no current prediction)')
			}

			//resize background rectangle to fit new text
			$('#labelrect').attr('width', function() {
				return Math.max($('#stoplabel')[0].getComputedTextLength(), $('.subtext')[0].getComputedTextLength()) + 12
			})
		}
	});
}