document.addEventListener('DOMContentLoaded', function () {
	var socket = io();
	var canvas = document.getElementById('canvas-game');
	var ctx = canvas.getContext('2d');
	$('#pre-game-section').show();
	$('#game-section').hide();
	$('#replay').hide();

	document.getElementById('player-form').onsubmit = function (e) {
		e.preventDefault();
		var formData = new FormData(document.getElementById('player-form'));
		// Add new Player to the game
		var username = $("#player-info").data("name-player");
		var _id = $("#player-info").data("id-player");
		socket.emit('newPlayer', {
			"username": username,
			"_id": _id,
			"color": formData.get('color')
		});
		//Disable play button until the game start
		$('#submit-player-button').prop("disabled", true);
		$('#submit-player-button').html("<span class='spinner-border spinner-border-sm' role='status' aria-hidden='true'></span>En attente de joueur");
	};

	$("#replay").on("click", function (e) {
		$(this).hide();
		$("#game-section").hide();
		$("#pre-game-section").show();
		$('#submit-player-button').prop("disabled", false);
		$('#submit-player-button').html("⚔️ Rejoindre une partie");
	})

	socket.on('startGame', function (stateGame) {
		//Hide form show canvas
		$('#pre-game-section').hide();
		$('#game-section').show();
		//Add listeners
		window.addEventListener('keydown', function (e) {
			if (e.defaultPrevented) {
				return;
			}
			switch (e.keyCode) {
				case 38:
					socket.emit('move', { "direction": 'top', "value": true });
					break;
				case 39:
					socket.emit('move', { "direction": 'right', "value": true });
					break;
				case 40:
					socket.emit('move', { "direction": 'bottom', "value": true });
					break;
				case 37:
					socket.emit('move', { "direction": 'left', "value": true });
					break;
				case 90:
					socket.emit('moveShield', { "direction": 'top' });
					break;
				case 68:
					socket.emit('moveShield', { "direction": 'right' });
					break;
				case 83:
					socket.emit('moveShield', { "direction": 'bottom' });
					break;
				case 81:
					socket.emit('moveShield', { "direction": 'left' });
					break;
			}
			e.preventDefault();
		});

		window.addEventListener('keyup', function (e) {
			if (e.defaultPrevented) {
				return;
			}
			switch (e.keyCode) {
				case 38:
					socket.emit('move', { "direction": 'top', "value": false });
					break;
				case 39:
					socket.emit('move', { "direction": 'right', "value": false });
					break;
				case 40:
					socket.emit('move', { "direction": 'bottom', "value": false });
					break;
				case 37:
					socket.emit('move', { "direction": 'left', "value": false });
					break;
			}
			e.preventDefault();
		});
	});
	socket.on('update', function (game) {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		var players = Object.values(game.players);
		//Draw players
		players.forEach(function (player) {
			//Draw square
			ctx.fillStyle = player.color;
			ctx.fillRect(player.x, player.y, player.width, player.height);
			//Draw shield
			ctx.fillStyle = '#1476ff';
			ctx.beginPath();
			switch (player.shieldLocation) {
				case 'top':
					ctx.fillRect(player.x, player.y, player.width, 5);
					break;
				case 'right':
					ctx.fillRect(player.x + player.width - 5, player.y, 5, player.height);
					break;
				case 'bottom':
					ctx.fillRect(player.x, player.y + player.height - 5, player.width, 5);
					break;
				case 'left':
					ctx.fillRect(player.x, player.y, 5, player.height);
					break;
			}
			//Draw name
			ctx.fillStyle = '#000000';
			ctx.font = "16px Arial";
			ctx.fillText(player.username, player.x, player.y - 20);
		});
		//Draw balls
		game.balls.forEach(function (ball) {
			ctx.fillStyle = '#1476ff';
			ctx.beginPath();
			ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2, true);
			ctx.fill();
		});
	});

	socket.on('endGame', function (result) {
		$('#replay').show();
		//Show winner
		ctx.font = "48px Arial";
		if (result.winner === socket.id) {
			ctx.fillStyle = '#1cd85d';
			ctx.fillText("Gagné !", 200, 50);
		} else {
			ctx.fillStyle = '#d81c1c';
			ctx.fillText("Perdu !", 200, 50);
		}
	})
});
