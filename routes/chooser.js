var express = require('express');
var http = require('http').Server(express);
var router = express.Router();
var path = require('path');
var io = require('socket.io')(http);

/* GET home page. */
router.get('/api/chooser', function(req, res, next) {

});

const arr = []


io.on('connection', (socket) => {

  console.log('a user connected');

  socket.on('room', (d,callback) => {

    //create a room element in array
    var roomIndex = arr.findIndex(x=>x.room == d.room);
    if (roomIndex == -1){
      arr.push({room:d.room,data:[]});
    }
    
    //let socket join the room
    socket.join(d.room);

    //emit to room of new joiner
    console.log(Object.keys(socket.rooms));
    console.log(io.sockets.adapter.rooms[d.room].sockets);

    if(d.create == 1){
      callback('Created '+ d.room+' successfully')
    }else{
      io.sockets.in(d.room).emit('server-message', '=== '+d.name+' Has Joined ===')
    }

  })

  socket.on("disconnect", () => {
    console.log("closed connection")
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
    
    roomData.data.push(d.dataField)

    // give back thje results of the data array to the clients
    io.sockets.in(Object.keys(socket.rooms)[1]).emit('server-room-data', roomData);

  })








});

http.listen(3002, () => {
  console.log('listening on *:3002');
});






module.exports = router;
