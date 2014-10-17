/* Import libraries */
var http = require('http');
var express = require('express');
var route = require('./controllers/route');

/* Create express app */
var app = express();

/* Run the app on port 8888 */
app.listen(8889);
console.log('Running on 8889... ');

/* Compress using gzip */
app.use(express.compress());

/* Setup Express to serve static files */
app.use(express.static(__dirname + '/public/views'));

/* To parse POST requests */
app.use(express.bodyParser());

/* To handle Cookies */
app.use(express.cookieParser());
app.use(app.router);	

/* Set view engine to jade */
app.set('view engine', 'jade');

/* Set the location of the view files (.jade) */
app.set('views', __dirname + '/public/views');

/* Routes */

/* GET requests */
app.get('/', route.index);
app.get('/favicon.ico', route.favicon);
app.get('/logout', route.logout);

/* POST request */
app.post('/add', route.save);
app.post('/remove', route.remove);
app.post('/login', route.login);

app.get("*", route.panic);