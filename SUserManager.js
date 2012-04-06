//////////////////////////////////////////////////////////////////////////
// Node.js Exports
var globalNamespace = {};
(function (exports) {
	exports.getNewUserManager = function( eventHandler ) {
		newUserManager= new UserManager( eventHandler );
		return newUserManager;
	};
}(typeof exports === 'object' && exports || globalNamespace));


//////////////////////////////////////////////////////////////////////////
// Namespace (lol)
var sys = require("sys"),
	util = require("./util");
	
var SESSION_TIMEOUT = 60 * 1000;

//////////////////////////////////////////////////////////////////////////
// Constructor
function UserManager( eventHandler ) {
	this.m_userQueue = [];
	this.m_userList = [];
	this.m_eventHandler = eventHandler;
	
	
	//////////////////////////////////////////////////////////////////////////
	// Setup our events
	//////////////////////////////////////////////////////////////////////////
	// User Queue Changed
	this.m_eventHandler.createEvent( "userQueueChanged" );
	
	// User Turn Ended
	this.m_eventHandler.createEvent( "userTurnEnded" );
	this.m_eventHandler.addEventCallback( "userTurnEnded", this.handleUserTurnEnded, this );
	
	// Next User Started
	this.m_eventHandler.createEvent( "nextUserStarted" );
	
	// User Voted
	this.m_eventHandler.createEvent( "userVoted" );
	
	
	//////////////////////////////////////////////////////////////////////////
	// interval to kill off old sessions
	//////////////////////////////////////////////////////////////////////////
	var intervalScope= this;
	setInterval(function () {
		var now = new Date();
		for ( iUser=0; iUser<intervalScope.m_userList.length; ++iUser ) {
			var session = intervalScope.m_userList[iUser];

			if (now - session.m_timestamp > SESSION_TIMEOUT) {
				util.serverConsole(sys, "session: " + session.m_id + " timed out. Its timestamp was: " + session.m_timestamp);
				
				// Delete all records of this session
				intervalScope.destroySession( session.m_id );
			}
		}
	}, 1000);
} // end UserManager.UserManager()


//////////////////////////////////////////////////////////////////////////
// Handle user turn end events
UserManager.prototype.handleUserTurnEnded = function( callbackScope ) {
	//util.serverConsole(sys, this.m_userQueue.length + " users queued" );
	
	// Remove the 0th user from the queue, as long as there's more than one person queued
	if( callbackScope.m_userQueue.length > 1 ) {
		callbackScope.m_userQueue.splice( 0, 1 );
	}
	
	// Fire our queue changed event
	callbackScope.m_eventHandler.fireEvent( "userQueueChanged" );
	
	// Fire our next user event to notify the channel of the next user
	callbackScope.m_eventHandler.fireEvent( "nextUserStarted" );
	
}; // end UserManager.handleUserTurnEnded()


//////////////////////////////////////////////////////////////////////////
// Add a session to the channel's user list
UserManager.prototype.addSession = function( session ) {
	this.m_userList.push( session );
}; // end UserManager.addSession()


//////////////////////////////////////////////////////////////////////////
// Returns the session of the next user in the queue
UserManager.prototype.getNextQueuedUser = function() {
	return this.m_userQueue[0];
}; // end UserManager.addSession()


//////////////////////////////////////////////////////////////////////////
// Add a session to the channel's queue
UserManager.prototype.addUserToQueue = function( id ) {
	var iUser = this.getUserIndex( id );
	
	// Make sure the user is in the room
	if( iUser >= 0 ) {
		// Queue the user if they weren't already
		if( !this.isUserQueued(id) && util.exists(this.m_userList[iUser]) ) {
			this.m_userQueue.push( this.m_userList[iUser] );
			util.serverConsole(sys, "Added " + this.m_userList[iUser].m_nick + " to the user queue" );
			
			// Fire our queue changed event
			this.m_eventHandler.fireEvent( "userQueueChanged" );
		}
	}
}; // end UserManager.addSession()


//////////////////////////////////////////////////////////////////////////
// Returns whether the user is already in the queue
UserManager.prototype.isUserQueued = function( id ) {
	var isAlreadyQueued = false;
	for( iUser=0; iUser<this.m_userQueue.length; ++iUser ) {
		if( this.m_userQueue[iUser].m_id == id ) { 
			isAlreadyQueued = true; 
		}
	}
	
	return isAlreadyQueued;
}; // end UserManager.isUserQueued()


//////////////////////////////////////////////////////////////////////////
// Returns the users index in the user list
UserManager.prototype.getUserIndex = function( id ) {
	for( iUser=0; iUser<this.m_userList.length; ++iUser ) {
		if( this.m_userList[iUser].m_id == id ) {
			return iUser;
		}
	}
	
	// If we've gotten this far, the user isn't in the user list
	return -1;
}; // end UserManager.isUserPresent()


//////////////////////////////////////////////////////////////////////////
// Returns the current user queue
UserManager.prototype.getUserQueue = function() {
	return this.m_userQueue;
}; // end UserManager.getUserQueue()


//////////////////////////////////////////////////////////////////////////
// Returns a user session by its id
UserManager.prototype.getUserById = function( id ) {
	var userIndex= this.getUserIndex( id );
	
	var session = this.m_userList[userIndex];
	return session;
}; // end UserManager.getUserById()


//////////////////////////////////////////////////////////////////////////
// Returns an array of the current user list's nicks
UserManager.prototype.getAllUserNicks = function() {
	var nicks= [];
	
	for( iUser=0; iUser<this.m_userList.length; ++iUser ) {
		nicks.push( this.m_userList[iUser].m_nick );
	}
	
	return nicks;
}; // end UserManager.getAllUserNicks()


//////////////////////////////////////////////////////////////////////////
// Destroys a session
UserManager.prototype.destroySession = function( id ) {
	var user= this.getUserById( id );
	
	if( util.exists(user) ) {
		util.serverConsole( sys, "Destroying user session with nick: " + user.m_nick );
	} else {
		util.serverConsole( sys, "Tried to destroy a session that didn't exist" );
	}

	// Search through our user list for the user and delete it
	for( iUser=0; iUser<this.m_userList.length; ++iUser ) {
		if( this.m_userList[iUser].m_id == id ) {
			this.m_userList.splice( iUser, 1 );
			break;
		}
	}
	
	// Search through our user list for the user and delete it
	for( iUser=0; iUser<this.m_userQueue.length; ++iUser ) {
		if( this.m_userQueue[iUser].m_id == id ) {
			this.m_userQueue.splice( iUser, 1 );
			
			util.serverConsole( sys, "Removed the user from the queue" );
			
			// Fire our queue changed event
			this.m_eventHandler.fireEvent( "userQueueChanged" );
			
			break;
		}
	}
}; // end UserManager.destroySession()