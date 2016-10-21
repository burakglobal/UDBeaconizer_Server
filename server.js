var express = require('express');
var PouchDB = require('pouchdb');
var bodyParser = require('body-parser'); // More info about body-parser: https://scotch.io/tutorials/use-expressjs-to-get-url-and-post-parameters
var db_manager = require("./database");
var cors = require('cors'); // More info about configuring CORS: https://www.npmjs.com/package/cors
const https = require('https'); // More info about HTTPS requests (POST, GET) at: https://nodejs.org/api/https.html#https_https_get_options_callback
const _webClientID = '473073684258-jss0qgver3lio3cmjka9g71ratesqckr.apps.googleusercontent.com'; // This is a client ID created in Google's Developer page as a credential. This one is for WEB applications.
var _signedInUsers = {}; // This is a Javascript object representing the user just signed in. It's actually the JSON response given by Google's servers containing information about the account and the application's WebClientID. More info at: https://developers.google.com/identity/sign-in/web/backend-auth

function start(port) {
	var app = express();
	app.use(cors({credentials: true, origin: '*'})); // Here, CORS is being configured
	console.log("Express app created");

	app.use(bodyParser.json()); // support json encoded bodies
	app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

	app.use('/maps', express.static('data/img'));
	// Extra code. Old code to possibly read images:
	// 'data' is what has been read from 'fs.readFile()'
	// res.writeHead(200, {'Content-Type': 'image/png'}); // Esto no lo llegue nunca a utilizar podria ser una posibilidad.
	// buf_str = new Buffer.from(data).toString('base64');
	// res.end(buf_str, "base64"); // Send the image file back to client-side.
	// More info about working with buffers:
	// https://nodejs.org/api/buffer.html
	// https://docs.nodejitsu.com/articles/advanced/buffers/how-to-use-buffers/
	// More info about RESPONSE objects:
	// http://www.tutorialspoint.com/nodejs/nodejs_response_object.htm

	app.get('/', function (req, res) {
		console.log("HelloWorld!");
		res.send('HelloWorld!');
	});

	// localhost:port/rooms?auth=admin
	app.get('/rooms', function(req, res) {
		var auth = req.query.auth; // req.param, req.body, req.query depending on the case, more info at: http://expressjs.com/en/api.html#req.query
		res.send("HelloWorld!");
	});

	// localhost:port/beacons?auth=admin
	app.get('/beacons', function(req, res) {
		var auth = req.query.auth; // req.param, req.body, req.query depending on the case, more info at: http://expressjs.com/en/api.html#req.query
		res.send("HelloWorld!");
	});

	// localhost:8080/staff?auth=admin
	app.get('/staff', function(req, res) {
		var auth = req.query.auth; // req.param, req.body, req.query depending on the case, more info at: http://expressjs.com/en/api.html#req.query
		console.log("Request 'staff' received!");
		if (auth == "admin") {
			ret = new PouchDB('http://'+"0.0.0.0"+':'+"5984"+'/staffdb');
			res.send(ret);
		}
	});

	// localhost:8080/staff/version?auth=admin
	app.get('/staff/version', function(req, res) {
		var auth = req.query.auth; // req.param, req.body, req.query depending on the case, more info at: http://expressjs.com/en/api.html#req.query
		console.log("Request 'staff/version' received!");
		if (auth == "admin") {
			db_manager.getSequenceNumber("staff", function (value) {
				console.log("value="+value); // More info about global variables: http://www.hacksparrow.com/global-variables-in-node-js.html
				res.send(value.toString());
			});
		}
	});

	// localhost:8080/rooms/version?auth=admin
	app.get('/rooms/version', function(req, res) {
		var auth = req.query.auth; // req.param, req.body, req.query depending on the case, more info at: http://expressjs.com/en/api.html#req.query
		console.log("Request 'rooms/version' received!");
		if (auth == "admin") {
			db_manager.getSequenceNumber("rooms", function (value) {
				console.log("value="+value); // More info about global variables: http://www.hacksparrow.com/global-variables-in-node-js.html
				res.send(value.toString());
			});
		}
	});

	// localhost:8080/beacons/version?auth=admin
	app.get('/beacons/version', function(req, res) {
		var auth = req.query.auth; // req.param, req.body, req.query depending on the case, more info at: http://expressjs.com/en/api.html#req.query
		console.log("Request 'beacons/version' received!");
		if (auth == "admin") {
			db_manager.getSequenceNumber("beacons", function (value) {
				console.log("value="+value); // More info about global variables: http://www.hacksparrow.com/global-variables-in-node-js.html
				res.send(value.toString());
			});
		}
	});

	// localhost:8080/rooms/mapversion/2?auth=admin
	app.get('/rooms/mapversion/:v', function(req, res) {
		var auth = req.query.auth; // req.param, req.body, req.query depending on the case, more info at: http://expressjs.com/en/api.html#req.query
		console.log("Request 'rooms/mapversion' received!");
		if (auth == "admin") {
			var floor = req.params.v;
			db_manager.getMapVersion(floor.toString(), function (value) {
				console.log("value="+value); // More info about global variables: http://www.hacksparrow.com/global-variables-in-node-js.html
				res.send(value.toString());
			});
		}
	});

	// localhost:8080/editcontact?auth=admin
	app.post('/editcontact', function(req, res) {
		var auth = req.query.auth; // req.param, req.body, req.query depending on the case, more info at: http://expressjs.com/en/api.html#req.query
		console.log("Request 'editcontact' received!");
		if (auth == "admin") {
			// Firstly, we verify the identity of the user:
			authenticateuser(req.body[0], function() {
				// Now, we save the changes done on a contact:
				// req.body[0] = this is the ID token of the signed in user.
				// req.body[1] = this is the changes dictionary where all the new changes are recorded
				// req.body[2] = this is the data structure representing the contact (name, faculty, email...)
				// In summary, the NEW and the OLD data.
				if(_signedInUsers[req.body[0]] != undefined) {
					// This conditional statement means the authentication was successful
					// The parameters we are passing are: IDtoken, the user's Google account (with all details), the changes done in the contact page of the app and finally, the contact's original data in the app.
					db_manager.putEditedContact(req.body[0], _signedInUsers[req.body[0]],req.body[1], req.body[2]);
				}
			});
			//  changes_dictionary['officehours'] Object (in server side: req.body.officehours[x]) we will have rows with any of the following possible content:
		    // · Useful information regarding 'officehours', e.g '23','00','14','15'
		    // · undefined -> This corresponds to the rows that were not changed by the user but were loaded at the begining (info coming from the DB)
		    // · NULL -> This corresponds to the rows that were intentionally deleted by the user
		    // Remember that (http://www.w3schools.com/js/js_datatypes.asp):
		    // null === undefined -> false
		    // null == null -> true
		    // null == undefined -> true !!
			res.end() // no data to send back
		}
	});

	app.listen(port, function () {
		console.log("Server has started. Example app listening on port "+port+"!");
	});
}

// This function authenticates the user by means of ID Token. The whole process is explained here:
// https://developers.google.com/identity/sign-in/web/backend-auth
// In short, the ID token is used to authenticate, because is not secure (nor good practise) sending the user ID (in which I'm interested) to the backend.
// The token ID is from the user who has just signed in. This token is intended to navigate Internet without problems, the propper/standard way of doing things is verifying the token agains Google's servers and retrieve User's information on server side.
function authenticateuser(idtoken, callback) {
	var options = {
		hostname: 'www.googleapis.com',
		port: 443,
		path: '/oauth2/v3/tokeninfo?id_token='+idtoken.toString(),
		method: 'POST'
	};

	// More info about the request at: https://nodejs.org/api/https.html#https_https_get_options_callback
	var req = https.request(options, (res) => {
		// console.log('statusCode:', res.statusCode);
		// console.log('headers:', res.headers);
		res.on('data', (d) => {
			// process.stdout.write(d);
			d = JSON.parse(d);
			if (d.aud == _webClientID) {
				// Authentication success
				_signedInUsers[idtoken] = d; // We save the Object containing the information of the user in this Dictionary
				// Fields cointained in 'd':
				// - iss, sub, azp, aud, iat, exp
				// And the user's information:
				// - email, email_verified, name, picture, given_name, family_name and locale
				callback();
			}
		});
	});
	req.end();
	req.on('error', (e) => {
		console.log("Error on 'authenticateuser', POST query:");
		console.error(e);
	});
}

// This method is used to remove the ID token of the user who has commited changes
// More info at: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_Objects#Deleting_properties
// and: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/delete
function freeUpuser(idtoken) {
	console.log("BEFORE deleting idtoken from dictionary: " + _signedInUsers[idtoken]);
	delete _signedInUsers[idtoken];
	console.log("AFTER deleting idtoken from dictionary: " + _signedInUsers[idtoken]);

}

exports.start = start;
exports.freeUpuser = freeUpuser;

//////////////////////////////////////////////
// More info about setting up a node.js server + express module:
// https://nodejs.org/en/about/
// http://expressjs.com/en/starter/hello-world.html
// http://coenraets.org/blog/2012/10/creating-a-rest-api-using-node-js-express-and-mongodb/
// https://scotch.io/tutorials/use-expressjs-to-get-url-and-post-parameters
// https://www.toptal.com/nodejs/why-the-hell-would-i-use-node-js
// http://www.programmableweb.com/news/how-to-create-restful-api-node.js/how-to/2014/06/11
// http://www.hongkiat.com/blog/node-js-server-side-javascript/
