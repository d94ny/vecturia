/* Router */

/* https://github.com/felixge/node-mysql */
var MongoClient = require('mongodb').MongoClient;
var format = require('util').format;
var crypto = require('crypto');
var http = require('http');
var render = require('./render');
var url_parser = require('url');

/* Exports gives others the permission to use 
   this file as a module.
   ex :
   var m = require('route');
   m.myFunc1();
*/
var default_bookmarks = [
      {shortcut:'y', url:'http://youtube.com', title:'YouTube', color:'F26D6F'},
      {shortcut:'t', url:'http://twitter.com', title:'Twitter', color:'75B4E2'},
      {shortcut:'f', url:'http://facebook.com', title:'Facebook', color:'707CBC'},
      {shortcut:'g', url:'http://google.com', title:'Google', color:'C4C4C3'},
      {shortcut:'v', url:'http://vine.co', title:'Vine', color:'87CDAB'},
      {shortcut:'i', url:'http://imdb.com', title:'Imdb', color:'DDE574'},
      {shortcut:'b', url:'http://tumblr.com', title:'Tumblr', color:'A775B3'}
    ];

var default_colors = {
    google : "C4C4C3",
    twitter : "75B4E2",
    youtube : "F26D6F",
    facebook : "707CBC",
    vine : "87CDAB",
    instagram : "AA925C",
    tumblr : "A775B3",
    imdb : "DDE574",
    bbc : "C45151",
    yahoo : "856FA8",
    spi0n : "826D44",
    dribbble: "CA7FCC",
    ycombinator : "E89D3A"
  }

/* Returns if the 'vecturia_data' is still valid
   for a certain request req */
function validCookie(req){

  return (req.cookies.vecturia_data!==undefined&&(req.cookies.vecturia_data instanceof Array));

}

// Handle login
function loggedIn(req){

  // verify if we have a logged in user
  return (req.cookies.vecturia_user!==undefined && req.cookies.vecturia_user != "");
}


/* Index page */
exports.index = function(req, res) {

    // Check if we are logged in
    if(loggedIn(req)) {

      // Connect to database to get bookmarks
      var url = format("mongodb://127.0.0.1/vecturiadb");
      MongoClient.connect(url, function(err, db) {
      
        if(err) {
          // If we have an error display the main index page with
          // default bookmarks and an error message
          render.index(res, default_bookmarks, true, "Error connecting to DB : "+err);
          return;
        }

        // We are now connected to the MongoDB db 
        var users = db.collection('users');
        users.find({username : new Buffer(req.cookies.vecturia_user, 'hex').toString('utf8')}).toArray(function(err,documents){

          if(err) {
            
            // Display index with error message
            render.index(res, default_bookmarks, true, "Error querying : "+err);
            return;
          }

          if(!documents[0]||!documents[0].bookmarks) render.index(res, default_bookmarks, true, null);
          else render.index(res, documents[0].bookmarks, true, null);
          // If not error occured
          // Render index with the documents from the DB
          return;

        });

      });

    } else {

      // If we are not logged in, still give all features !

      /* Check if cookie is set/valid, if not set it */
      if(!validCookie(req)){

        /* Set the cookie , it will be created once the response is sent */
        res.cookie('vecturia_data', default_bookmarks, { maxAge: 2592000*1000, httpOnly: true });
        /* Render index.jade as response, with the default bookmarks */
        render.index(res,default_bookmarks , false, null);
        
      } else {

        /* Reder index.jade as response with the cookies */
        render.index(res,req.cookies.vecturia_data, false, null);

      }

    }
    
}

/* Save a bookmark */
exports.save = function(req, res) {


    if(!validCookie(req)&&!loggedIn(req)) {

      /* Cookie is expired and we are not loggedin, render expired.jade as response */
      res.render('expired');

    } else {

      /* Get the POST data */
      var input = req.body;

      /* Validate our data */
      if(!input.url.trim()||input.url.trim()===""||input.shortcut.length<1){

        /* If invalid redirect to index */ 
        // If we have an error display the main index page with
        // default bookmarks and an error message
        render.index(res, default_bookmarks, loggedIn(req), "Invalid URL");
        return;

      } else {

        /* Be Carefull ! Cookies are affected when res is sent */

        /* Get the title using regrex */
        if(input.url.indexOf("http://") === -1){
          var url = "http://"+input.url;
        } else {
          var url = input.url;
        }

        /* Parse the url to get the hostname */
        var parsed = url_parser.parse(url);

        /* If the url is invalid we have no hostname */
        if(parsed.hostname!==undefined){

          /* remove wwww and then split into parts */
          var domains = parsed.hostname.replace("www.","").split('.');

          /* If we have multiple parts (subdomains), use the second to last part */
          if(domains.length-2>=0) var domain = domains[domains.length-2];
          else var domain = domains[0];

          /* Capitalize the first letter */
          var title = domain.charAt(0).toUpperCase() + domain.slice(1);

        } else {

          /* If invalid domain just use the url as title */
          var title = url.replace("http://","");

        }

        /* Get random color */
        var colors = [ "F26D6F", "75B4E2","707CBC","B7B7B7","87CDAB","DDE574","A775B3", "AA925C", "C45151", "856FA8", "CA7FCC","E89D3A" ];
        if(default_colors[title.toLowerCase()]!==undefined){

          /* If that hostname is in our default Object */
          var color = default_colors[title.toLowerCase()];

        } else {

          /* If not assign random color */
          var random = Math.floor(Math.random()*colors.length);
          var color = colors[random];

        }

        /* Create the object 'bookmark' */
        var bookmark = {
          "shortcut" : input.shortcut.charAt(0),
          "url" : url,
          title :title,
          color : color
        };

        // Now we have to save it to the cookie or to the database
        if(loggedIn(req)) {

          // Save to database
          var url = format("mongodb://127.0.0.1/vecturiadb");
          MongoClient.connect(url, function(err, db) {
            
              if(err) {
                // If we have an error display the main index page with
                // default bookmarks and an error message
                render.index(res, default_bookmarks, true, "Error connecting");
                return;
              }

              // We are now connected to the MongoDB db 
              var users = db.collection('users');
              users.update( { username: new Buffer(req.cookies.vecturia_user, 'hex').toString('utf8') }, { $push: { bookmarks: bookmark } }, { multi: false }, function(err,documents){

                  if(err) {
                    // If we have an error display the main index page with
                    // default bookmarks and an error message
                    render.index(res, default_bookmarks, true, "Error saving");
                    return;
                  }

                  // Redirect to main page
                  res.redirect('/');

            });

          });


        } else {

          /* Get the data from the cookie which is valid (tested before)
             and add the bookmark via push() */
          var data = req.cookies.vecturia_data;
          data.push(bookmark);

          /* Now send a new cookie to the response */
          res.cookie('vecturia_data', data, { maxAge: 2592000*1000, httpOnly: true });
          
          /* We redirect to have the right url again
             rendering index here would be an option too */
        	res.redirect('/');

        }
      
      }

    }
}

/* Remove a bookmark */
exports.remove = function(req, res){

  if(!validCookie(req)&&!loggedIn(req)) {

    /* Cookie is expired, render expired.jade as response */
    res.render('expired');

  } else {

    /* Get the POST data */
    var input = req.body;

    /* Parse the input into a int */
    var index = parseInt(input.index);

    // Check if we are loggedIn or on cookie
    if(loggedIn(req)) {

      // Connect to database
      var url = format("mongodb://127.0.0.1/vecturiadb");
      MongoClient.connect(url, function(err, db) {
        
          if(err) {
            // If we have an error display the main index page with
            // default bookmarks and an error message
            render.index(res, default_bookmarks, true, "Error connecting");
            return;
          }

          // We are now connected to the MongoDB db 
          var users = db.collection('users');
          users.find({username : new Buffer(req.cookies.vecturia_user, 'hex').toString('utf8') }).toArray(function(err,documents){

            if(err||!documents[0]||!documents[0].bookmarks) {
              // If we have an error display the main index page with
              // default bookmarks and an error message
              render.index(res, default_bookmarks, true, "Error querying");
              return;
            }

            // Now get the current bookmarks
            var data = documents[0].bookmarks;

            if(data.length>index&&index>=0){
              data.splice(index , 1);
            }

            // now save it
            users.update( { username: new Buffer(req.cookies.vecturia_user, 'hex').toString('utf8') }, { $set: { bookmarks: data } }, { multi: false }, function(err,documents){

                if(err) {
                  // If we have an error display the main index page with
                  // default bookmarks and an error message
                  render.index(res, default_bookmarks, true, "Error saving");
                  return;
                }

                res.redirect('/');
                return;

            });

        });

      });


    } else {

      /* We get the bookmarks from the cookie which is valid */
      var data = req.cookies.vecturia_data;

      /* Validate our POST data : index of bookmarks to be remioved */
      if(data.length>index&&index>=0){

        /* Remove the object in our array using splice() */
        data.splice(index , 1);

        /* Now send a new cookie to the response */
        res.cookie('vecturia_data', data, { maxAge: 2592000*1000, httpOnly: true });
      }

      /* We redirect to have the right url again
        rendering index here would be an option too */
      res.redirect('/');

    }
  }
}

/* Handle favicon */
exports.favicon = function(req, res){
	return;
}

/* Handle errors and stuff */
exports.panic = function(req, res){
  render.panic(res);
}

// Logout
exports.logout = function(req, res) {

  res.clearCookie('vecturia_user');
  res.redirect('/');

}

exports.login = function(req, res) {

  if(loggedIn(req)){
    res.redirect('/');
    return;
  }

  // get the input
  var input = req.body;
  var username = input.username;
  var password = input.password;

  if(!username||!password) {
    // If we have an error display the main index page with
    // default bookmarks and an error message
    render.index(res, default_bookmarks, false, "Please enter username and password");
    return;  
  }

  // hash the password
  var hashed = crypto.createHash('sha1').update(password).digest("hex");

  // Connect to database
  var url = format("mongodb://127.0.0.1/vecturiadb");
  MongoClient.connect(url, function(err, db) {

    // Handle possible connection error
    if(err) {
      // If we have an error display the main index page with
      // default bookmarks and an error message
      render.index(res, default_bookmarks, false, "Error connecting : "+err);
      return;    
    }

    // No connection error
    var users = db.collection('users');
    users.find({username : username , password : hashed }).toArray(function(err,documents){

      if(err) {
        // If we have an error display the main index page with
        // default bookmarks and an error message
        render.index(res, default_bookmarks, false, "Error querying : "+err);
        return;
      }

      // Return if we have a match
      if(documents.length>0) {

        // create a cookie
        res.cookie('vecturia_user', new Buffer(username).toString('hex'), { maxAge: 2592000*1000, httpOnly: true });
        res.redirect('/');
        return;

      } else {

        // If we have an error display the main index page with
        // default bookmarks and an error message
        render.index(res, default_bookmarks, false, "Wrong credentials");
        return;

      }


    });

  });




}