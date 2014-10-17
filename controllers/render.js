/* Render pages */
/* We take the response and use the function render on it to sent it. */

exports.index = function(res,data, loggedin, error){
	res.render('index', {
      bookmarks: data,
      loggedin : loggedin,
      error : error
    },function(err,html){

      /* err contains a possible error
         html the rendered string */
      if(err) {
        /* Render panic.jade as response */
        res.render('panic');
        console.log(err);
      } else {
        /* We send the repsonse */
        res.send(html);
      }

    });
}

exports.panic = function(res){
  res.render('panic', function(err, html){

    if(err) res.send(500);
    else res.send(html);

  });
}

exports.expired = function(res){
  res.render('expired', function(err, html){

    if(err) res.send(500);
    else res.send(html);

  });
}