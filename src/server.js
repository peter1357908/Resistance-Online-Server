import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import morgan from 'morgan';
import socketio from 'socket.io';
import http from 'http';
import mongoose from 'mongoose';

import * as Game from './controllers/game_controller';

// DB Setup
const config = {
  useNewUrlParser: true, // (node:24427) DeprecationWarning
  useUnifiedTopology: true, // (node:24427) DeprecationWarning
};
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost/COSC52OnlineMultiplayerGame';
mongoose.connect(mongoURI, config);
// set mongoose promises to es6 default
mongoose.Promise = global.Promise;

// initialize
const app = express();
const server = http.createServer(app);
const io = socketio(server);

// enable/disable cross origin resource sharing if necessary
app.use(cors());

// enable/disable http request logging
app.use(morgan('dev'));

// enable only if you want templating
app.set('view engine', 'ejs');

// enable only if you want static assets from folder static
app.use(express.static('static'));

// this just allows us to render ejs from the ../app/views directory
app.set('views', path.join(__dirname, '../src/views'));

// enable json message body for posting data to API
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// additional init stuff should go before hitting the routing

// default index route
app.get('/', (req, res) => {
  res.send('hi');
});

// START THE SERVER
// =============================================================================
const port = process.env.PORT || 9090;
server.listen(port);

console.log(`listening on: ${port}`);

io.on('connection', (socket) => {
  // ==============================================================
  // upon first connection, do...

  // ==============================================================
  // helper functions

  // ==============================================================
  // socket events

  socket.on('createGame', (fields) => {
    Game.createGame(fields).then((gameInfo) => {
      io.sockets.emit(fields.sessionID, gameInfo);
    }).catch((error) => {
      console.log(error);
      socket.emit('error', 'create failed');
    });
  });

  socket.on('joinGame', (fields) => {
    Game.joinGame(fields).then((gameInfo) => {
      socket.emit('joinSucceeded');
      io.sockets.emit(fields.sessionID, gameInfo);
    }).catch((error) => {
      console.log(error);
      socket.emit('joinFailed');
    });
  });
});
