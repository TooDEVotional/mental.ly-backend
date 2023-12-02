// Import modules
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

// Initialize express
const app = express();
const server = http.createServer(app);

// Create a Socket.io server
const io = socketIo(server);


const PORT = process.env.PORT || 3000;

// Start the server
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});


// Generate Question from operands
const generateQuestion = () => {
  operators = ["+", "-", "*", "/"];
  // Get random operators
  op = operators[Math.floor(Math.random() * 4)];
  operand = generateOperands(op);
  // Create questions and answers
  qString = operand[0] + op + operand[1]+" = ";
  ans = operand[2];
  return [qString, ans];
};


// Generate Operands based on conditions
const generateOperands = (operator) => {

  //Generate Operands
  op1 = Math.floor(Math.random() * 50);
  op2 = Math.floor(Math.random() * 50);
  switch (operator) {
    case "+":
      while (!(op1 + op2 < 100 && op1 * op2 != 0)) {
        op1 = Math.floor(Math.random() * 50);
        op2 = Math.floor(Math.random() * 50);
      }
      return [op1, op2, op1 + op2];
      break;

    case "-":
      while (!(op1 - op2 < 100 && op1 - op2 > 10 && op1 * op2 != 0)) {
        op1 = Math.floor(Math.random() * 50);
        op2 = Math.floor(Math.random() * 50);
      }
      return [op1, op2, op1 - op2];
      break;
    case "*":
      while (!(op1 * op2 < 100 && op1 * op2 != 0 && op1 != 1 && op2 != 1)) {
        op1 = Math.floor(Math.random() * 50);
        op2 = Math.floor(Math.random() * 50);
      }
      return [op1, op2, op1 * op2];
      break;
    case "/":
      while (
        !(Number.isInteger(op1 / op2) && op1 * op2 != 0 && op1 != 1 && op2 != 1)
      ) {
        op1 = Math.floor(Math.random() * 200);
        op2 = Math.floor(Math.random() * 100);
      }
      return [op1, op2, op1 / op2];
      break;

    default:
      return [0, 0, 0];
      break;
  }
};
// Generate Question Array
const genArray = () => {
    arr = [];
    for(let i = 0; i<5; i++){
        values = generateQuestion();
        arr[i] = {
            question : values[0],
            answer : values[1]
        }
    }
    return JSON.stringify(arr);
}

// Keep track of connected players and available rooms
const players = {};
const rooms = {};
var GroomId=null;

// Handle new player connections
io.on("connection", (socket) => {
  const playerId = socket.id;
  console.log(playerId + " joined");

  players[playerId] = {
    id: playerId,
    room: null,
  };

  // Notify the client
  socket.emit("playerId", playerId);

  // Handle player disconnections
  socket.on("disconnect", () => {
    const room = players[playerId].room;
    console.log(playerId + " disconnected");
    delete players[playerId];
  });

  // Handle end requests 
  socket.on("done", (data)=>{
    console.log(data + "done");
    for (const playerId in players) {
      if(playerId == socket.id){
        GroomId = players[playerId].room;
      }
      socket.to(GroomId).emit("done",data);
    }
  });
  // Handle data requests
  socket.on("gamedata", (data)=>{
    console.log(data);
    for (const playerId in players) {
      if(playerId == socket.id){
        GroomId = players[playerId].room;
      }
      socket.to(GroomId).emit("gamedata",data);
    }
  });
  // Handle result show
  socket.on("show", (data)=>{
    console.log('show');
    for (const playerId in players) {
      if(playerId == socket.id){
        GroomId = players[playerId].room;
      }
      socket.to(GroomId).emit("show",data);
    }
  });
  // Handle room matchmaking
  socket.on("matchmaking", () => {
    // Iterate through all available rooms
    for (const roomId in rooms) {
      if (!rooms[roomId].isFull) {
        // Join the room
        socket.join(roomId);

        // Get the opponent's ID from the room object
        const opponentId = rooms[roomId].opponent;

        // Update player and room objects
        players[playerId].room = roomId;
        players[opponentId].room = roomId;
        rooms[roomId].isFull = true;

        // Notify both players that they are matched and can start the game
        io.in(roomId).emit("matched", JSON.stringify({
          player1: playerId,
          player2: opponentId,
          room: roomId
        }));
        io.in(roomId).emit("data", genArray());
        break;
      }
    }

    // If no available rooms found - create a new room
    if (!players[playerId].room) {
      const newRoomId = `room-${socket.id}`;

      // Create a new room object
      rooms[newRoomId] = {
        isFull: false,
        opponent: playerId,
      };

      // Join the room
      socket.join(newRoomId);

      // Update the player's room
      players[playerId].room = newRoomId;

      // Notify the player that they are waiting
      // Might not use
      socket.emit("waiting");
    }
  });
});
