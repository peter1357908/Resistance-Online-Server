import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
// import path from 'path';
import morgan from 'morgan';
import socketio from 'socket.io';
import http from 'http';
import mongoose from 'mongoose';

import * as Pregame from './controllers/pregame_controller';
import * as Ingame from './controllers/ingame_controller';
import * as Postgame from './controllers/postgame_controller';

// DB Setup
const config = {
  useNewUrlParser: true, // (node:24427) DeprecationWarning
  useUnifiedTopology: true, // (node:24427) DeprecationWarning
  useFindAndModify: false, // (node:66361) DeprecationWarning
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
// app.set('view engine', 'ejs');

// enable only if you want static assets from folder static
// app.use(express.static('static'));

// this just allows us to render ejs from the ../app/views directory
// app.set('views', path.join(__dirname, '../src/views'));

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

io.on('connection', (socket) => {
  // ==============================================================
  // upon first connection, do...

  // ==============================================================
  // helper functions

  // ==============================================================
  // socket events

  socket.on('createGame', (fields) => {
    Pregame.createGame(fields, socket.id).then((result) => {
      socket.join(fields.sessionID);
      io.to(socket.id).emit('createGame', {
        playerID: result.playerID,
        sessionID: result.sessionID,
      });
      io.to(fields.sessionID).emit('lobby', {
        action: 'someoneJoined',
        creatorID: result.creatorID,
        playerIDs: result.playerIDs,
      }); // equivalent to io.to(socket.id) HERE
    }).catch((error) => {
      io.to(socket.id).emit('createGame', { playerID: null, failMessage: error.message });
    });
  });

  // TODO: handle errors
  socket.on('joinGame', (fields) => {
    Pregame.joinGame(fields, socket.id).then((result) => {
      socket.join(fields.sessionID);
      io.to(socket.id).emit('joinGame', {
        playerID: result.playerID,
        sessionID: result.sessionID,
      });
      io.to(socket.id).emit('chat', result.chatLog);
      io.to(fields.sessionID).emit('lobby', {
        action: 'someoneJoined',
        creatorID: result.creatorID,
        playerIDs: result.playerIDs,
      });
    }).catch((error) => {
      io.to(socket.id).emit('joinGame', { playerID: null, failMessage: error.message });
    });
  });

  socket.on('lobby', (fields) => {
    switch (fields.action) {
      case 'quitLobby':
        Pregame.quitLobby(socket.id).then((result) => {
          io.to(socket.id).emit('lobby', { action: 'quitAcknowledged' });
          socket.leave(result.sessionID);
          // only emit to the other players if there are any left
          if (result.playerIDs !== null) {
            io.to(result.sessionID).emit('lobby', {
              action: 'someoneQuit',
              playerIDs: result.playerIDs,
              creatorID: result.creatorID,
            });
          }
        }).catch((error) => {
          io.to(socket.id).emit('lobby', { action: 'fail', failMessage: error.message });
        });
        break;
      case 'startGame':
        Pregame.startGame(socket.id).then((result) => {
          io.to(result.sessionID).emit('lobby', {
            action: result.action,
          });
          io.to(result.sessionID).emit('inGame', {
            action: result.action,
            playerIDs: result.playerIDs,
            missionSizes: result.missionSizes,
          });

          for (let i = 0; i < result.spySocketIDs.length; i += 1) {
            io.to(result.spySocketIDs[i]).emit('inGame', {
              action: 'youAreSpy',
              spies: result.spies,
            });
          }
        }).catch((error) => {
          console.log(error);
          io.to(socket.id).emit('lobby', { action: 'fail', failMessage: error.message });
        });
        break;
      default:
        console.log(`unknown action: ${fields.action}`);
        break;
    }
  });

  socket.on('inGame', (fields) => {
    switch (fields.action) {
      case 'factionViewed':
        Ingame.factionViewed(socket.id).then((result) => {
          io.to(result.sessionID).emit('inGame', {
            action: 'waitingFor',
            waitingFor: result.waitingFor,
          });
          if (result.action === 'everyoneViewedFaction') {
            io.to(result.sessionID).emit('inGame', {
              action: result.action,
              currentLeaderID: result.currentLeaderID,
              currentMission: result.currentMission,
              currentRound: result.currentRound,
              missionSize: result.missionSize,
            });
          }
        }).catch((error) => {
          console.log(error);
          io.to(socket.id).emit('inGame', { action: 'fail', failMessage: error.message });
        });
        break;
      case 'cardClicked':
        Ingame.cardClicked(fields, socket.id).then((result) => {
          io.to(result.sessionID).emit('inGame', {
            action: result.action,
            cardPlayerID: result.cardPlayerID,
          });
        }).catch((error) => {
          console.log(error);
          io.to(socket.id).emit('inGame', { action: 'fail', failMessage: error.message });
        });
        break;
      case 'proposeTeam':
        Ingame.proposeTeam(fields, socket.id).then((result) => {
          io.to(result.sessionID).emit('inGame', {
            action: result.action,
            proposedTeam: result.proposedTeam,
          });
        }).catch((error) => {
          console.log(error);
          io.to(socket.id).emit('inGame', { action: 'fail', failMessage: error.message });
        });
        break;
      case 'voteOnTeamProposal':
        Ingame.voteOnTeamProposal(fields, socket.id).then((result) => {
          io.to(result.sessionID).emit('inGame', {
            action: 'waitingFor',
            waitingFor: result.waitingFor,
          });
          if (result.action === 'roundVotes') {
            io.to(result.sessionID).emit('inGame', {
              action: result.action,
              voteComposition: result.voteComposition,
              roundOutcome: result.roundOutcome,
              concludedRound: result.concludedRound,
            });
            if (Object.prototype.hasOwnProperty.call(result, 'victoriousFaction')) {
              io.to(result.sessionID).emit('inGame', {
                action: 'gameFinished',
                victoriousFaction: result.victoriousFaction,
              });
              io.to(result.sessionID).emit('postGame', {
                action: 'gameHistory',
                victoriousFaction: result.victoriousFaction,
                spies: result.spies,
                gameHistory: result.gameHistory,
              });
            }
          }
        }).catch((error) => {
          console.log(error);
          io.to(socket.id).emit('inGame', { action: 'fail', failMessage: error.message });
        });
        break;
      case 'votesViewed':
        Ingame.votesViewed(socket.id).then((result) => {
          io.to(result.sessionID).emit('inGame', {
            action: 'waitingFor',
            waitingFor: result.waitingFor,
          });
          if (result.action === 'missionStarting') {
            io.to(result.sessionID).emit('inGame', {
              action: result.action,
              playersOnMission: result.playersOnMission,
            });
          } else if (result.action === 'teamSelectionStarting') {
            io.to(result.sessionID).emit('inGame', {
              action: result.action,
              currentLeaderID: result.currentLeaderID,
              currentMission: result.currentMission,
              currentRound: result.currentRound,
              missionSize: result.missionSize,
            });
          }
        }).catch((error) => {
          console.log(error);
          io.to(socket.id).emit('inGame', { action: 'fail', failMessage: error.message });
        });
        break;
      case 'voteOnMissionOutcome':
        Ingame.voteOnMissionOutcome(fields, socket.id).then((result) => {
          io.to(result.sessionID).emit('inGame', {
            action: 'waitingFor',
            waitingFor: result.waitingFor,
          });
          if (result.action === 'missionVotes') {
            io.to(result.sessionID).emit('inGame', {
              action: result.action,
              numFailVotes: result.numFailVotes,
              missionOutcome: result.missionOutcome,
              concludedMission: result.concludedMission,
            });
            if (Object.prototype.hasOwnProperty.call(result, 'victoriousFaction')) {
              io.to(result.sessionID).emit('inGame', {
                action: 'gameFinished',
                victoriousFaction: result.victoriousFaction,
              });
              io.to(result.sessionID).emit('postGame', {
                action: 'gameHistory',
                victoriousFaction: result.victoriousFaction,
                spies: result.spies,
                gameHistory: result.gameHistory,
              });
            } else {
              // the game is not ending yet
              io.to(result.sessionID).emit('inGame', {
                action: 'teamSelectionStarting',
                currentLeaderID: result.currentLeaderID,
                currentMission: result.currentMission,
                currentRound: result.currentRound,
                missionSize: result.missionSize,
              });
            }
          }
        }).catch((error) => {
          console.log(error);
          io.to(socket.id).emit('inGame', { action: 'fail', failMessage: error.message });
        });
        break;
      default:
        console.log(`unknown action: ${fields.action}`);
        break;
    }
  });

  socket.on('postGame', (fields) => {
    Postgame.finishViewingGameHistory(socket.id).then((result) => {
      io.to(result.sessionID).emit('postGame', {
        action: result.action,
        waitingFor: result.waitingFor,
      });
    }).catch((error) => {
      console.log(error);
      io.to(socket.id).emit('postGame', { action: 'fail', failMessage: error.message });
    });
  });

  socket.on('chat', (message) => {
    Ingame.newChat(message, socket.id).then((result) => {
      io.to(result.sessionID).emit('chat', result.broadcastMessage);
    }).catch((error) => {
      console.log(error);
      io.to(socket.id).emit('chat', [
        'THE ALMIGHTY SERVER', // 19 characters in length, which is impossible for a playerID
        error.message,
      ]);
    });
  });

  socket.on('disconnect', () => {
    Pregame.handleDisconnection(socket.id).then((result) => {
      // only emit to the other players if necessary
      // TODO: update protocol accordingly...
      if (result.playerIDs !== null) {
        io.to(result.sessionID).emit(result.event, {
          action: 'someoneQuit',
          playerIDs: result.playerIDs,
          creatorID: result.creatorID,
        });
      }
    }).catch((error) => { console.log(error); });
  });
});
