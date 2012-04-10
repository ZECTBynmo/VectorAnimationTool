//////////////////////////////////////////////////////////////////////////
// Constructor
function AnimationContext( canvasName, animationIntervalMillis, isSelfAnimating ) {
	// Default the canvas name
	if( typeof(canvasName) == "undefined" ) { canvasName = "canvas"; }

	// Default auto-animation to false
	if( typeof(isSelfAnimating) == "undefined" ) { isSelfAnimating = false; }
	
	// Default our animation interval timing
	if( typeof(animationIntervalMillis) == "undefined" ) { animationIntervalMillis = DEFAULT_ANIMATION_INTERVAL_MILLIS; }

	// Our HTML5 canvas
	this.animationContext = new DrawContext( canvasName );
	
	// Our animation interval
	this.animationInterval;
	this.animationIntervalTime = animationIntervalMillis;
	
	this.animationFrames = new Array();	// All drawing code recorded so far organized by [frame][path][point]
	this.frameToDraw = 0;				// The frame we're about to draw

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
	if( closureScope.animationFrames.length == 0 ) { return; }
	
	var iFrame= closureScope.frameToDraw;
	
	closureScope.animationContext.clear();
	closureScope.animationContext.drawMultiPolyPointRelative( closureScope.animationFrames[iFrame], 1 );
	
	// Increment our last frame drawn status
	closureScope.frameToDraw++;		
	if( closureScope.frameToDraw >= closureScope.animationFrames.length ) { closureScope.frameToDraw = 0; }
} // end AnimationContext.drawNextFrame

//////////////////////////////////////////////////////////////////////////
// Clears the entire animation
AnimationContext.prototype.clearAnimation = function() {
	this.animationFrames = new Array();
	this.animationContext.clear();
	this.frameToDraw = 0;
} // end AnimationContext.clearAnimation


//////////////////////////////////////////////////////////////////////////
// Adds a path to the animation
AnimationContext.prototype.addFrame = function( relativeFrame ) {
	this.animationFrames.push( relativeFrame );
} // end AnimationContext.addFrame


//////////////////////////////////////////////////////////////////////////
// Adds a path to the animation
AnimationContext.prototype.addFrameAsAbsolute= function( absoluteFrame ) {
	var relativePaths = new Array();

	// Loop through all paths we've recorded and turn them into relative paths
	for( iPath=0; iPath<capturedPaths.length; ++iPath ) {
		if( capturedPaths[iPath].length > 2 ) {
			relativePaths.push( drawContext.mapPathToRelative(capturedPaths[iPath]) );
		}
	}	
	
	this.addFrame( relativePaths );
} // end AnimationContext.addFrame


//////////////////////////////////////////////////////////////////////////
// Returns the last frame of animation we added
AnimationContext.prototype.getLastFrame = function() {
	return this.animationFrames[this.animationFrames.length-1];
} // end AnimationContext.getLastFrame


//////////////////////////////////////////////////////////////////////////
// Returns the entire animation
AnimationContext.prototype.getAnimation = function() {
	return this.animationFrames;
} // end AnimationContext.getLastFrame