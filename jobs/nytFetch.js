const request  = require('request');
const config = require('../config');
const cron = require('node-cron');
const mongoClient = require('mongodb').MongoClient;
const db_url ='mongodb://'+config.mongoWrite.user+":"+config.mongoWrite.password+"@"+config.mongoWrite.host+"/"+config.mongoWrite.database;

const newswireBase = 'https://api.nytimes.com/svc/news/v3';
const apiKey = '?api-key='+config.nyt.key; 


function getDataFromAPI (source = "all", section = "all", limit = 60){
    console.log("Fetching data from API");
    // format the API call
    const newswireURL = `/content/${source}/${section}.json`;
    const resultsLimit = '&limit=' + limit
    const apiRequestURL = newswireBase + newswireURL + apiKey + resultsLimit; 

    request(apiRequestURL, (e,r,body)=>{
        const data = JSON.parse(body).results;
        insertDataToDB(data);

    });

}

async function insertDataToDB(data){
    try{
        console.log("Inserting Data to DB")
        const db = await mongoClient.connect(db_url);
        const collection = db.db("nyt").collection('articles');
        collection
            .insertMany(data,{ordered:false},(d) => {
            db.close();
            console.log(d.result.nInserted + "articles inserted");
            return d.result
        })
    } catch (e){
        console.log(e)
    };
    
}

cron.schedule('* * * * * ', ()=> {
    console.log("Starting schedule to fetch data every minute");
    getDataFromAPI("all", "all",60)
    });
