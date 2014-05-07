var buses = { };
var map;

window.inboundcolor='#517D7C';
window.outboundcolor='#CF4B62';

var f = new Firebase("https://publicdata-transit.firebaseio.com/sf-muni/data");

function newBus(bus, firebaseId) {

    var marker_path= "M-5.392-5.018c-2.977,2.979-2.977,7.807,0,10.783c2.978,2.979,7.805,2.979,10.783,0c2.979-2.977,2.979-7.805,0-10.783l-5.392-5.391L-5.392-5.018z";
    //var busLatLng = console.log('Bus #'+firebaseId+ ' ('+bus.id+') is at lat '+bus.lat+' and lon '+bus.lon);

	//determine bus direction for marker color
    var direction= bus.dirTag && bus.dirTag.indexOf('OB') > -1 ? "_OB" : "_IB";
    var directionColor = direction.indexOf('OB') > -1 ? inboundcolor : outboundcolor;
    //Creates a new bus marker
    var newmarker=d3.select('#markers').append('g');
		
			var xcoord=lonx(bus.lon);
			var ycoord=laty(bus.lat);
	    newmarker.attr('style','-webkit-transform:translate('+xcoord+'px,'+ycoord+'px)')
		.attr('class','busmarker selected ')
		.attr('id','bus'+firebaseId)
		.attr('xcoord',xcoord+20)
		.attr('ycoord',ycoord-10)
		.attr('type',bus.vtype)
		.attr('route',bus.routeTag)
		.attr('direction', direction)
		//.attr('onclick','showroutestops("'+bus.routeTag+direction+'"), showbusesonline("'+bus.routeTag+'")')
		.on('mouseover',function() {
			$('.viewport').attr('class','viewport highlighting');
			showroutestops(bus.routeTag+direction);
			//showbusesonline(bus.routeTag);
			var xcoordforlabel=$(this).attr('xcoord')+500;
			var ycoordforlabel=$(this).attr('ycoord');	

			d3.json('truncated_stops.json',function(json){
				var busname=json[bus.routeTag+direction]['Name'];							
				var destination= function() {
					if ($('.zoomed').length==0)
						{return 'Click to zoom here'}
					else 
						{return json[fudge(bus.routeTag+direction)]['Title'];}
					}
				var directionColor=bus.dirTag && bus.dirTag.indexOf('OB') > -1 ? inboundcolor : outboundcolor;	


				makelabel(xcoordforlabel+'500',ycoordforlabel,busname,directionColor,destination);			})
		})
		.on('mouseleave',function(){removelabel();			
			$('.viewport').attr('class','viewport');
}
 			
			)
		//.on('mouseout',function(){$('.viewport').toggleClass('highlighting')})

		.on('click',function(){
			var xcoordforlabel=d3.select(this).attr('xcoord');
			var ycoordforlabel=d3.select(this).attr('ycoord');
			zoomto(xcoordforlabel,ycoordforlabel);
			//console.log('xcoord of '+d3.select(this).attr('xcoord'));
		})
		.attr('transform','scale3d(0,0,0)')


		.append('g')
		.attr('class','grower')    
	    .append('path')
	    .attr('transform','rotate('+bus.heading+')')
		.attr('d',marker_path)    
		.attr('fill',directionColor);
		
		
		
		
	//Bus marker text	
    d3.select('#bus'+firebaseId+' .grower')
    	.append('text')
		.attr('y',5-(bus.routeTag.toString().length)) 
		.attr('y',function(){if (bus.routeTag.toString().length<3){return 3} else{return 5-(bus.routeTag.toString().length)}})
		
		//fudge factor to position route number in the middle of the circle
		.attr('font-size',function(){if (bus.routeTag.toString().length<3){return 8} else{return 10-(bus.routeTag.toString().length*1.5)}})
		.attr('class','busmarkertext')
		.text(bus.routeTag);
	
	//Add the entry to log of active buses	
	buses[firebaseId]=firebaseId;				

					

}


//Automatically reload page if no bus markers in 4 seconds
	setTimeout(function () {console.log('pinging');
		if($('.busmarker').length==0) {location.reload(true)}; 
		console.log('pinging')}, 4000);	

//On page load, create all new bus markers
f.once("value", function(s) {

while ($('.busmarker').length==0){
  s.forEach(function(b) {
    newBus(b.val(), b.name());
  });

  //generate bus count
  countbuses();

  //fade out the loader
  $('#loader').fadeOut(600);
  $('.blurred').attr('class','')
}});





//Whenever a child has changed, either make a new marker (if not on list) or move it (if it is on the list)
f.on("child_changed", function(s) {
	console.log('update');

	var busMarker = buses[s.name()];

	//new bus  
  if(typeof busMarker === 'undefined') {
	  newBus(s.val(), s.name());
	  
  }
  //existing bus
  else {
  	var bus=s.val();
  	var xcoord=lonx(s.val().lon);
	var ycoord=laty(s.val().lat);

	 d3.select('#bus'+busMarker)
	    .attr('style','-webkit-transform:translate('+xcoord+'px,'+ycoord+'px)')
		.attr('xcoord',xcoord+20)
		.attr('ycoord',ycoord-10)   
		
	    .select('path')
	    .attr('transform','rotate('+s.val().heading+')')
		.on('click',function(){
			var xcoordforlabel=d3.select(this).attr('xcoord');
			var ycoordforlabel=d3.select(this).attr('ycoord');
			zoomto(xcoordforlabel,ycoordforlabel);
		})			
	
	countbuses();

  }
});

//When a child is removed, take out the marker and its corresponding entry in the list
f.on("child_removed", function(s) {
  var busMarker = buses[s.name()];
  
  if(typeof busMarker !== 'undefined') {
  	//console.log(buses[s.name()]+" just went into the pen!");
  	    delete buses[s.name()];

	 d3.select('#bus'+busMarker)		
	 	.remove();

  }
});
