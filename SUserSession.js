//////////////////////////////////////////////////////////////////////////
// Node.js Exports
var globalNamespace = {};
(function (exports) {
	exports.getNewUserSession = function(nick) {
		newUserSession= new UserSession( nick );
		return newUserSession;
	};
}(typeof exports === 'object' && exports || globalNamespace));


//////////////////////////////////////////////////////////////////////////
// Namespace (lol)


//////////////////////////////////////////////////////////////////////////
// Constructor
function UserSession( nick ) {
	nick = typeof nick !== 'undefined' ? nick : "";

	this.m_nick = nick;
	this.m_id = Math.floor( Math.random()*99999999999 ).toString();
	this.m_timestamp = new Date();
	this.m_joinTime = new Date();
	this.m_points = 0;
} // end UserSession.UserSession()


//////////////////////////////////////////////////////////////////////////
// Update the time that the user was last active
UserSession.prototype.poke = function( nick, type, text, target, data ) {
	this.m_timestamp = new Date();
} // end UserSession.poke()


