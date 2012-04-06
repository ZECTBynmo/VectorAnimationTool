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

//  CUT  ///////////////////////////////////////////////////////////////////



//updates the users link to reflect the number of active users
function updateUsersLink ( ) {
  var t = nicks.length.toString() + " user";
  if (nicks.length != 1) t += "s";
  $("#usersLink").text(t);
}

//handles another person joining chat
function userJoin(nick, timestamp) {
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

	// Put an avatar in the room in a random location
	var avatarArea = document.getElementById("avatarArea");
	
	// Create a new avatar image
	//var newAvatar = document.createElement('img');
	//newAvatar.setAttribute('src',"/avatar.png");
	//newAvatar.setAttribute('alt',"Avatar");
	
	//avatarArea.appendChild(newAvatar);
}

//handles someone leaving
function userPart(nick, timestamp) {
  //put it in the stream
  addMessage(nick, "left", timestamp, "part");
  //remove the user from the list
  for (var i = 0; i < nicks.length; i++) {
    if (nicks[i] == nick) {
      nicks.splice(i,1)
      break;
    }
  }
  //update the UI
  updateUsersLink();
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
              + '  <td class="date">' + util.timeString(time) + '</td>'
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
		jQuery.get("/part", {id: CONFIG.id}, function (data) { }, "json");
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
					userJoin(message.nick, message.timestamp);
					break;

				case "part":
					userPart(message.nick, message.timestamp);
					break;	
				case "nextUser":

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
		, error: function () {
			addMessage("", "long poll error. trying again...", new Date(), "error");
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

// Queue a video from our search result list
function setupVidQueue( iResult ) {
	queueVideo( CONFIG.searchResults[iResult].url, CONFIG.searchResults[iResult].title );
}


//////////////////////////////////////////////////////////////////////////
// Add a video to our video queue display
function queueVideo(url,title) {
	// Get the users video queue list
	var vidQueueList = document.getElementById( 'vidQueueList' );
	var strID = getIdFromUrl( url );
	
	// Create our new queue item
	var newQueueItem = document.createElement( 'li' );
	newQueueItem.setAttribute( 'class', "vidQueueList" );
	newQueueItem.innerHTML = title;
	
	// Set our custom attributes
	newQueueItem.setAttribute( 'vidTitle', title );	
	newQueueItem.setAttribute( 'vidID', strID );	
	
	// Add it to the queue list
	vidQueueList.appendChild(newQueueItem);
	
	// Update the users video queue list
	refreshVideoQueueUI();
} // end queueVideo()


//////////////////////////////////////////////////////////////////////////
// Display the current channel user queue
function displayUserQueue( userQueue ) {
	// Get the users video queue list
	var userQueueList = document.getElementById( 'userQueueList' );
	
	// Clear the previously added queue items
	while( userQueueList.hasChildNodes() ) {
		userQueueList.removeChild( userQueueList.lastChild );
	}
	
	for( iUser=0; iUser < userQueue.length; ++iUser ) {
		// Create our new queue item
		var newQueueItem = document.createElement( 'li' );
		newQueueItem.setAttribute( 'class', "userQueueList" );
		newQueueItem.innerHTML = userQueue[iUser].m_nick;
		
		// Add it to the queue list
		userQueueList.appendChild(newQueueItem);
	}
} // end displayUserQueue()


//////////////////////////////////////////////////////////////////////////
// Pull the video ID string out of the URL and alert the server about the new video
function startNewVid( url ) {
	var strRegexUrl = url.match( /www.youtube.com\/watch.*?=(\w+)/ );
	var strVidID= strRegexUrl[1];
	if( strVidID.length == "6nJ-uT0yVCE".length )
		alertNewVid( strVidID );
} // end startNewVid()


// Alert the server that we're starting a new video
function alertNewVid( strVidID ) {
	if (CONFIG.debug === false) {
		// XXX should be POST
		// XXX should add to messages immediately
		jQuery.get("/vidStart", {id: CONFIG.id, text: strVidID}, function (data) { }, "json");
	}
}

// Tell the server what our next video and its duration are
function alertNextVidInfo( strVidID, vidDuration ) {
	if (CONFIG.debug === false) {
		// XXX should be POST
		// XXX should add to messages immediately
		jQuery.get("/vidQueue", {id: CONFIG.id, text: strVidID, data: vidDuration}, function (data) { }, "json");
	}
}

// Tell the server to move to the next user
function alertNextUser() {
	if (CONFIG.debug === false) {
		// XXX should be POST
		// XXX should add to messages immediately
		jQuery.get("/nextUser", {id: CONFIG.id, text: CONFIG.nick, }, function (data) { }, "json");
	}
}

//////////////////////////////////////////////////////////////////////////
// Tell the server that we're adding ourselves to the user queue
function alertAddSelfToQueue() {
	if( CONFIG.debug === false ) {
		// XXX should be POST
		// XXX should add to messages immediately
		jQuery.get("/addUserToQueue", {id: CONFIG.id, text: CONFIG.nick }, function(data) {
			displayUserQueue( data.userQueue );
		}, "json");
	}
} // end alertAddSelfToQueue()


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
           , error: function () {
               alert("error connecting to server, are you already logged in?");
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

//if we can, notify the server that we're going away.
$(window).unload(function () {
	jQuery.get("/part", {id: CONFIG.id}, function (data) { }, "json");
});

// Recreate our queue list as a reorderable YUI list
function refreshVideoQueueUI() {
	// We have to go through the entire queue and give it the ability to work with the YUI stuff
	YUI().use('dd-constrain', 'dd-proxy', 'dd-drop', 'dd-scroll', function(Y) {
		//Listen for all drop:over events
		//Y.DD.DDM._debugShim = true;

		Y.DD.DDM.on('drop:over', function(e) {
			//Get a reference to our drag and drop nodes
			var drag = e.drag.get('node'),
				drop = e.drop.get('node');
			
			//Are we dropping on a li node?
			if (drop.get('tagName').toLowerCase() === 'li') {
				//Are we not going up?
				if (!goingUp) {
					drop = drop.get('nextSibling');
				}
				//Add the node to this list
				e.drop.get('node').get('parentNode').insertBefore(drag, drop);
				//Set the new parentScroll on the nodescroll plugin
				e.drag.nodescroll.set('parentScroll', e.drop.get('node').get('parentNode'));            
				//Resize this nodes shim, so we can drop on it later.
				e.drop.sizeShim();
			}
		});
		//Listen for all drag:drag events
		Y.DD.DDM.on('drag:drag', function(e) {
			//Get the last y point
			var y = e.target.lastXY[1];
			//is it greater than the lastY var?
			if (y < lastY) {
				//We are going up
				goingUp = true;
			} else {
				//We are going down.
				goingUp = false;
			}
			//Cache for next check
			lastY = y;
			Y.DD.DDM.syncActiveShims(true);
		});
		//Listen for all drag:start events
		Y.DD.DDM.on('drag:start', function(e) {
			//Get our drag object
			var drag = e.target;
			//Set some styles here
			drag.get('node').setStyle('opacity', '.25');
			drag.get('dragNode').set('innerHTML', drag.get('node').get('innerHTML'));
			drag.get('dragNode').setStyles({
				opacity: '.5',
				borderColor: drag.get('node').getStyle('borderColor'),
				backgroundColor: drag.get('node').getStyle('backgroundColor')
			});
		});
		//Listen for a drag:end events
		Y.DD.DDM.on('drag:end', function(e) {
			var drag = e.target;
			//Put our styles back
			drag.get('node').setStyles({
				visibility: '',
				opacity: '1'
			});
		});
		//Listen for all drag:drophit events
		Y.DD.DDM.on('drag:drophit', function(e) {
			var drop = e.drop.get('node'),
				drag = e.drag.get('node');

			//if we are not on an li, we must have been dropped on a ul
			if (drop.get('tagName').toLowerCase() !== 'li') {
				if (!drop.contains(drag)) {
					drop.appendChild(drag);
					//Set the new parentScroll on the nodescroll plugin
					e.drag.nodescroll.set('parentScroll', e.drop.get('node'));                
				}
			}
			
			var test = 0;
		});
		
		//Static Vars
		var goingUp = false, lastY = 0;

		//Get the list of li's in the lists and make them draggable
		var lis = Y.all('#userVidQueue ul li');
		
		// Clear our current queue into
		CONFIG.queueInfo= new Array();
		
		lis.each(function(v, k) {
			var dd = new Y.DD.Drag({
				node: v,
				target: {
					padding: '0 0 0 20'
				}
			}).plug(Y.Plugin.DDProxy, {
				moveOnEnd: false
			}).plug(Y.Plugin.DDConstrained, {
				constrain2node: '#userVidQueue'
			}).plug(Y.Plugin.DDNodeScroll, {
				node: v.get('parentNode')
			});			
			
			// Update our queue list with the new order
			//CONFIG.queueInfo.push( 
		});

		//Create simple targets for the 2 lists.
		var uls = Y.all('#userVidQueue ul');
		uls.each(function(v, k) {
			var tar = new Y.DD.Drop({
				node: v
			});
		});
	});
}
