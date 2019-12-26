var express = require('express');
var router = express.Router();
var path = require('path');

// interval to fetch last minuteLag of data;


/* GET home page. */
router.get('/api/images', function(req, res, next) {

  var fileName = req.query.fileName
  res.sendFile(path.join(__dirname, '../public/images/'+fileName));;
});




module.exports = router;
