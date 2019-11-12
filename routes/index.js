var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var config = require('../config');

let data= [];
let dataSlice = [];
let summaryDataHeader = [];
let summaryDataHeaderSlice = [];
let dataPackage = {dataSummary:[],data:[]};

let serverIndex = 0;
const minuteLag = 2;
const windowSecondInterval = 1;
const windowTickNum = 50;

// interval to fetch last minuteLag of data;
mySQLRequest();
// interval to slice through minuteLag data
sliceData()

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/data', function(req, res, next) {

  res.json(dataPackage);

});



function mySQLRequest(){
  console.log("fetching data from DB")

  var connection = mysql.createConnection({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database

  });

  connection.connect();

  //Query for last 5 minutes by

  connection.query(
    "select concat(lpad(hour_id,2,0),lpad(minute_id,2,0),lpad(second_id,2,0))+0 as 'key', category as dim, sum(sales) as value from sales_table "
    + "where date_id = date_format(sysdate(),'%Y%m%d') and hour_id = date_format(sysdate(),'%H') and minute_id >= date_format(sysdate(),'%i') -3 "
    + "group by 1,2 "
    + "order by 1 desc limit 500 ",function(err,rows,fields){

    // append pull into existing data array
    Array.prototype.push.apply(data,rows)

    // unique data based on key and sort result based on key value
    data = data.filter((data, index, self) =>
      index === self.findIndex((t) => (
        t.key === data.key
      ))
    ).sort((a,b)=> a.key>b.key ? 1:-1)

  });


  connection.query("select concat(lpad(hour_id,2,0),lpad(minute_id,2,0),lpad(second_id,2,0))+0 as 'key', sum(sales) as value from sales_table "
    +"where date_id = date_format(sysdate(),'%Y%m%d') and hour_id = date_format(sysdate(),'%H') and minute_id >= date_format(sysdate(),'%i') -3 "
    +"group by 1 "
    +"union all "
    +"select 0 as 'key', sum(sales) as value from sales_table "
    +"where date_id = date_format(sysdate(),'%Y%m%d') and hour_id = date_format(sysdate(),'%H') and minute_id < date_format(sysdate(),'%i') -3 "
    +"group by 1 "
    +"order by 1 asc",function(err,rows,fields){

    // data for KPIs
    summaryDataHeader = rows.sort((a,b)=> a.key>b.key ? 1:-1);

  });


  connection.end()

  setTimeout(mySQLRequest,1000*60*minuteLag);
};

function sliceData(){
  //check if at the end of data chunk, if so then do not increment, wait for data length to increase
  serverIndex = (serverIndex+1+windowTickNum == data.length ? serverIndex:serverIndex+1);
  //slice of last windowTickNum data
  dataSlice = data.slice(serverIndex,serverIndex+windowTickNum);
  //check what key the server index is equivalent to
  var serverKey = (typeof data[serverIndex] !=='undefined'?data[serverIndex+windowTickNum].key:0);
  //check the corresponding element in data summary (assumed array is sorted asc)
  var summaryDataHeaderIndex =  summaryDataHeader.map(d=>d.key).indexOf(serverKey);
  //send data up until the newest element
  summaryDataHeaderSlice = summaryDataHeader.slice(0,summaryDataHeaderIndex);

  dataPackage = {data:dataSlice,dataSummary:summaryDataHeaderSlice};

  setTimeout(sliceData,1000*windowSecondInterval)



}


function summaryData(){




}


module.exports = router;
