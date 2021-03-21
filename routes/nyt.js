var express = require('express');
var http = require('http').Server(express);
var mongoClient = require('mongodb').MongoClient;
var router = express.Router();
var path = require('path');

var config = require('../config');

const db_url = 'mongodb://' + config.mongoRead.user + ":" + config.mongoRead.password + "@" + config.mongoRead.host + "/" + config.mongoRead.database;


router.get('/api/nyt/ts', async (req, res, next) => {

  var date = (process.env.NODE_ENV=='production'? req.query.date : "20210102")

  var dbResult = await nytDBRequest(date).then(d=> d[0])

  res.json(dbResult); 
})

async function nytDBRequest(date) {
  const db = await mongoClient.connect(db_url);

  var collection = db.db("nyt").collection('articles');

  var parsedDate = ""
  
  if(date != undefined){
    var year = parseInt(date.substr(0,4));  
    var month = parseInt(date.substr(4,2))-1;
    var day = parseInt(date.substr(6,2));
    
    var parsedDate = new Date(year,month,day,0);
    var nextDate = new Date(year,month,day,0);
    nextDate.setDate(parsedDate.getDate()+1);

  }else{
    var parsedDate = new Date(new Date().setHours(0));
    var nextDate = new Date(new Date().setHours(0))
    nextDate.setDate(parsedDate.getDate()+1);
  }

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
                format: '%Y-%m-%dT%H:00:00',   
                date: {$convert: { input: "$published_date", to: "date" }}
              }
            }
          }
      },
      pubDay: {
        $dateFromString:{
          dateString:{
            $dateToString: {
              format: '%Y-%m-%d',   
              date: {$convert: { input: "$published_date", to: "date" }}
            }
          }
        }
      }
    }
    }, {
      $match:
      { 
        material_type_facet:{$eq:"News"}
      }
    }, {
      $facet: {
        desCount: [
          { $unwind: "$des_facet" },
          { $match: { des_facet: { $ne: 'internal-essential' }, pubDate: { $gt: parsedDate, $lte:nextDate} } },
          { $group: { _id: "$des_facet", count: { $sum: 1 } } },
          { $sort: { count: -1, _id: -1 } },
          { $project: { "_id":0,"cat": "$_id", "series": "$_id", "count": "$count" } }
        ],
        desHist: [ 
          { $unwind: "$des_facet" },
          { $group: {_id: {d:"$des_facet",p:"$pubDay"},count: { $sum: 1 }}},
          { $project:{"_id":0,cat:"$_id.d",date:"$_id.p",v:"$count"}},
          { $addFields:{ dayDelta: {$divide:[{$subtract:['$date',new Date()]},1000 * 60 * 60 * 24]}}},
          { $addFields:{ facetWeight:{$pow:[1.5,'$dayDelta']}}},
          { $addFields:{ relevancyScore:{$multiply:['$facetWeight','$v']}}},
          { $group:{_id:'$cat',score:{$sum:'$relevancyScore'}}},
          { $project: {_id:0, cat:"$_id", score:"$score"}},
          { $sort: { score:-1 } }
          ],
        orgCount: [
          { $unwind: "$org_facet" },
          { $match: { pubDate: { $gt: parsedDate, $lt:nextDate} } },
          { $group: { _id: "$org_facet", count: { $sum: 1 } } },
          { $sort: { count: -1, _id: -1 } },
          { $project: { "_id":0,"cat": "$_id", "series": "$_id", "count": "$count" } }
        ],
        orgHist: [ 
          { $unwind: "$org_facet" },
          { $group: {_id: {d:"$org_facet",p:"$pubDay"},count: { $sum: 1 }}},
          { $project:{"_id":0,cat:"$_id.d",date:"$_id.p",v:"$count"}},
          { $addFields:{ dayDelta: {$divide:[{$subtract:['$date', new Date()]},1000 * 60 * 60 * 24]}}},
          { $addFields:{ facetWeight:{$pow:[1.5,'$dayDelta']}}},
          { $addFields:{ relevancyScore:{$multiply:['$facetWeight','$v']}}},
          { $group:{_id:'$cat',score:{$sum:'$relevancyScore'}}},
          { $project: {_id:0, cat:"$_id", score:"$score"}},
          { $sort: { score:-1 } }
          ],
        perCount: [
          { $unwind: "$per_facet" },
          { $match: { pubDate: { $gt: parsedDate, $lt:nextDate} } },
          { $group: { _id: "$per_facet", count: { $sum: 1 } } },
          { $sort: { count: -1, _id: -1 } },
          { $project: { "_id":0,"cat": "$_id", "series": "$_id", "count": "$count" } }
        ],
        perHist: [ 
          { $unwind: "$per_facet" },
          { $group: {_id: {d:"$per_facet",p:"$pubDay"},count: { $sum: 1 }}},
          { $project:{"_id":0,cat:"$_id.d",date:"$_id.p",v:"$count"}},
          { $addFields:{ dayDelta: {$divide:[{$subtract:['$date', new Date()]},1000 * 60 * 60 * 24]}}},
          { $addFields:{ facetWeight:{$pow:[1.5,'$dayDelta']}}},
          { $addFields:{ relevancyScore:{$multiply:['$facetWeight','$v']}}},
          { $group:{_id:'$cat',score:{$sum:'$relevancyScore'}}},
          { $project: {_id:0, cat:"$_id", score:"$score"}},
          { $sort: { score:-1 } }
          ],
        all: [
          { $match: { thumbnail_standard: { $ne: null }, des_facet: { $ne: 'internal-essential' }, pubDate: { $gt: parsedDate, $lt:nextDate} } },
          { $project: {"_id":0,"key":"$title","thumbnail": "$thumbnail_standard", "pubDate": "$pubDate", "title": "$title", "url": "$url", "des_facet": "$des_facet", "org_facet": "$org_facet", "per_facet": "$per_facet" } },
          { $sort: { pubDate: -1 } },
          { $limit: 200 }
        ],
        //TODO: Should not be nested in this facet
        timeline: [
          { $match: { pubDate: { $gt: parsedDate, $lt:nextDate} } },
          { $group: {_id: "$pubMinute",count: { $sum: 1 }}}, 
          { $sort: { "_id": 1}}, 
          { $project: {"minutes": "$_id","count": "$count"}},
          { $group: {_id: "1", time: { $push: { key: "$minutes", series: "time", value: "$count" } }}}
        ]
      }
    },
    {
      $facet:{
          desFinal:[
            { $project:{A:{$concatArrays:["$desHist","$desCount"]}}},
            { $unwind:"$A"},
            { $group: { _id:"$A.cat",score:{$min:"$A.score"}, count:{$sum:"$A.count"}}},
            { $project: { _id:0,key:{$substr:["$_id",0,200]},value2:  {$round:["$score",1]},value:"$count"}},
            { $match:{value:{$gt:0}}}, 
            { $sort: { value:-1 } }
          ],
          orgFinal:[
            { $project:{A:{$concatArrays:["$orgHist","$orgCount"]}}},
            { $unwind:"$A"},
            { $group: { _id:"$A.cat",score:{$min:"$A.score"}, count:{$sum:"$A.count"}}},
            { $project: { _id:0,key:{$substr:["$_id",0,200]},value2:  {$round:["$score",1]},value:"$count"}},
            { $match:{value:{$gt:0}}},
            { $sort: { value:-1 } }
          ],
          perFinal:[
            { $project:{A:{$concatArrays:["$perHist","$perCount"]}}},
            { $unwind:"$A"},
            { $group: { _id:"$A.cat",score:{$min:"$A.score"}, count:{$sum:"$A.count"}}},
            { $project: { _id:0,key:{$substr:["$_id",0,200]},value2: {$round:["$score",1]},value:"$count"}},
            { $match:{value:{$gt:0}}},
            { $sort: { value:-1 } }
          ],
          raw:[
            { $skip:0}
            ]
        }
    }
  ]
  ).toArray();

  db.close();

  return result;

}



module.exports = router