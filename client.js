var CONFIG = { 
			debug: false, 
			nick: "#",   						// set in onConnect
			id: null,    						// set in onConnect
			last_message_time: 1,
			focus: true, 						// event listeners bound in onConnect
			unread: 0, 							// updated in the message-processing loop
			canReceiveMessages: false, 			// set to true in onConnect
			isYoutubePlayerInitialized: false 	// Set to true in onYouTubePlayerReady
};

var nicks = [];


/*
 * Returns a description of this past date in relative terms.
 * Takes an optional parameter (default: 0) setting the threshold in ms which
 * is considered "Just now".
 *
 * Examples, where new Date().toString() == "Mon Nov 23 2009 17:36:51 GMT-0500 (EST)":
 *
 * new Date().toRelativeTime()
 * --> 'Just now'
 *
 * new Date("Nov 21, 2009").toRelativeTime()
 * --> '2 days ago'
 *
 * // One second ago
 * new Date("Nov 23 2009 17:36:50 GMT-0500 (EST)").toRelativeTime()
 * --> '1 second ago'
 *
 * // One second ago, now setting a now_threshold to 5 seconds
 * new Date("Nov 23 2009 17:36:50 GMT-0500 (EST)").toRelativeTime(5000)
 * --> 'Just now'
 *
 */
 
Date.prototype.toRelativeTime = function(now_threshold) {
  var delta = new Date() - this;

  now_threshold = parseInt(now_threshold, 10);

  if (isNaN(now_threshold)) {
    now_threshold = 0;
  }

  if (delta <= now_threshold) {
    return 'Just now';
  }

  var units = null;
  var conversions = {
    millisecond: 1, // ms    -> ms
    second: 1000,   // ms    -> sec
    minute: 60,     // sec   -> min
    hour:   60,     // min   -> hour
    day:    24,     // hour  -> day
    month:  30,     // day   -> month (roughly)
    year:   12      // month -> year
  };

	for (var key in conversions) {
		if (delta < conversions[key]) {
			break;
		} else {
			units = key; // keeps track of the selected key over the iteration
			delta = delta / conversions[key];
		}
	}

  // pluralize a unit when the difference is greater than 1.
  delta = Math.floor(delta);
  if (delta !== 1) { units += "s"; }
  return [delta, units].join(" ");
};

/*
 * Wraps up a common pattern used with this plugin whereby you take a String
 * representation of a Date, and want back a date object.
 */
Date.fromString = function(str) {
  return new Date(Date.parse(str));
};


//updates the users link to reflect the number of active users
function updateUsersLink ( ) {
  var t = nicks.length.toString() + " user";
  if (nicks.length != 1) t += "s";
  $("#usersLink").text(t);
}

//handles another person joining chat
function userJoin(nick, id, timestamp) {
	// Put it in the stream
	addMessage(nick, "joined", timestamp, "join");
	
	// If we already know about this user, ignore it
	for (var i = 0; i < nicks.length; i++) {
		if (nicks[i] == nick) 
			return;
	}
	
	// Otherwise, add the user to the list
	nicks.push(nick);

	// Update the UI
	updateUsersLink();
	
	// Create a new user animation chunk
	addNewUserAnimation( nick, id );
}

//handles someone leaving
function userPart(nick, id, timestamp) {
	//put it in the stream
	addMessage(nick, "left", timestamp, "part");
	//remove the user from the list
	for (var i = 0; i < nicks.length; i++) {
		if (nicks[i] == nick) {
			nicks.splice(i,1);
			break;
		}
	}
	
	//update the UI
	updateUsersLink();

	if( typeof(id) == "undefined" ) { return; }

	// Remove this user's animation from the page
	var roomAnimationCanvases = document.getElementById( 'roomAnimationCanvases' );
	var oldAnimationChunk = document.getElementById( id );

	if( typeof(oldAnimationChunk) == "undefined" || typeof(roomAnimationCanvases) == "undefined" ) { return; }
  
	if( oldAnimationChunk && roomAnimationCanvases ) {
		roomAnimationCanvases.removeChild( oldAnimationChunk );
	}
}

// utility functions

util = {
  urlRE: /https?:\/\/([-\w\.]+)+(:\d+)?(\/([^\s]*(\?\S+)?)?)?/g, 

  //  html sanitizer 
  toStaticHTML: function(inputHtml) {
    inputHtml = inputHtml.toString();
    return inputHtml.replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;");
  }, 

  //pads n with zeros on the left,
  //digits is minimum length of output
  //zeroPad(3, 5); returns "005"
  //zeroPad(2, 500); returns "500"
  zeroPad: function (digits, n) {
    n = n.toString();
    while (n.length < digits) 
      n = '0' + n;
    return n;
  },

  //it is almost 8 o'clock PM here
  //timeString(new Date); returns "19:49"
  timeString: function (date) {
    var minutes = date.getMinutes().toString();
    var hours = date.getHours().toString();
    return this.zeroPad(2, hours) + ":" + this.zeroPad(2, minutes);
  },

  //does the argument only contain whitespace?
  isBlank: function(text) {
    var blank = /^\s*$/;
    return (text.match(blank) !== null);
  }
};

//used to keep the most recent messages visible
function scrollDown () {
	//$("#log").scrollTop = 100000000000000000;
	//$("#logHolder").scrollTop = $("#logHolder").scrollHeight;
	document.getElementById("logHolder").scrollTop=document.getElementById("logHolder").scrollHeight;
	//var log = document.getElementById("log");
	//log.scrollTop = 20;
	//window.scrollBy(0, 100000000000000000);
	//window.scrollBy(0, 100000000000000000);
	//$("#entry").focus();
}

//inserts an event into the stream for display
//the event may be a msg, join or part type
//from is the user, text is the body and time is the timestamp, defaulting to now
//_class is a css class to apply to the message, usefull for system events
function addMessage (from, text, time, _class) {
  if (text === null)
    return;

  if (time == null) {
    // if the time is null or undefined, use the current time.
    time = new Date();
  } else if ((time instanceof Date) === false) {
    // if it's a timestamp, interpret it
    time = new Date(time);
  }

  //every message you see is actually a table with 3 cols:
  //  the time,
  //  the person who caused the event,
  //  and the content
  var messageElement = $(document.createElement("table"));

  messageElement.addClass("message");
  if (_class)
    messageElement.addClass(_class);

  // sanitize
  text = util.toStaticHTML(text);
  
	// Recognize a switch videos command
	if( text.indexOf("*play: ") != -1 ) {
		m_vidPlayer.playVideoById( text.replace("*play: ",""), 0 );
	}
	
	// Alternate command for video switch. Allows pasting of a youtube URL.
	if( text.match(/www.youtube.com\/watch.*=\w+/) ){
		var myMatch = text.match(/www.youtube.com\/watch.*?=(\w+)/);
		if( myMatch ){
			var myId = myMatch[1];
		}
		
		m_vidPlayer.playVideoById( myId, 0 );
	}
	// Recognize a stop video command
	if( text.indexOf("*stop") != -1 ) {
		m_vidPlayer.stop();
	}
	
	// Recognize a pause video command
	if( text.indexOf("*pause") != -1 ) {
		m_vidPlayer.pause();
	}
	
	// Recognize a play video command
	if( text.indexOf("*play") != -1 ) {
		m_vidPlayer.playVideoById( play );
	}
 

  // If the current user said this, add a special css class
  var nick_re = new RegExp(CONFIG.nick);
  if (nick_re.exec(text))
    messageElement.addClass("personal");

  // replace URLs with links
  text = text.replace(util.urlRE, '<a target="_blank" href="$&">$&</a>');

  var content = '<tr>'
//              + '  <td class="date">' + util.timeString(time) + '</td>'
              + '  <td class="nick">' + util.toStaticHTML(from) + '</td>'
              + '  <td class="msg-text">' + text  + '</td>'
              + '</tr>'
              ;
  messageElement.html(content);

  //the log is the stream that we view
  $("#log").append(messageElement);
  
  //always view the most recent message when it is added
  scrollDown();
}

function updateRSS () {
	var bytes = parseInt(rss);
	if (bytes) {
		var megabytes = bytes / (1024*1024);
		megabytes = Math.round(megabytes*10)/10;
		$("#rss").text(megabytes.toString());
	}
}

function updateUptime () {
	if (starttime) {
		$("#uptime").text(starttime.toRelativeTime());
	}
}
var transmission_errors = 0;
var first_poll = true;


// process updates if we have any, request updates from the server,
// and call again with response. the last part is like recursion except the call
// is being made from the response handler, and not at some point during the
// function's execution.
function longPoll (data) {
	if (transmission_errors > 2) {
		// We've gotten too many errors. Log out and show the login screen again
		jQuery.get("/part", {id: CONFIG.id}, function (data) {
			// Reset our transmission error count
			transmission_errors = 0;
		}, "json");
		showConnect();
		return;
	}

	if (data && data.rss) {
		rss = data.rss;
		//updateRSS();
	}

	// process any updates we may have
	// data will be null on the first call of longPoll
	if (data && data.messages) {  
	
		for (var i = 0; i < data.messages.length; i++) {
			var message = data.messages[i];
			
			// If we got a targeted message that's not for us, don't do anything
			if( message.target && message.target != CONFIG.nick )
				continue;

			// track oldest message so we only request newer messages from server
			if ( message.timestamp > CONFIG.last_message_time )
				CONFIG.last_message_time = message.timestamp;
		
			if( !CONFIG.canReceiveMessages )
				break;
				
			// Make sure we're not trying to add any messages that were from before the user joined
			var messageDate= new Date( message.timestamp );
			var sessionStartDate= new Date( starttime );
			
			if( messageDate < sessionStartDate ) continue;

			// dispatch new messages to their appropriate handlers
			switch (message.type) {
				case "msg":
					if(!CONFIG.focus){
						CONFIG.unread++;
					}
					addMessage(message.nick, message.text, message.timestamp);
					break;

				case "join":
					userJoin(message.nick, message.data, message.timestamp);
					break;

				case "part":
					userPart(message.nick, message.data, message.timestamp);
					break;	
				case "newFrame":
					receiveFrameUpdate( message.nick, message.text, message.data );

				break;
			}
		} // end for each message
		
		// update the document title to include unread message count if blurred
		updateTitle();

		//only after the first request for messages do we want to show who is here
		if (first_poll) {
			first_poll = false;
		}
	
	}

	// Make another request
	$.ajax({ cache: false
		, type: "GET"
		, url: "/recv"
		, dataType: "json"
		, data: { since: CONFIG.last_message_time, id: CONFIG.id }
		, error: function ( data ) {
			addMessage("", "long poll error: " + data.error, new Date(), "error");
			transmission_errors += 1;
			//don't flood the servers on error, wait 10 seconds before retrying
			setTimeout(longPoll, 10*1000);
		}
		, success: function (data) {
			transmission_errors = 0;
			//if everything went well, begin another request immediately
			//the server will take a long time to respond
			//how long? well, it will wait until there is another message
			//and then it will return it to us and close the connection.
			//since the connection is closed when we get data, we longPoll again
			longPoll(data);
		}
	});
}

// Pull the youtube ID string out of a normal url
function getIdFromUrl(url) {
	var myMatch = url.match(/www.youtube.com\/watch.*?=(\w+)/);
	if( myMatch ){
		// The first match will be in index 1, because 0 is the original string
		var myId = myMatch[1];
		return myId;
	}else{
		return false;
	}
}

//submit a new message to the server
function send(msg) {
	if (CONFIG.debug === false) {
		// XXX should be POST
		// XXX should add to messages immediately
		jQuery.get( "/send", {id: CONFIG.id, text: msg}, function (data) { }, "json" );
	}
}

// Transition the page to the state that prompts the user for a nickname
function showConnect () {
	$("#connect").show();
	$("#loading").hide();
	$("#toolbar").hide();
	$("#vidHolder").hide();
	$("#nickInput").focus();
}

// transition the page to the loading screen
function showLoad () {
	$("#connect").hide();
	$("#loading").show();
	$("#toolbar").hide();
}

//transition the page to the main chat view, putting the cursor in the textfield
function showChat (nick) {
	$("#toolbar").show();
	$("#entry").focus();
	$("#vidHolder").show();
	$("#connect").hide();
	$("#loading").hide();

	scrollDown();
}

//we want to show a count of unread messages when the window does not have focus
function updateTitle(){
	if (CONFIG.unread) {
		document.title = "(" + CONFIG.unread.toString() + ") Animate Together";
	} else {
		document.title = "Animate Together";
	}
}

// daemon start time
var starttime;
// daemon memory usage
var rss;

//handle the server's response to our nickname and join request
function onConnect (session) {
	if (session.error) {
		alert("error connecting: " + session.error);
		showConnect();
		return;
	}

	CONFIG.nick = session.nick;
	CONFIG.id   = session.id;
	CONFIG.queueInfo = new Array();
	CONFIG.searchResults = new Array();
	starttime   = new Date(session.starttime);
	rss         = session.rss;
	updateRSS();
	updateUptime();

	//update the UI to show the chat
	showChat(CONFIG.nick);

	//listen for browser events so we know to update the document title
	$(window).bind("blur", function() {
		CONFIG.focus = false;
		updateTitle();
	});

	$(window).bind("focus", function() {
		CONFIG.focus = true;
		CONFIG.unread = 0;
		updateTitle();
	});
  
	CONFIG.canReceiveMessages = true;
	
	//begin listening for updates right away
	//interestingly, we don't need to join a room to get its updates
	//we just don't show the chat stream to the user until we create a session
	longPoll();
	
	// Send a keepalive message to the channel every half of the timeout time
	setInterval(function () {
	  jQuery.get("/keepalive", {id: CONFIG.id}, function (data) { }, "json");
	}, 30*1000);
}

//add a list of present chat members to the stream
function outputUsers () {
	var nick_string = nicks.length > 0 ? nicks.join(", ") : "(none)";
	addMessage("users:", nick_string, new Date(), "notice");
	return false;
}

//////////////////////////////////////////////////////////////////////////
// Get a list of the users presently in the room, and add it to the stream
function who() {
	jQuery.get("/who", {}, function (data, status) {
		if (status != "success") return;
		nicks = data.nicks;
		outputUsers();
		updateUsersLink();
	}, "json");
} // end who()


//////////////////////////////////////////////////////////////////////////
// Get a list of the users currently queued for control
function getUserQueue() {
	jQuery.get("/getUserQueue", {}, function (data, status) {
		if (status != "success") return;
		var queuedNicks = data.nicks;
		displayUserQueue( queuedNicks );
	}, "json");
} // end getUserQueue()


$(document).ready(function() {
  //submit new messages when the user hits enter if the message isnt blank
  $("#entry").keypress(function (e) {
    if (e.keyCode != 13 /* Return */) return;
    var msg = $("#entry").attr("value").replace("\n", "");
    if (!util.isBlank(msg)) send(msg);
    $("#entry").attr("value", ""); // clear the entry field.
  });

  $("#usersLink").click(outputUsers);

  //try joining the chat when the user clicks the connect button
  $("#connectButton").click(function () {
    //lock the UI while waiting for a response
    showLoad();
    var nick = $("#nickInput").attr("value");

    //dont bother the backend if we fail easy validations
    if (nick.length > 50) {
      alert("Nick too long. 50 character max.");
      showConnect();
      return false;
    }

    //more validations
    if (/[^\w_\-^!]/.exec(nick)) {
      alert("Bad character in nick. Can only have letters, numbers, and '_', '-', '^', '!'");
      showConnect();
      return false;
    }

    //make the actual join request to the server
    $.ajax({ cache: false
           , type: "GET" // XXX should be POST
           , dataType: "json"
           , url: "/join"
           , data: { nick: nick }
           , error: function( data ) {
               alert("Error connecting to server: " + data.error );
			   who();
               showConnect();
             }
           , success: onConnect
	});
    return false;
  });

  // update the daemon uptime every 10 seconds
  setInterval(function () {
    //updateUptime();
  }, 10*1000);

  if (CONFIG.debug) {
    $("#loading").hide();
    $("#connect").hide();
    scrollDown();
    return;
  }

  // remove fixtures
  $("#log table").remove();

  showConnect();
});


//////////////////////////////////////////////////////////////////////////
// if we can, notify the server that we're going away.
$(window).unload(function () {
	jQuery.get("/part", {id: CONFIG.id}, function (data) { }, "json");
}); // end window unload


//////////////////////////////////////////////////////////////////////////
// Insert a new animation chunk into the window for a new user
function addNewUserAnimation( nick, id ) {

	var animationChunk = document.createElement( "td" );
	animationChunk.setAttribute( 'class', "animationChunk" );
	animationChunk.setAttribute( 'id', id );
	
	var nickRow = document.createElement( 'tr' );
	nickRow.setAttribute( 'class', "nick" );
	nickRow.setAttribute( 'width', "133" );
	nickRow.setAttribute( 'height', "12" );
	nickRow.innerHTML = nick;	
	
	// Create our animation
	var newAnimation = document.createElement( 'canvas' );
	newAnimation.setAttribute( 'id', "anim_" + id );
	newAnimation.setAttribute( 'class', "animation" );
	newAnimation.setAttribute( 'width', "133" );
	newAnimation.setAttribute( 'height', "100" );
	
	// Create our animation area
	var newAnimationArea = document.createElement( 'td' );
	newAnimationArea.setAttribute( 'class', "animationContext" );
	newAnimationArea.setAttribute( 'width', "133" );
	newAnimationArea.setAttribute( 'height', "100" );
	
	// Put our animation inside of our animation area
	newAnimationArea.appendChild( newAnimation );
	
	// Grab our animation canvas area
	var animationCanvasArea= document.getElementById( "roomAnimationCanvases" );
	
	// Add our pieces to the new chunk
	animationChunk.appendChild( nickRow );
	animationChunk.appendChild( newAnimationArea );
	
	// Put our pieces into the page
	animationCanvasArea.appendChild( animationChunk );
  
	// Now create a new animation inside of the chunk we just created
	newAnimation = new AnimationContext( "anim_" + id );
	
	animContexts.push( newAnimation );
  
} // end addNewUserAnimation()


//////////////////////////////////////////////////////////////////////////
// Pushes our new frame out to the server
function broadcastNewFrame( frame ) {
	var frameJSON= JSON.stringify( frame );
	
	jQuery.get( "/newFrame", {"id": CONFIG.id, "paths": frameJSON}, function (data) { }, "json" );
	
	/*
	jQuery.get("/newFrame", { id: CONFIG.id, paths: frame }, function (data, status) {
		if (status != "success") return;		
		
	}, "json");
	*/
} // end broadcastNewFrame()


//////////////////////////////////////////////////////////////////////////
// Receives a new animation and pushes it out to the appropriate animation canvas
function receiveFrameUpdate( nick, id, animation ) {
	var uAnimationIndex=0;

	// Grab our animation corresponding to this ID
	for( iAnimation=0; iAnimation<animContexts.length; ++iAnimation ) {
		var strContextName = "anim_" + id;
		if( animContexts[iAnimation].getElementName() == strContextName ) {
			uAnimationIndex = iAnimation;
			break;
		}
	} // end for each animation
	
	var animationContext = animContexts[uAnimationIndex];
	
	// Just get out if we don't have an animation
	if( typeof(animationContext) == "undefined" ) { return; }
	
	var frame = JSON.parse( animation );
	
	// Push the frame into the animation
	animationContext.addFrameAsAbsolute( frame );
} // end receiveFrameUpdate()