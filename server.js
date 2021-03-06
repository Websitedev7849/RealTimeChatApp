require('dotenv').config()

const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser')
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const db = require("./src/db")
const { verifyJWT } = require("./middlewares/checkUserValidity")

const router = require("./routes/RouteHandler")

const HOSTNAME = "localhost"
const PORT = process.env.PORT || 3000;

app.use( express.json() );
app.use( bodyParser.json() );  
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 
app.use(express.static('public'))
app.set("view engine", "ejs")
app.set("views", "views")
app.use(cookieParser());


app.get('/', (req, res) => {
  res.redirect("/home")
});

app.use(router)


const homeSocket = io.of("/home")
homeSocket.use(async (socket,next) => {
  const jwt = socket.request._query["jwt_token"];
  try {
    const decodedToken = await verifyJWT(jwt);
    // console.log(decodedToken);
    next()
  } catch (error) {
    console.log(error);
    io.of("/home").in(socket.id).emit("new_msg", {msg: "user_not_valid"})
  }
  
})


homeSocket.on('connection', (socket) => {
  socket.on("user-connected", async (username, userID) => {


    try {

      // create ActiveUsers Table in DB
      await db.registerActiveUser(userID, socket.id)

      // join a room name after its socket id
      socket.join(socket.id)
      console.log(`User ${username} userID: ${userID} connected with socket id : ${socket.id}`);

    } catch (error) {
      console.log(error);

      // if user id is already present in ActiveUsers Table
      if (error.code === 'ER_DUP_ENTRY') {
        io.of("/home").in(socket.id).emit("new_msg", {msg: "already_logged_in"})
      }
      else{
        io.of("/home").in(socket.id).emit("new_msg", {msg: "something_went_wrong"})
      }
     
    }

    socket.on("connect-to-user", async (socketID) => {
      // io.sockets.in(socketID).emit("conn_req", {msg: `${username} wants to connect.`})
      io.of("/home").in(socketID).emit("conn_req", {
        msg: `${username} wants to connect.`,
        username: username,
        reqSenderSocketID: socket.id
      })
    })

    // get the room id from acceptor and send it to request sender to join
    socket.on("accept-req", async (reqSenderSocketID, reqAcceptorUsername,chatRoomID) => {
      console.log("accepting request", reqSenderSocketID);
      
      io.of("/home").in(reqSenderSocketID).emit("req_accepted", {
        receiverSocketID: socket.id,
        reqSenderUsername: reqAcceptorUsername,
        chatRoomID: chatRoomID
      })
    })

    socket.on("disconnect", () => {
      console.log(`user ${username} disconnected with id ${socket.id}`);

      try {
        db.deRegisterActiveUser(userID)
      } catch (error) {
        console.log(error);
      }

    })
  })

});

const chatSocket = io.of("/chat")
chatSocket.use(async (socket,next) => {
  const jwt = socket.request._query["jwt_token"];
  try {
    const decodedToken = await verifyJWT(jwt);
    // console.log(decodedToken);
    next()
  } catch (error) {
    console.log(error);
    io.of("/chat").in(socket.id).emit("new_msg", {msg: "user_not_valid"})
  }
  
})
chatSocket.on("connect", socket => {
  socket.on("user-connected", (username, userID) => {
    console.log(`User ${username} userID: ${userID} joined chat room with socket id : ${socket.id}`);
  })

  socket.on("join-chat-room", roomID=>{
    socket.join(roomID)
  })

  socket.on("new-message", (roomID, message) => {
    // console.log(message);
    socket.to(roomID).emit("new_message", message)
  })
})


server.listen(PORT, () => {
  console.log(`listening on http://localhost:${PORT}`);
});
