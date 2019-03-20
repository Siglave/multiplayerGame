const express = require('express');
const session = require('express-session')
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const path = require('path');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const uuidv1 = require('uuid/v1');
const helpers = require('./helpers');
const config = require('./config');
const db = require('./db');
const ObjectID = require('mongodb').ObjectID;

app.set('views', './pages')
app.set('view engine', 'pug')

app.use(session({
	secret: config.secretSession,
	resave: false,
	saveUninitialized: true,
	cookie: { secure: false }
}))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
	var isAuth = req.session.user !== undefined;
	res.render('index', { isAuth: isAuth });
});
app.post('/login', (req, res) => {
	db.getDB((dbClient, close) => {
		const collection = dbClient.collection('users');
		collection.find({ username: req.body.username }).toArray((err, docs) => {
			close();
			if (err) {
				return res.status(500).json({
					type: "Server error",
					msg: "Erreur du Serveur"
				})
			}
			if (docs.length === 0) {
				return res.status(500).json({
					type: "Form error",
					msg: "Nom ou mot de passe invalide"
				})
			}
			var user = docs[0];
			bcrypt.compare(req.body.password, user.password, function (err, result) {
				if (err) {
					return res.status(500).json({
						type: "Server error",
						msg: "Erreur du Serveur"
					})
				}
				if (result) {
					req.session.user = {
						username: user.username,
						_id: user._id
					}
					return res.json({
						msg: "User connected !"
					})
				} else {
					return res.status(500).json({
						type: "Form error",
						msg: "Nom ou mot de passe invalide"
					})
				}
			});
		});

	});

});
app.post('/signup', (req, res) => {
	db.getDB((dbClient, close) => {
		const collection = dbClient.collection('users');
		collection.find({ username: req.body.username }).toArray((err, docs) => {
			if (err) {
				return res.status(500).json({
					type: "Server error",
					msg: "Erreur du Serveur"
				})
			}

			if (docs.length > 0) {
				close();
				return res.status(500).json({
					type: "Form error",
					msg: "Erreur : Ce nom est déjà utilisé"
				})
			} else {
				bcrypt.hash(req.body.password, 10, (err, hashPassword) => {
					if (err) {
						return res.status(500).json({
							type: "Server error",
							msg: "Erreur du Serveur"
						})
					}
					collection.insertOne({ username: req.body.username, password: hashPassword, won: 0, lost: 0 }, (err, result) => {
						close();
						if (err) {
							return res.status(500).json({
								type: "Server error",
								msg: "Erreur du Serveur"
							})
						}
						return res.json({
							msg: "User Created"
						})
					})
				});
			}
		});

	})
});

app.get('/game', function (req, res) {
	return res.render('game', { user: req.session.user });
});

app.get('/scoreboard', function (req, res) {
	db.getDB((dbClient, close) => {
		const collection = dbClient.collection('users');
		collection.find({}).sort({ won: -1 }).toArray((err, docs) => {
			close();
			return res.render('scoreboard', { users: docs });
		});
	});
});

app.use(function (req, res, next) {
	return res.status(404).render('404');
});


var games = [];

function getGameWithSocketId(socketId) {
	var gameR = {};
	games.forEach((game) => {
		if (game.players[socketId] !== undefined) {
			gameR = game;
		}
	});
	return gameR;
}
function addScore(result) {
	db.getDB((dbClient, close) => {
		var collection = dbClient.collection('users');
		collection.updateOne({ '_id': ObjectID(result.winner) }, { $inc: { won: 1 } }, (err, r) => {
			collection.updateOne({ '_id': ObjectID(result.loser) }, { $inc: { lost: 1 } }, (err, r) => {
				close();
			});
		});
	});
}

io.on('connection', function (socket) {
	//Add new player to a room and start game if 2 players are connected
	socket.on('newPlayer', function (user) {
		var needNewRoom = true;

		games.some((game) => {
			var nbrPlayers = Object.values(game.players).length;
			if (nbrPlayers === 1) {
				game.players[socket.id] = {
					...user,
					socketId: socket.id,
					x: 100,
					y: 300,
					width: 50,
					height: 50,
					shieldLocation: "top",
					direction: {
						top: false,
						right: false,
						bottom: false,
						left: false
					}
				};
				game.started = true;
				needNewRoom = false;
				//Add the 2second player to the room
				socket.join(game.room);
				//Notify game start
				io.to(game.room).emit('startGame', game);
				//Break loop by returning true
				return true;
			}
		});
		if (needNewRoom) {
			//Add new Game
			var game = {
				players: {},
				balls: [
					{
						x: 10,
						y: 10,
						r: 10,
						vx: 2,
						vy: 1
					},
				],
				canvas: {
					width: 600,
					height: 700
				},
				room: uuidv1(),
				started: false
			};
			game.players[socket.id] = {
				...user,
				socketId: socket.id,
				x: 100,
				y: 200,
				width: 50,
				height: 50,
				shieldLocation: "top",
				direction: {
					top: false,
					right: false,
					bottom: false,
					left: false
				}
			};
			games.push(game);
			//Add 1st player to the room
			socket.join(game.room);
			console.log(game);
		}
	});

	socket.on('move', function (payload) {
		var game = getGameWithSocketId(socket.id);
		if (game.started !== undefined && game.started) {
			game.players[socket.id].direction[payload.direction] = payload.value;
		}
	});
	socket.on('moveShield', function (payload) {
		var game = getGameWithSocketId(socket.id);
		if (game.started !== undefined && game.started) {
			game.players[socket.id].shieldLocation = payload.direction;
		}
	});

	socket.on('disconnect', function () {
		var game = getGameWithSocketId(socket.id);
		if (game.room !== undefined) {
			var players = Object.values(game.players);
			game.started = false;
			if (players.length === 2) {
				var result = {};
				if (players[0].socketId === socket.id) {
					result.winner = players[1].socketId;
					result.loser = players[0].socketId;

				} else {
					result.winner = players[0].socketId;
					result.loser = players[1].socketId;
				}
				io.to(game.room).emit('endGame', result);
			}
			//Delete game
			games.forEach((oneGame, index, gameArray) => {
				if (oneGame.room === game.room) {
					gameArray.splice(index, 1);
				}
			})
		}
	});
});
//Add Ball every 10 sec
setInterval(function () {
	games.forEach((game) => {
		if (game.started) {
			game.balls.push({
				x: 10,
				y: 10,
				r: 10,
				vx: 2,
				vy: 1
			})
		}
	})
}, 10000)

//Game loop
setInterval(function () {
	games.forEach((game, index, gameArray) => {
		if (game.started) {
			var result = {};
			var endGame = false;
			var players = Object.values(game.players);
			var playersMoveTo = {
				[players[0].socketId]: {
					x: 0,
					y: 0
				},
				[players[1].socketId]: {
					x: 0,
					y: 0
				}
			};
			//Move players
			players.forEach((player) => {
				if (player.direction.top) {
					player.y = player.y - 7;
					playersMoveTo[player.socketId].y = -7;
				}
				if (player.direction.right) {
					player.x = player.x + 7;
					playersMoveTo[player.socketId].x = 7;
				}
				if (player.direction.bottom) {
					player.y = player.y + 7;
					playersMoveTo[player.socketId].y = 7;
				}
				if (player.direction.left) {
					player.x = player.x - 7;
					playersMoveTo[player.socketId].x = -7;
				}
			});
			//Detect collision between players
			if (
				helpers.isCollision(
					players[0].x,
					players[0].y,
					players[0].width,
					players[0].height,
					players[1].x,
					players[1].y,
					players[1].width,
					players[1].height
				)
			) {
				//If collision move player to original place
				players[0].x = players[0].x - playersMoveTo[players[0].socketId].x;
				players[0].y = players[0].y - playersMoveTo[players[0].socketId].y;

				players[1].x = players[1].x - playersMoveTo[players[1].socketId].x;
				players[1].y = players[1].y - playersMoveTo[players[1].socketId].y;
			}
			//Detect collision between players and canvas
			players.forEach((player) => {
				if (player.x < 21) {
					player.x = 21;
				}
				if (player.x + player.width > game.canvas.width - 21) {
					player.x = game.canvas.width - player.width - 21;
				}
				if (player.y - 21 < 0) {
					player.y = 21;
				}
				if (player.y + player.height > game.canvas.height - 21) {
					player.y = game.canvas.height - player.height - 21;
				}
			});
			//Detect collison between balls and player
			game.balls.forEach((ball) => {
				players.some((player, i, playerArray) => {
					var status = helpers.playerBallCollision(ball, player);
					if (status === "shieldCollision") {
						if (ball.x - ball.r + ball.vx < 0 || ball.x + ball.r + ball.vx > 0 + game.canvas.width) {
							player.x = player.x - playersMoveTo[player.socketId].x;
							player.y = player.y - playersMoveTo[player.socketId].y;
						} else {
							if (ball.y + ball.r + ball.vy > 0 + game.canvas.height || ball.y - ball.r + ball.vy < 0) {
								player.x = player.x - playersMoveTo[player.socketId].x;
								player.y = player.y - playersMoveTo[player.socketId].y;
							}
						}
					} else {
						if (status === "noCollison") {
							return false;
						} else {
							if (status === "playerDie") {
								//Player is hit by a ball, stop the game
								game.started = false;
								if (i === 0) {
									result.winner = playerArray[1].socketId;
									result.loser = playerArray[0].socketId;
									result.winnerMongoId = players[1]._id;
									result.loserMongoId = players[0]._id;
								} else {
									result.winner = playerArray[0].socketId;
									result.loser = playerArray[1].socketId;
									result.winnerMongoId = players[0]._id;
									result.loserMongoId = players[1]._id;
								}
								endGame = true;
							}
						}
					}
				});
			});

			//Detect collision between balls and canvas
			game.balls.forEach((ball) => {
				if (ball.x - ball.r + ball.vx < 0 || ball.x + ball.r + ball.vx > 0 + game.canvas.width) {
					ball.vx = -ball.vx;
				}

				if (ball.y + ball.r + ball.vy > 0 + game.canvas.height || ball.y - ball.r + ball.vy < 0) {
					ball.vy = -ball.vy;
				}
				//Move ball
				ball.x += ball.vx;
				ball.y += ball.vy;
			});

			//Update Game
			io.to(game.room).emit('update', game);
			if (endGame) {
				var res = {
					winner: result.winnerMongoId,
					loser: result.loserMongoId
				}
				addScore(res);
				io.to(game.room).emit('endGame', {
					winner: result.winner,
					loser: result.loser
				});
				//Remove Game and players from the list
				gameArray.splice(index, 1);
			}
		}
	});
}, 16);

var port = process.env.PORT || 3000
http.listen(port, function () {
	console.log('listening on *:3000');
});
