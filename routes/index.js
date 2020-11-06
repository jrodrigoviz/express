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

router.get('/api/data', async function(req, res, next) {
  var country = req.query.country;
  var continent = [];
  //// TODO: params, query
  var data = await dbRequest(country,continent,1);
  res.json(data)
});

router.get('/api/map', async function(req, res, next) {

  var country = (typeof req.query.country === 'undefined') ?[]: req.query.country.split(",");
  var continent = (typeof req.query.continent === 'undefined') ?['Africa', 'South America','Asia','North America']: req.query.continent.split(",");
  //// TODO: params, query
  var data = await dbRequest(country,continent,2);
  res.json(data)
});

async function dbRequest(country,continent,query){

  const db = await mongoClient.connect(db_url);
  switch(query){
    case 1:
      var collection = db.db("data").collection('coffee')
      var result = await collection
        .aggregate([
          {$match:{ 'Country' :{$not:{$in:["Cote d?Ivoire",""]}} }},
          //{$group:{_id:"$Country",value:{$avg:"$CupperPoints"}}},
          {$sort:{value:-1}},
          {$limit:2000},
         // {$filter:},
          {$project:{
            _id:0,
            Country:"$Country",
            Region:"$Region",
            TotalCupPoints:{$round:["$TotalCupPoints",1]},
            ProcessingMethod:"$ProcessingMethod",
            Flavor:"$Flavor",
            Body:"$Body",
            Acidity:"$Acidity",
            Sweetness:"$Sweetness"
          }}

        ])
        .toArray();
        break;
  case 2:
    var collection = db.db("data").collection('map')
    var result = await collection
      .aggregate([
        {$match:{"properties.CONTINENT":{$in:continent}}}
      ])
      .toArray();
      break;
  };

  return result;
};


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
