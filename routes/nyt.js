var express = require('express');
var http = require('http').Server(express);
var mongoClient = require('mongodb').MongoClient;
var router = express.Router();
var path = require('path');

var config = require('../config');

const db_url ='mongodb://'+config.mongoRead.user+":"+config.mongoRead.password+"@"+config.mongoRead.host+"/"+config.mongoRead.database;


router.get('/api/nyt/ts', async (req,res,next)=>{
    var dbResult = await nytDBRequest();
    res.json(dbResult[0]); // db returns as a single valued array, convert to json object for easier use
})

async function nytDBRequest(){
    const db = await mongoClient.connect(db_url);

    var collection = db.db("nyt").collection('articles');

    var result = await collection.aggregate(
        [{$addFields: {
            pubDate:{
              $convert:{input:"$published_date",to:"date"}
            }
          }
          
          }, {$match: 
          {
            pubDate:{$gt:new Date(new Date("2021-01-01").setHours(0,0,0,0))},
          }}, {$facet: {
            desCount: [ 
              { $unwind: "$des_facet" },
              { $match:{des_facet:{$ne:'internal-essential'}}},
              { $group: { _id: "$des_facet", count: { $sum: 1 } } },
              { $sort: { count: -1 , _id:-1}},
              { $project:{"key":"$_id","series":"$_id","value":"$count"}}
              ],
            orgCount: [ 
              { $unwind: "$org_facet" },
              { $group: { _id: "$org_facet", count: { $sum: 1 } } },
              { $sort: { count: -1 , _id:-1}},
              { $project:{"key":"$_id","series":"$_id","value":"$count"}}
              ],
            perCount: [ 
              { $unwind: "$per_facet" },
              { $group: { _id: "$per_facet", count: { $sum: 1 } } },
              { $sort: { count: -1 , _id:-1}},
              { $project:{"key":"$_id","series":"$_id","value":"$count"}}
              ],
            all:[
                { $match:{thumbnail_standard:{$ne:null}}},
                { $project:{"thumbnail":"$thumbnail_standard","pubDate":"$pubDate","title":"$title","url":"$url","des_facet":"$des_facet","org_facet":"$org_facet","per_facet":"$per_facet"}},
                { $sort:{pubDate:1}},
                { $limit:25}
                ]
          }}]
        ).toArray();

        db.close();

        return result;

}



module.exports = router