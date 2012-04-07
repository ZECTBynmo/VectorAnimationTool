//////////////////////////////////////////////////////////////////////////
// Constructor
function AnimationContext( canvasName, animationIntervalMillis, isSelfAnimating ) {
	// Default the canvas name
	if( typeof(canvasName) == "undefined" ) { canvasName = "canvas"; }

	// Default auto-animation to false
	if( typeof(isSelfAnimating) == "undefined" ) {	isSelfAnimating = false; }
	
	// Default our animation interval timing
	if( typeof(animationIntervalMillis) == "undefined" ) { animationIntervalMillis = DEFAULT_ANIMATION_INTERVAL_MILLIS; }

	// Our HTML5 canvas
	this.animationContext;
	
	// Our animation interval
	this.animationInterval;
	this.animationIntervalTime = animationIntervalMillis;
	
	this.animationPaths = new Array();	// All drawing code recorded so far organized by [frame][path][point]
	this.frameToDraw = 0;					// The frame we're about to draw	
}; // end AnimationContext.AnimationContext()


//////////////////////////////////////////////////////////////////////////
// Namespace (lol)
var DEFAULT_ANIMATION_INTERVAL_MILLIS = 200;


//////////////////////////////////////////////////////////////////////////
// Starts our animation animation interval
AnimationContext.prototype.startAnimation = function() {
	var closureContext= this;

	// Start the interval
	this.animationInterval = setInterval( function() {		
		closureContext.drawNextFrame();		
	}, this.animationIntervalTime );
} // end AnimationContext.startAnimation()


AnimationContext.prototype.drawNextFrame = function() {
	// Just get our if we haven't pushed any frames into the animation
	if( this.animationPaths.length == 0 ) { return; }
	
	var relativePaths = new Array();
	
	var iFrame= this.fameToDraw;

	// Loop through all paths in this frame and turn them into relative paths
	for( iPath=0; iPath<this.animationPaths[iFrame].length; ++iPath ) {
		if( this.animationPaths[iFrame][iPath].length > 2 ) {
			relativePaths.push( drawContext.mapPathToRelative(this.animationPaths[iFrame][iPath]) );
		}
	}
	
	this.animationContext.clear();
	this.animationContext.drawMultiPolyPointRelative( relativePaths, 1 );
	
	// Increment our last frame drawn status
	this.fameToDraw++;		
	if( this.fameToDraw >= this.animationPaths.length ) { this.fameToDraw = 0; }
} // end AnimationContext::drawFrame
