var CAPUTURE_INTERVAL_MILLIS = 20;
var ANIMATION_INTERVAL_MILLIS = 200;

// All frame variables
var animationPaths = new Array();	// All drawing code recorded so far organized by [frame][path][point]
var frameToDraw = 0;				// The last frame we drew

// Per frame drawing variables
var capturedPaths = new Array();	// The full array of paths that we've captured for the current frame
var currentPath= new Array();		// The path that we're currently recording from mouseMove events
var lastDrawnPoint = 0;				// The last point we drew in the main drawing context (we don't want to draw over old line segments)

// Our draw contexts
var drawContext;					// Main drawing context
var miniDrawContext;				// Small preview context for the current slide
var animationContext;				// Small preview context for the full animation

// Our Animator
var animator = new Animator( );
var animContexts = new Array();

// Status flag
var isInitialized = false;			// Set when the page is initialized
var isMouseDown = false;		// Set when the mouse is down

// HTML elements, just created here so we can know whether
// we're drawing within them inside global functions
var canvasContainer;
var canvas;

// Keep everything in anonymous function, called on window load.
if(window.addEventListener) {
window.addEventListener('load', function () {
	// Create a new animation context and push it into our collection
	animationContext = new AnimationContext( "animationCanvas" );
	animContexts.push( animationContext );

	// Grab our UI elements and set our initialized flag
	canvasContainer = document.getElementById( "container" );
	canvas= document.getElementById( "canvas" );
	isInitialized= true;
	
	// Create our draw contexts
	drawContext = new DrawContext();
	miniDrawContext = new DrawContext( "miniCanvas" );
	
	// Draw our background
	//drawContext.fillRect( 0, 0, drawContext.getWidth(), drawContext.getHeight(), "#fff" );
	
	// Draw our borders
	drawContext.drawRect( 0, 0, drawContext.getWidth(), drawContext.getHeight() );
	miniDrawContext.drawRect( 0, 0, miniDrawContext.getWidth(), miniDrawContext.getHeight() );
	
	// Our mouse event handlers
	addEventListener( "mousedown", captureMouseDown, false );
	addEventListener( "mouseup", captureMouseUp, false );
	addEventListener( "mousemove", captureMouseMove, false );
	
	var clearIntervalFlag = false;
	
	// Constantly draw the current animation
	var animationInterval = setInterval( function() {
		for( iAnimation = 0; iAnimation<animContexts.length; ++iAnimation ) {
		// Tell this animation context to draw it's next frame
			animContexts[iAnimation].drawNextFrame( animContexts[iAnimation] );
		} // end for each animation
		//animationContext.drawNextFrame( animationContext );
	}, ANIMATION_INTERVAL_MILLIS );
	
	// Our mouse move handler
	function captureMouseMove( event ) {
		// Get out if we're starting outside the canvas or the mouse isn't down
		if( !isEventInsideCanvas(event) || !isMouseDown ) { return; }
		
		var newPoint = { 
			x: event.clientX ,
			y: event.clientY
		};
		
		if( currentPath.length == 0 || currentPath[currentPath.length-1].x != newPoint.x || currentPath[currentPath.length-1].y != newPoint.y ) {
			currentPath.push( newPoint );
		}
	}
	
	// Our mouse down event handler
	function captureMouseDown( event ) {	
	
		// Get out if we're starting outside the canvas
		if( !isEventInsideCanvas(event) ) { return; }
		
		// Create an array to capture this new path
		currentPath = new Array();
		lastDrawnPoint = 0;
		
		isMouseDown = true;
		
		// Capture the mouse and draw position every CAPUTURE_INTERVAL_MILLIS
		var newPathInterval = setInterval(function () {
			if( clearIntervalFlag ) {
				clearInterval( newPathInterval );
				clearIntervalFlag = false;
			}
			
			if( currentPath.length == 0 || lastDrawnPoint >= currentPath.length - 1 ) return;
			
			// Get the path since we last drew
			var tempPath = new Array();
			
			//tempPath.push( currentPath[lastDrawnPoint] );
			
			for( iPoint=0; iPoint<currentPath.length-lastDrawnPoint; ++iPoint ) {
				tempPath.push( currentPath[lastDrawnPoint + iPoint] );
			}
			
			lastDrawnPoint = currentPath.length - 1;
			
			// Clear the canvas and then redraw everything
			drawContext.drawPolyPoint( tempPath, 3 ); 
		}, CAPUTURE_INTERVAL_MILLIS);		
		
	}
	
	// Handle mouse ups to
	function captureMouseUp( event ) {
		clearIntervalFlag = false;
		isMouseDown = false;
		
		// If we just stopped recording a path, push it onto our archived paths, and clear it
		if( currentPath.length > 2 ) {
			capturedPaths.push( currentPath );
			
			currentPath = new Array();
		}
	}
	
}, false); }


// Copies the captured from the largs canvas into the mini canvas
function copyToMiniCanvas() {
	var relativePaths = new Array();

	// Loop through all paths we've recorded and turn them into relative paths
	for( iPath=0; iPath<capturedPaths.length; ++iPath ) {
		if( capturedPaths[iPath].length > 2 ) {
			relativePaths.push( drawContext.mapPathToRelative(capturedPaths[iPath]) );
		}
	}
	
	miniDrawContext.drawMultiPolyPointRelative( relativePaths, 1 );
}

// Clears the canvas and deletes our current arrays
function clearCanvas() {
	if( isInitialized ) {
		drawContext.clear();
		miniDrawContext.clear();
		capturedPaths = new Array();
		currentPath = new Array();
		
		// Redraw our border
		drawContext.drawRect( 0, 0, drawContext.getWidth(), drawContext.getHeight() );
		miniDrawContext.drawRect( 0, 0, miniDrawContext.getWidth(), miniDrawContext.getHeight() );
	}
}

// Clears the entire animation
function clearAnimation() {
	animationContext.clearAnimation();

	broadcastClearAnimation();
}

// Clears the canvas and redraws everything on it
function redrawCanvas() {
	drawContext.clear();
	
	for( iPath=0; iPath<capturedPaths.length; ++iPath ) {
		if( capturedPaths[iPath].length > 2 ) {
			drawContext.drawPolyPoint( capturedPaths[iPath] );
		}
	}
}

// Returns whether an event is within the canvas
function isEventInsideCanvas( event ) {
	// Make sure the mouse event is inside the canvas container
	if( event.clientX > canvasContainer.offsetLeft && event.clientX < canvasContainer.offsetLeft + canvas.width && 
		event.clientY > canvasContainer.offsetTop && event.clientY < canvasContainer.offsetTop + canvas.height ) {
		return true;
	} else {
		return false;
	}
}

// Push the current frame into the animation
function pushAnimationFrame() {
	if( capturedPaths.length > 0 ) {	
		animationContext.addFrameAsAbsolute( capturedPaths );
		
		// Tell the server about our changes
		broadcastNewFrame( capturedPaths );
		
		clearCanvas();
		
		// Draw the last frame we drew
		var relativePaths = new Array();
		
		var lastFrame = animationContext.getLastFrame();
		
		drawContext.setAlpha( 0.3 );
		drawContext.drawMultiPolyPointRelative( lastFrame, 3 );
		drawContext.setAlpha( 1 );
	}
}