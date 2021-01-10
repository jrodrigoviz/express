var express = require('express');
var http = require('http').Server(express);
var mongoClient = require('mongodb').MongoClient;
var router = express.Router();
var path = require('path');

var config = require('../config');

const db_url = 'mongodb://' + config.mongoRead.user + ":" + config.mongoRead.password + "@" + config.mongoRead.host + "/" + config.mongoRead.database;


router.get('/api/nyt/ts', async (req, res, next) => {
  var date = req.query.date
  var dbResult = await nytDBRequest(date).then(d=> d[0])

  res.json(dbResult); 
})

async function nytDBRequest(date) {
  const db = await mongoClient.connect(db_url);

  var collection = db.db("nyt").collection('articles');

  var result = await collection.aggregate(
    [{
      $addFields: {
        pubDate: {
          $convert: { input: "$published_date", to: "date" }
        },
        pubMinute: {
          $dateFromString:{
            dateString:{
              $dateToString: {
                format: '%Y-%m-%dT%H:%M:00',
                date: {$convert: { input: "$published_date", to: "date" }}
              }
            }
          }
      }
    }
    }, {
      $match:
      {
        pubDate: { $gt: new Date(new Date(date).setHours(0, 0, 0, 0)) },
      }
    }, {
      $facet: {
        desCount: [
          { $unwind: "$des_facet" },
          { $match: { des_facet: { $ne: 'internal-essential' } } },
          { $group: { _id: "$des_facet", count: { $sum: 1 } } },
          { $sort: { count: -1, _id: -1 } },
          { $project: { "key": "$_id", "series": "$_id", "value": "$count" } }
        ],
        orgCount: [
          { $unwind: "$org_facet" },
          { $group: { _id: "$org_facet", count: { $sum: 1 } } },
          { $sort: { count: -1, _id: -1 } },
          { $project: { "key": "$_id", "series": "$_id", "value": "$count" } }
        ],
        perCount: [
          { $unwind: "$per_facet" },
          { $group: { _id: "$per_facet", count: { $sum: 1 } } },
          { $sort: { count: -1, _id: -1 } },
          { $project: { "key": "$_id", "series": "$_id", "value": "$count" } }
        ],
        all: [
          { $match: { thumbnail_standard: { $ne: null }, des_facet: { $ne: 'internal-essential' } } },
          { $project: { "thumbnail": "$thumbnail_standard", "pubDate": "$pubDate", "title": "$title", "url": "$url", "des_facet": "$des_facet", "org_facet": "$org_facet", "per_facet": "$per_facet" } },
          { $sort: { pubDate: -1 } },
          { $limit: 25 }
        ],
        //TODO: Should not be nested in this facet
        minutes: [
          { $group: {_id: "$pubMinute",count: { $sum: 1 }}}, 
          { $sort: { "_id": 1}}, 
          { $project: {"minutes": "$_id","count": "$count"}},
          { $group: {_id: "1", mins: { $push: { key: "$minutes", series: "time", value: "$count" } }}}
        ]
      }
    }]
  ).toArray();

  db.close();

  return result;

}



module.exports = router