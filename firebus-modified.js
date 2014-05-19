//Automatically reload page if no bus markers in 4 seconds
	setTimeout(function () {console.log('pinging');
		if($('.busmarker').length==0) {location.reload(true)}; 
		console.log('pinging')}, 4000);	


var buses = { };
var map;

window.outboundcolor='#41A6B2';
window.inboundcolor='#AA3345';      
var f = new Firebase("https://publicdata-transit.firebaseio.com/sf-muni/data");

function newBus(bus, firebaseId) {

    var marker_path= "M-5.392-5.018c-2.977,2.979-2.977,7.807,0,10.783c2.978,2.979,7.805,2.979,10.783,0c2.979-2.977,2.979-7.805,0-10.783l-5.392-5.391L-5.392-5.018z";

	//determine bus direction for marker color
    var direction= bus.dirTag && bus.dirTag.indexOf('OB') > -1 ? "_OB" : "_IB";
    var directionColor = direction.indexOf('OB') > -1 ? outboundcolor : inboundcolor;
    //Creates a new bus marker
    var newmarker=d3.select('#markers').append('g');
		
	var xcoord=lonx(bus.lon);
	var ycoord=laty(bus.lat);
	    newmarker.attr('style','-webkit-transform:translate('+xcoord+'px,'+ycoord+'px)')
		.attr('class','busmarker '+'route'+bus.routeTag)
		.attr('transform','scale3d(0,0,0)')		
		.attr('id','bus'+firebaseId)
		.attr('xcoord',xcoord+20)
		.attr('ycoord',ycoord-10)
		.attr('type',bus.vtype)
		.attr('route',bus.routeTag)
		.attr('direction', direction)
		//.attr('onclick','showbusesonline("'+bus.routeTag+'", "'+direction+'"), showroutestops("'+bus.routeTag+direction+'","'+directionColor+'");')
		.on('mouseover',function() {

			//Fire only when the mouse isn't already held down (i.e. dragging)
			if ($('body:active').length==0){			

				$('.viewport').attr('highlighting','yes');			
				var target=d3.select(this);
				var xcoordforlabel=$(this).attr('xcoord')+500;
				var ycoordforlabel=$(this).attr('ycoord');	
				var directionColor=$(this).attr('direction').indexOf('OB') > -1 ? outboundcolor : inboundcolor;	
				var directiontag=$(this).attr('direction').indexOf('OB') > -1 ? ' outbound' : ' inbound';

				d3.json('stops.refactored.v3.json',function(json){

					var busname=json[bus.routeTag+direction]['Name'];							
					var destination= function() {
						if ($('.zoomed').length==0)
							{return 'Click to inspect '}
						else 
							{return json[fudge(bus.routeTag+direction)]['Title'];}
						}
					makelabel(xcoordforlabel+'500',ycoordforlabel,busname,directionColor,destination,directiontag);			
				})

			if ($('.zoomed').length==0)	
				{
				drawpath(bus.routeTag+direction,directionColor);
				}

			}
		})
		.on('mouseleave',function(){removelabel();
			$('.viewport').attr('highlighting','no');
		})
		.on('click',function() {
			var xcoordforlabel=d3.select(this).attr('xcoord');
			var ycoordforlabel=d3.select(this).attr('ycoord');
			zoomto(xcoordforlabel,ycoordforlabel);

			showbusesonline(bus.routeTag,direction);
			showroutestops(bus.routeTag+direction,directionColor,bus.vtype);			
		})
		.append('g')
		.attr('class','grower')    
	    .append('path')
	    .attr('transform','rotate('+bus.heading+')')
		.attr('d',marker_path)    
		
		
		
		
	//Bus marker text	
    d3.select('#bus'+firebaseId+' .grower')
    	.append('text')
		.attr('y',5-(bus.routeTag.toString().length)) 
		.attr('y',function(){if (bus.routeTag.toString().length<3){return 3} else{return 5-(bus.routeTag.toString().length)}})
		
		//fudge font-size to position route number in the middle of the marker
		.attr('font-size',function(){if (bus.routeTag.toString().length<3){return 8} else{return 10-(bus.routeTag.toString().length*1.5)}})
		.attr('class','busmarkertext')
		.text(bus.routeTag);
	
	//Add the entry to log of active buses	
	buses[firebaseId]=firebaseId;				

					

}

//On page load, create all new bus markers
f.once("value", function(s) {

while ($('.busmarker').length==0){
  s.forEach(function(b) {
    newBus(b.val(), b.name());
  });
}
  countbuses();
  $('#loader').fadeOut(600);
  $('.blurred').attr('class','')


});

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
    var direction= bus.dirTag && bus.dirTag.indexOf('OB') > -1 ? "_OB" : "_IB";
    var route=bus.routeTag;

    //detect if bus changed direction
    if(direction!=d3.select('#bus'+busMarker).attr('direction'))
    	{console.log('a bus just changed their direction!');
    	d3.select('#bus'+busMarker)
    	.on('click',null)
    	.on('mouseover',null)
    	.on('mouseleave',null)

		.on('click',function(){
			var xcoordforlabel=d3.select(this).attr('xcoord');
			var ycoordforlabel=d3.select(this).attr('ycoord');
			zoomto(xcoordforlabel,ycoordforlabel);

			showbusesonline(bus.routeTag,direction);

    		var directionColor = direction.indexOf('OB') > -1 ? outboundcolor : inboundcolor;			
			showroutestops(bus.routeTag+direction,directionColor,bus.vtype);	
		})
		.on('mouseover',function() {

			//Fire only when the mouse isn't already held down (i.e. dragging)
			if ($('body:active').length==0){			

				$('.viewport').attr('highlighting','yes');			
				var target=d3.select(this);
				var xcoordforlabel=$(this).attr('xcoord')+500;
				var ycoordforlabel=$(this).attr('ycoord');	
				var directionColor=$(this).attr('direction').indexOf('OB') > -1 ? outboundcolor : inboundcolor;	
				var directiontag=$(this).attr('direction').indexOf('OB') > -1 ? ' outbound' : ' inbound';

				d3.json('stops.refactored.v3.json',function(json){
					var busname=json[bus.routeTag+direction]['Name'];							
					var destination= function() {
						if ($('.zoomed').length==0)
							{return 'Click to inspect '}
						else 
							{return json[fudge(bus.routeTag+direction)]['Title'];}
						}


					makelabel(xcoordforlabel+'500',ycoordforlabel,busname,directionColor,destination,directiontag);			
				})

			if ($('.zoomed').length==0)	
				{
				drawpath(bus.routeTag+direction,directionColor);
				}

			}
		})
		.on('mouseleave',function(){removelabel();
			$('.viewport').attr('highlighting','no');
		})
		}
		
	$('#bus'+busMarker)
	    .attr('style','-webkit-transform:translate('+xcoord+'px,'+ycoord+'px)')
		.attr('xcoord',xcoord+20)
		.attr('ycoord',ycoord-10)   
		.attr('direction',direction)		
		.attr('route',route)
	    .select('path')
	    .attr('transform','rotate('+s.val().heading+')')
	    .attr('onclick','')





	
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
