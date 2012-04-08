//////////////////////////////////////////////////////////////////////////
// Constructor
function Animator( animationIntervalMillis ) {
	// Default our animation time
	if( typeof(animationIntervalMillis) == "undefined" )
		animationIntervalMillis = DEFAULT_ANIMATION_INTERVAL_MILLIS;
		
	// Our animation interval time
	this.animTimeMs = animationIntervalMillis;
	
	// Our collection of animation contexts
	var animContexts = new Array();
	
	// Start the animation
	this.startAnimation();
	
}; // end Animator.Animator()


//////////////////////////////////////////////////////////////////////////
// Namespace (lol)
var DEFAULT_ANIMATION_INTERVAL_MILLIS = 200;


//////////////////////////////////////////////////////////////////////////
// Starts our animation interval
Animator.prototype.startAnimation = function() {
	var closureScope= this;

	// Start the interval
	this.animationInterval = setInterval( function() {
		// Draw the next frame of all the animations we have
		for( iAnimation=0; iAnimation<animContexts.length; ++iAnimation ) {
			closureScope.animContexts[iAnimation].drawNextFrame()	
		}
	}, this.animationIntervalTime );
} // end Animator.startAnimation()


//////////////////////////////////////////////////////////////////////////
// Add an animation to our collection
Animator.prototype.addAnimation = function( animation ) {
	animContexts.push( animation );
} // end Animator.addAnimation()

