//////////////////////////////////////////////////////////////////////////
// Node.js Exports
var globalNamespace = {};
(function (exports) {
	exports.getNewChannel = function( eventHandler ) {
		newChannel= new Channel( eventHandler );
		return newChannel;
	};
}(typeof exports === 'object' && exports || globalNamespace));

//////////////////////////////////////////////////////////////////////////
// Namespace (lol)
var MESSAGE_BACKLOG = 200,
	CALLBACK_LIFETIME= 30000,
	USER_CONTROL_LIFETIME= 5*60*1000;
	
var sys = require("sys"),
	util = require("./util");
	
var UserManagerImpl = require("./SUserManager");


//////////////////////////////////////////////////////////////////////////
// Constructor
function Channel( eventHandler ) {	
	// Utility objects
	this.m_sys = sys;
	this.m_util = util;
	this.m_eventHandler= eventHandler;
		
	// Local variables	
	this.m_messages = [];
	this.m_callbacks = [];
	this.m_vidID = "";
	this.m_nextVidID = "";
	this.m_nextVidDuration = 0;
	this.m_vidStart = new Date().getTime();
	this.m_isNextVidQueued= false;
	
	// User manager
	this.m_userManager = UserManagerImpl.getNewUserManager( eventHandler );
	this.m_eventHandler.addEventCallback( "nextUserStarted", this.handleNextUserStarted, this );


	// clear old callbacks
	// they can hang around for at most CALLBACK_LIFETIME.
	setInterval(function () {
		if( !this.m_callbacks || !this.m_messages ) return;
		
		var now = new Date();
		while ( this.m_callbacks.length > 0 && now - this.m_callbacks[0].timestamp > CALLBACK_LIFETIME ) {
			this.m_callbacks.shift().callback([]);
		}
	}, 3000);
}; // end Channel.Channel()


//////////////////////////////////////////////////////////////////////////
// Sends a message out to the channel
Channel.prototype.appendMessage = function( nick, type, text, target, data ) {
	// ////////////////////////////////////////////////////
	// nick = sender's name
	// type = message type
	// text = text contents of message
	// target = all users except target will discard this messages
	// data = whatever you want
	// ////////////////////////////////////////////////////

	var msg = { 
			  nick: nick /////////// add new message types to this list ////////////////////////
			, type: type // "msg", "join", "part", "vidStart", "vidPlay", "vidQueue", "nextUser", "userQueueChanged"
			, text: text ///////////////////////////////////////////////////////////////////////
			, timestamp: (new Date()).getTime()
			, target: target
			, data: data
	};
			
	// ////////////////////////////////////////////////////
	// msg = message to everyone in the chat dialog
	// join = a user has joined
	// part = a user has left
	// vidStart = a video is being forcefully swapped to everyone
	// vidPlay = a pre-queued video start is being pushed out to everyone
	// vidQueue = tell everyone to queue up a video
	// nextUser = the next person who will have playback control
	// ////////////////////////////////////////////////////

	switch (type) {
		case "msg":
			break;
		case "join":
			break;
		case "part":
			break;
		case "vidStart":
			this.m_util.serverConsole(this.m_sys, "Pushing vidStart out" );
			this.vidStart = new Date().getTime();
			this.m_vidID = text;
			break;
		case "vidQueue":
			this.m_util.serverConsole(this.m_sys, "Pushing vidQueue out" );
			this.m_nextVidID = text;
			this.m_nextVidDuration = data;
			this.m_util.serverConsole(this.m_sys, "Queueing video: " + text + " duration: " + data );
			break;
		case "vidPlay":
			this.m_util.serverConsole(this.m_sys, "Pushing vidPlay out" );
			var nextVidTimer= setTimeout( function() {
				// If we've already queued up the next video with a timer, kill the timer
				if( this.m_isNextVidQueued ) {
					clearInterval( nextVidTimer );
					this.m_isNextVidQueued = false;
				}
			}, this.m_nextVidDuration );
			
			this.m_vidStart = new Date().getTime();
			this.m_vidID = this.m_nextVidID;
			this.m_nextVidID = "";
			break;
		case "nextUser":
			this.m_util.serverConsole(this.m_sys, "Pushing nextUser out" );
			break;
	}
	
	if( msg.type == "nextUser" ) {
		this.m_util.serverConsole(this.m_sys,  msg.text );
	}
	
	this.m_messages.push( msg );

	while ( this.m_callbacks.length > 0 ) {
		this.m_callbacks.shift().callback([msg]);
	}

	while ( this.m_messages.length > MESSAGE_BACKLOG )
		this.m_messages.shift();
} // end Channel.appendMessage()


//////////////////////////////////////////////////////////////////////////
// A user is joining the channel
Channel.prototype.userJoin = function( session ) {
	// Add this user to the user manager's user list
	this.m_userManager.addSession( session );
	
	// Let the channel know we've added a session
	this.appendMessage(session.m_nick, "join");
	
	// If this is the first user to enter the channel, make him the next player automatically
	if( !util.exists(this.m_userManager.getNextQueuedUser()) ) {
		// Push the user into the user queue, because they're the only one in the room
		this.m_userManager.addUserToQueue( session.m_id );
		
		// Tell the channel what we've done
		this.m_eventHandler.fireEvent( "userTurnEnded" );
		
		this.m_util.serverConsole( this.m_sys, "first user joined, " + session.m_nick + " is next" );
	}
}; // end Channel.userJoin()


//////////////////////////////////////////////////////////////////////////
// Not sure what this does. Has something to do with receiving messages from the server..?
Channel.prototype.query = function( since, callback ) {
	var matching = [];
	
	this.m_util.serverConsole(this.m_sys, "Channel queried. we have: " + this.m_messages.length + " total messages right now.");
	for ( var i = 0; i < this.m_messages.length; i++ ) {
		var message = this.m_messages[i];
		if (message.timestamp > since)
			matching.push(message)
	}
	
	this.m_util.serverConsole(this.m_sys, "New messages for this session: " + matching.length);
	
	if ( matching.length != 0 ) {
		callback(matching);		
	} else {
		this.m_util.serverConsole(this.m_sys, "No new messages for this session. Jumping in the callbacks queue to wait for some messages." );
		this.m_callbacks.push({ timestamp: new Date(), callback: callback });
		this.m_util.serverConsole(this.m_sys, "Callbacks queue now has: " + this.m_callbacks.length + " sessions waiting.");
	}
}; // end Channel.query()


//////////////////////////////////////////////////////////////////////////
// Sets a random logged in user other than the reporer
Channel.prototype.setRandomOtherUser = function( since, callback ) {
	var matching = [];
	for (var i = 0; i < this.m_messages.length; i++ ) {
		var message = this.m_messages[i];
		if ( message.timestamp > since )
			matching.push( message );
	}

	if ( matching.length != 0 ) {
		callback( matching );
	} else {
		this.m_callbacks.push({ timestamp: new Date(), callback: callback });
	}
}; // end Channel.setRandomOtherUser()


//////////////////////////////////////////////////////////////////////////
// Returns the current user queue for this channel
Channel.prototype.getUserQueue = function( since, callback ) {
	return this.m_userManager.getUserQueue();
}; // end Channel.getUserQueue()


//////////////////////////////////////////////////////////////////////////
// Gets a user session out of the channel
Channel.prototype.destroySession = function( id ) {
	this.m_userManager.destroySession( id );
}; // end Channel.destroySession()


//////////////////////////////////////////////////////////////////////////
// Gets a user session by its id
Channel.prototype.getUserById = function( id ) {
	return this.m_userManager.getUserById( id );
}; // end Channel.getUserById()


//////////////////////////////////////////////////////////////////////////
// Adds a user to the channels queue
Channel.prototype.addUserToQueue = function( id ) {
	this.m_userManager.addUserToQueue( id );
}; // end Channel.addUserToQueue()


//////////////////////////////////////////////////////////////////////////
// Returns a list of the current users' nicks
Channel.prototype.getAllUserNicks = function( id ) {
	return this.m_userManager.getAllUserNicks( id );
}; // end Channel.getAllUserNicks()


//////////////////////////////////////////////////////////////////////////
// Handles the nextUserStarted event
Channel.prototype.handleNextUserStarted = function( callbackScope ) {
	var nextUserSession = callbackScope.m_userManager.getNextQueuedUser();
	
	// Just return if we didn't get a valid user session
	if( !util.exists(nextUserSession) ) { return; }
	
	callbackScope.appendMessage( "channel", "nextUser", nextUserSession.m_nick );
	
	// Set a timer so that the next user starts after USER_CONTROL_LIFETIME ms
	setTimeout( function() {
		// Fire our user turn ended event
		callbackScope.m_eventHandler.fireEvent( "userTurnEnded" );
	}, USER_CONTROL_LIFETIME );
	
}; // end Channel.handleNextUserStarted()
