HOST = null; // localhost
PORT = 3001;

// when the daemon started
var starttime = (new Date()).getTime();

var mem = process.memoryUsage();

// every 10 seconds poll for the memory.
setInterval(function () {
  mem = process.memoryUsage();
}, 10*1000);

//////////////////////////////////////////////////////////////////////////
// Require custom and 3rd party modules
//////////////////////////////////////////////////////////////////////////
var fu = require("./fu"),
    sys = require("sys"),
    url = require("url"),
    qs = require("querystring"),
	util = require("./util"),
	SChannelImpl = require("./SChannel"),
	UserSessionImpl = require("./SUserSession");

// Event Handler
var	m_eventHandler = require("./eventHandler").getNewEventHandler();

fu.listen(Number(process.env.PORT || PORT), HOST);

//////////////////////////////////////////////////////////////////////////
// Send these files to the client
//////////////////////////////////////////////////////////////////////////
// ---------------------------------------------------------------------------------------------
// Main Page and CSS
// ---------------------------------------------------------------------------------------------
fu.get("/", fu.staticHandler("VectorDrawingTool.html"));
fu.get("/VectorDrawingTool.html", fu.staticHandler("VectorDrawingTool.html"));
fu.get("/style.css", fu.staticHandler("style.css"));


// ---------------------------------------------------------------------------------------------
// Internal javascript
// ---------------------------------------------------------------------------------------------
fu.get("/util.js", fu.staticHandler("util.js"));
fu.get("/client.js", fu.staticHandler("client.js"));
fu.get("/CDrawContext.js", fu.staticHandler("CDrawContext.js"));
fu.get("/CAnimation.js", fu.staticHandler("CAnimation.js"));
fu.get("/CAnimator.js", fu.staticHandler("CAnimator.js"));
fu.get("/VectorDrawingTool.js", fu.staticHandler("VectorDrawingTool.js"));


// ---------------------------------------------------------------------------------------------
// jQuery files
// ---------------------------------------------------------------------------------------------

fu.get("/jquery-1.7.1.min.js", fu.staticHandler("jquery-1.7.1.min.js"));
//non-minified (for debugging)
fu.get("/jquery-ui/development-bundle/jquery-1.7.1.js", fu.staticHandler("jquery-ui/development-bundle/jquery-1.7.1.js"));
fu.get("/jquery-ui/css/smoothness/jquery-ui-1.8.19.custom.css", fu.staticHandler("jquery-ui/css/smoothness/jquery-ui-1.8.19.custom.css"));
fu.get("/jquery-ui/js/jquery-ui-1.8.19.custom.min.js", fu.staticHandler("jquery-ui/js/jquery-ui-1.8.19.custom.min.js"));
//non-minified (for debugging)
fu.get("/jquery-ui/development-bundle/ui/jquery-ui-1.8.19.custom.js", fu.staticHandler("jquery-ui/development-bundle/ui/jquery-ui-1.8.19.custom.js"));
fu.staticDirHandler("jquery-ui/css/smoothness/images/");
fu.get("/jquery-ui/js/jquery-ui-1.8.19.custom.min.js", fu.staticHandler("jquery-ui/js/jquery-ui-1.8.19.custom.min.js"));


/*
// ---------------------------------------------------------------------------------------------
// jQuery plugins
// ---------------------------------------------------------------------------------------------
fu.get("/diQuery-collapsiblePanel.css", fu.staticHandler("diQuery-collapsiblePanel.css"));		// Collapsible panel
fu.get("/diQuery-collapsiblePanel.js", fu.staticHandler("diQuery-collapsiblePanel.js"));
fu.get("/Countdown/jquery.countdown.js", fu.staticHandler("Countdown/jquery.countdown.js"));				// Countdown widget
fu.get("/Countdown/jquery.countdown.css", fu.staticHandler("Countdown/jquery.countdown.css"));
*/

// Create our channel and listen for its relevant
var m_channel = new SChannelImpl.getNewChannel( m_eventHandler );


//////////////////////////////////////////////////////////////////////////
// who received
fu.get("/who", function (req, res) {
	util.serverConsole( sys, "who received:" );
	var nicks = [];
	
	nicks = m_channel.getAllUserNicks();
	
	if( !util.exists( nicks ) ) {
		util.serverConsole( sys, "who called before we had any users" );
		return;
	}
	
	util.serverConsole( sys, nicks.length + " users found" );
	res.simpleJSON(200, { 
		nicks: nicks,
		rss: mem.rss
	});
}); // end who


//////////////////////////////////////////////////////////////////////////
// newFrame received
fu.get("/newFrame", function (req, res, fullBody) {
	util.serverConsole( sys, "newFrame:" );
	
	// parse the received body data
	var decodedBody = qs.parse(fullBody);
	
	var id = decodedBody.id;
	var animation = decodedBody.paths;
	
	m_channel.appendMessage( "channel", "newFrame", id, "", animation );
	
	res.simpleJSON(200, { 
		rss: mem.rss
	});
	
	res.end();
}); // end /newFrame


//////////////////////////////////////////////////////////////////////////
// clearAnimation received
fu.get("/clearAnimation", function (req, res, fullBody) {
	util.serverConsole( sys, "clearAnimation:" );
	
	// parse the received body data
	var decodedBody = qs.parse(fullBody);
	
	var id = qs.parse(url.parse(req.url).query).id;
	var nick = qs.parse(url.parse(req.url).query).nick;
	
	m_channel.appendMessage( nick, "clearAnimation", "", "", id );
	
	res.simpleJSON(200, { 
		rss: mem.rss
	});
	
	res.end();
}); // end /clearAnimation


//////////////////////////////////////////////////////////////////////////
// join received
fu.get("/join", function (req, res) {
	util.serverConsole(sys, "join received:" );
	
	var nick = qs.parse(url.parse(req.url).query).nick;
	if( nick == null || nick.length == 0 ) {
		res.simpleJSON(400, {error: "Bad nick."});
		return;
	}
	
	var isNickUsed = m_channel.isNickUsed( nick );
	
	if( isNickUsed ) {
		res.simpleJSON(400, {error: "Nick in use"});
		return;
	}
	
	var session = UserSessionImpl.getNewUserSession( nick );
	
	m_channel.userJoin( session );
	
	res.simpleJSON(200, { 
		id: session.m_id,
        nick: session.m_nick,
        rss: mem.rss,
        starttime: starttime
	});
					  
}); // end join


//////////////////////////////////////////////////////////////////////////
// part received
fu.get("/part", function (req, res) {
	util.serverConsole(sys, "\npart received:" );
	var id = qs.parse(url.parse(req.url).query).id;
	
	if ( id ) {		
		// Delete all records of this session
		m_channel.destroySession( id );
	}
	res.simpleJSON(200, { rss: mem.rss });
}); // end part


//////////////////////////////////////////////////////////////////////////
// nextUser received
fu.get("/nextUser", function ( req, res ) {
	util.serverConsole(sys, "nextUser received:" );
	var sessionID = qs.parse( url.parse(req.url).query ).id;
	var nextUser = qs.parse( url.parse(req.url).query ).text;
	util.serverConsole(sys,  "Changing user" );
	
	var session = m_channel.getUserById( sessionID );
	if ( !session ) {
		util.serverConsole(sys,  "No session by ID " + sessionID );
		util.serverConsole(sys,  "Changing user back to " + nextUser );
		return;
	}
	
	// Fire our user turn ended event
	m_eventHandler.fireEvent( "userTurnEnded" );
	
	//setRandomOtherUser( session.m_nick );
}); // end nextUser


var fileList= new Array();
//////////////////////////////////////////////////////////////////////////
// requestImageFilenames received
// Tells us to gather a list of the image files that are sitting in the given directory
fu.get("/requestImageFilenames", function (req, res) {
	util.serverConsole(sys, "requestImageFilenames received" );
	var strFolderName = qs.parse(url.parse(req.url).query).dir;
	
	fu.staticDirHandler( strFolderName, false, true );
	
	res.simpleJSON(200, { rss: mem.rss });
}); // end requestImageFilenames

//////////////////////////////////////////////////////////////////////////
// getImageFilenames received
// Returns the images we got earlier
fu.get("/getImageFilenames", function (req, res) {
	util.serverConsole(sys, "getImageFilenames received" );
	var strFolderName = qs.parse(url.parse(req.url).query).dir;
	
	res.simpleJSON(200, { rss: mem.rss, files: fileList });
}); // end getImageFilenames


//////////////////////////////////////////////////////////////////////////
// vidQueue received
// A user is notifying us of a video to queue up for everyone
fu.get("/vidQueue", function (req, res) {
	util.serverConsole(sys, "\nvidQue received:" );

	util.serverConsole(sys, "Next Video: " + vidID + "\nqueued by " + m_channel.m_nextUser );

	var sessionID = qs.parse(url.parse(req.url).query).id;
	var vidDuration = qs.parse(url.parse(req.url).query).data;
	var vidID = qs.parse(url.parse(req.url).query).text;
	

	var session = m_channel.getUserById( sessionID );
	if (!session) {
		res.simpleJSON(400, { error: "No such session id" });
		return;
	}
	
	util.serverConsole(sys, "Next Video: " + vidID + "\nplayed by " + m_channel.m_nextUser );
	m_channel.appendMessage( session.m_nick, "vidStart", vidID);
		
	util.serverConsole(sys,  m_channel.m_nextUser );
	
	res.simpleJSON(200, { rss: mem.rss });
}); // end vidQueue


//////////////////////////////////////////////////////////////////////////
// recv received
// The client has asked for any updates that are available from the server
fu.get("/recv", function (req, res) {
	if (!qs.parse(url.parse(req.url).query).since) {
		res.simpleJSON(400, { error: "Must supply since parameter" });
		return;
	}
	var id = qs.parse(url.parse(req.url).query).id;
	
	var session;
	var since = parseInt(qs.parse(url.parse(req.url).query).since, 10);
	var lastMessageReceivedTime = new Date(since);
	
	if ( id ) {
		session = m_channel.getUserById( id );
		
		// If the session doesn't exist, respond with an error and get out
		if( !util.exists(session) ) { 
			res.simpleJSON(400, { error: "No such session id" });
			return; 
		}
		
		m_channel.pokeUser( id );
		//util.serverConsole(sys, "/recv called by user:" + session.m_nick + ", id:" + session.m_id + ", lastMessageReceivedTime: " + lastMessageReceivedTime.toString());
	} else {
		//util.serverConsole(sys, "/recv called by unknown session with id:" + id + ", lastMessageReceivedTime: " + lastMessageReceivedTime.toString());	
	}
	
	m_channel.query(since, function (messages) {
		if (session) { 
			session.poke();
			util.serverConsole(sys, messages);
		} else {
			util.serverConsole(sys, "no such session" );
		}
		res.simpleJSON(200, { messages: messages, rss: mem.rss });
		util.serverConsole(sys, messages);		
	});
}); // end recv


//////////////////////////////////////////////////////////////////////////
// send received
fu.get("/send", function (req, res) {
	util.serverConsole(sys, "send received:" );
	var id = qs.parse(url.parse(req.url).query).id;
	var text = qs.parse(url.parse(req.url).query).text;

	var session = m_channel.getUserById( id );
	if (!session || !text) {
		res.simpleJSON(400, { error: "No such session id" });
		return;
	}

	session.poke();

	m_channel.appendMessage(session.m_nick, "msg", text);
	res.simpleJSON(200, { rss: mem.rss });
}); // end send


//////////////////////////////////////////////////////////////////////////
// keepalive received
fu.get("/keepalive", function (req, res) {
	//util.serverConsole(sys, "keepalive received:" );
	var id = qs.parse(url.parse(req.url).query).id;

	var session = m_channel.getUserById( id );
	if ( !session ) {
		res.simpleJSON(400, { error: "No such session id" });
		return;
	}
	
	// Poke the session so we stay alive when the server isn't pushing messages out
	session.poke();

	res.simpleJSON(200, { rss: mem.rss });
});	// end keepalive


//////////////////////////////////////////////////////////////////////////
// We got a message to add a user to a channel's queue
fu.get("/addUserToQueue", function (req, res) {
	util.serverConsole(sys, "addUserToQueue received:" );
	var id = qs.parse(url.parse(req.url).query).id;

	var session = m_channel.getUserById( id );
	if ( !session ) {
		res.simpleJSON(400, { error: "No such session id" });
		return;
	}
	
	m_channel.addUserToQueue( id );
	
	// Get the current user queue and send it to the client
	var currentUserQueue = m_channel.getUserQueue();
	res.simpleJSON(200, { userQueue: currentUserQueue });
	
	util.serverConsole(sys, "Queue now has " + m_channel.getUserQueue().length + " users\n" );

});	// end addUserToQueue