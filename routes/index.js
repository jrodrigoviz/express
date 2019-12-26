var express = require('express');
var router = express.Router();
var mongoClient = require('mongodb').MongoClient;
var db = require('mongodb').db;
var config = require('../config');

const db_url ='mongodb://'+config.user+":"+config.password+"@"+config.host+"/"+config.database;

// interval to fetch last minuteLag of data;


/* GET home page. */
router.get('/', function(req, res, next) {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

router.get('/api/stories', async function(req, res, next) {
  var data = await dataRequest();
  res.json(data)
});

router.get('/api/story', async function(req, res, next) {
  postID = req.query.post_id*1;
  var data = await postContentRequest(postID);
  res.json(data);
});




async function dataRequest(){
  const db = await mongoClient.connect(db_url);
  const collection = db.db("data").collection('posts')
  const result = await collection.find({}).toArray();

  return result;
};


async function postContentRequest(postID){
  const db = await mongoClient.connect(db_url);
  const collection = db.db("data").collection('posts')
  const result = await collection.find({post_id:postID}).toArray();
  return result;
};




module.exports = router;
