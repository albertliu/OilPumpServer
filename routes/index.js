var express = require('express');
var router = express.Router();
var response

/* GET home page. */
//api.0 check the user's session is alive or not.
router.post('/knock_door', function(req, res, next) {
  //res.render('index', { title: 'Express' });
  if (!req.session.user) {
    response = {username:""};
  }else{
    response = {username:req.session.user.username, "auditor":req.session.user.auditor};
  }
  res.send(response);
});

module.exports = router;
