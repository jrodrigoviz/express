var express = require('express');
var http = require('http').Server(express);
var router = express.Router();
var path = require('path');
var io = require('socket.io')(http);

/* GET home page. */
router.get('/api/chooser', function(req, res, next) {

  res.json(arr);
});

const arr = []
const initialNodes = []


io.on('connection', (socket) => {

  console.log('a user connected');

  socket.on('room', (d,callback) => {

    //create a room element in array
    var roomIndex = arr.findIndex(x=>x.room == d.room);
    if (roomIndex == -1){
      arr.push({room:d.room,data:[]});
    }Math.random()*500;
    
    //let socket join the room
    socket.join(d.room);

    //initialize the fixed nodes for the room
    const initialNodes = []

    for(i=0;i<=50;i++){
      const fx =  Math.floor(Math.random() * (550 - 50 + 1)) ;
      const fy =  Math.floor(Math.random() * (350 - 0 + 1)) + 20 ;
      const color = "#ababab"
      const element = {fx:fx,fy:fy,r:20,color:color}
      initialNodes.push(element)
    }
    console.log(initialNodes)

    if(d.create == 1){
      callback({room:d.room,initialNodes:initialNodes})
    }else{
      const roomData = arr.filter(x => (x.room == d.room))[0]
      io.sockets.in(d.room).emit('server-message', '=== '+d.name+' Has Joined ===')
      callback({roomData:roomData.data,initialNodes:initialNodes});
    }

  })

  socket.on('room-disconnect', (d,c) => {
    // check if room still has sockets if not remove

    if( io.sockets.adapter.rooms[d.room] == undefined){
      //removing room
      const roomIndex = arr.findIndex(x=>x.room == d.room);
      arr.splice(roomIndex,1);
    }
    
    c();

    })

  socket.on('message', (d) =>{
    io.sockets.in(Object.keys(socket.rooms)[1]).emit('server-message', d.name+ ' - says: ' + d.message)
    console.log(Object.keys(socket.rooms))
    console.log(arr)
    console.log(d.message);
  })

  socket.on('data', (d) =>{
    
    const room = Object.keys(socket.rooms)[1]
    // add the data to the corresponding data array on the server
    const roomData = arr.filter(d => (d.room == room))[0]

    console.log(roomData);

    for(i=0;i<=1;i++){
      const color = '#'+Math.floor(Math.random()*16777215).toString(16);
      const x = Math.floor(Math.random() * (480 - 20 + 1)) + 20 ;
      const y = 0;
      const r = 5;
      const element = {socket:socket.id,data:d.dataField,color:color,x:x,y:y,r:r,dataField:d.dataField}
      roomData.data.push(element);
    }
    

    // give back thje results of the data array to the clients
    io.sockets.in(Object.keys(socket.rooms)[1]).emit('server-room-data', roomData.data);

  })




});

http.listen(3002, () => {
  console.log('listening on *:3002');
});






module.exports = router;
