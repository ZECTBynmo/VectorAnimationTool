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
	this.animationContext = new DrawContext( canvasName );
	
	// Our animation interval
	this.animationInterval;
	this.animationIntervalTime = animationIntervalMillis;
	
	this.animationPaths = new Array();	// All drawing code recorded so far organized by [frame][path][point]
	this.frameToDraw = 0;					// The frame we're about to draw

	if( isSelfAnimating ) {
		this.startAnimation();
	}
}; // end AnimationContext.AnimationContext()


//////////////////////////////////////////////////////////////////////////
// Namespace (lol)
var DEFAULT_ANIMATION_INTERVAL_MILLIS = 200;

//////////////////////////////////////////////////////////////////////////
// Starts our animation interval
AnimationContext.prototype.startAnimation = function() {
	var closureScope = this;

	// Start the interval
	this.animationInterval = setInterval( function() {		
		closureScope.drawNextFrame( closureScope );		
	}, this.animationIntervalTime );
} // end AnimationContext.startAnimation()


//////////////////////////////////////////////////////////////////////////
// Draws the next frame onto the canvas
AnimationContext.prototype.drawNextFrame = function( closureScope ) {
	// Just get our if we haven't pushed any frames into the animation
	if( closureScope.animationPaths.length == 0 ) { return; }
	
	var relativePaths = new Array();
	
	var iFrame= closureScope.frameToDraw;

	// Loop through all paths in this frame and turn them into relative paths
	for( iPath=0; iPath<closureScope.animationPaths[iFrame].length; ++iPath ) {
		if( closureScope.animationPaths[iFrame][iPath].length > 2 ) {
			relativePaths.push( drawContext.mapPathToRelative(closureScope.animationPaths[iFrame][iPath]) );
		}
	}
	
	closureScope.animationContext.clear();
	closureScope.animationContext.drawMultiPolyPointRelative( relativePaths, 1 );
	
	// Increment our last frame drawn status
	closureScope.fameToDraw++;		
	if( closureScope.fameToDraw >= closureScope.animationPaths.length ) { closureScope.fameToDraw = 0; }
} // end AnimationContext.drawFrame

//////////////////////////////////////////////////////////////////////////
// Clears the entire animation
AnimationContext.prototype.clearAnimation = function() {
	this.animationPaths = new Array();
	this.animationContext.clear();
	this.frameToDraw = 0;
} // end AnimationContext.clearAnimation


//////////////////////////////////////////////////////////////////////////
// Adds a path to the animation
AnimationContext.prototype.addPath = function( path ) {
	this.animationPaths.push( path );
} // end AnimationContext.addPath


//////////////////////////////////////////////////////////////////////////
// Returns the last frame of animation we added
AnimationContext.prototype.getLastFrame = function() {
	return this.animationPaths[this.animationPaths.length-1];
} // end AnimationContext.addPath