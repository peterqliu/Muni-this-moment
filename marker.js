function feq (f1, f2) {
  return (Math.abs(f1 - f2) < 0.000001);
 }

// hack to animated/move the Marker class -vikrum
// based on http://stackoverflow.com/a/10906464
google.maps.Marker.prototype.animatedMoveTo = function(toLat, toLng) {
  var fromLat = this.getPosition().lat();
  var fromLng = this.getPosition().lng();
  if(feq(fromLat, toLat) && feq(fromLng, toLng))
    return;
    
  // store a LatLng for each step of the animation
  var frames = [];
  for (var percent = 0; percent < 1; percent += 0.005) {
    curLat = fromLat + percent * (toLat - fromLat);
    curLng = fromLng + percent * (toLng - fromLng);
    frames.push(new google.maps.LatLng(curLat, curLng));
  }
      
  move = function(marker, latlngs, index, wait) {
    marker.setPosition(latlngs[index]);
     if(index != latlngs.length-1) {
      // call the next "frame" of the animation
       setTimeout(function() { 
        move(marker, latlngs, index+1, wait); 
      }, wait);
    }
  }
    
  // begin animation, send back to origin after completion
  move(this, frames, 0, 25);
}
