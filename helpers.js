function isCollision(xObj1, yObj1, wObj1, hObj1, xObj2, yObj2, wObj2, hObj2) {
	if (xObj1 < xObj2 + wObj2 && xObj1 + wObj1 > xObj2 && yObj1 < yObj2 + hObj2 && hObj1 + yObj1 > yObj2) {
		return true;
	} else {
		return false;
	}
}

function squareCollision(xObj1, yObj1, wObj1, hObj1, xObj2, yObj2, wObj2, hObj2) {
	var stateP = null;
	if (isCollision(xObj1, yObj1, wObj1, hObj1, xObj2, yObj2, wObj2, hObj2)) {
		//Collison bottom
		if (yObj2 + hObj2 - yObj1 <= xObj2 + wObj2 - xObj1 && yObj2 <= yObj1) {
			stateP = 'bottom';
		} else {
			//Collision Top
			if (yObj1 + hObj1 - yObj2 <= xObj2 + wObj2 - xObj1 && yObj2 <= yObj1 + hObj1) {
				stateP = 'top';
			} else {
				//Collision Right
				if (xObj1 + wObj1 > xObj2) {
					stateP = 'left';
				} else {
					if (xObj2 + wObj2 < xObj1) {
						stateP = 'right';
					}
				}
			}
		}
	}
	return stateP;
}

function circleSquareCollision(cx, cy, radius, rx, ry, rw, rh) {
	// temporary variables to set edges for testing
	var testX = cx;
	var testY = cy;
	var direction = '';

	if (cy < ry) {
		// top
		testY = ry;
		direction += 'top';
	} else {
		if (cy > ry + rh) {
			testY = ry + rh; // bottom
			direction += 'bottom';
		}
	}

	if (cx < rx) {
		testX = rx; // left
		direction += 'left';
	} else {
		if (cx > rx + rw) {
			//right
			testX = rx + rw;
			direction += 'right';
		}
	}

	// get distance from closest edges
	var distX = cx - testX;
	var distY = cy - testY;
	var distance = Math.sqrt(distX * distX + distY * distY);

	if (distance <= radius) {
		return direction;
	}
	return null;
}

function playerBallCollision(ball, player) {
	var directionCollision = circleSquareCollision(
		ball.x,
		ball.y,
		ball.r,
		player.x,
		player.y,
		player.width,
		player.height
	);
	var status = '';
	if (directionCollision !== null) {
		status = 'shieldCollision';
		switch (directionCollision) {
			case 'top':
				if (player.shieldLocation === 'top') {
					ball.y = player.y - ball.r;
					ball.vy = -ball.vy;
				} else {
					status = 'playerDie';
				}
				break;
			case 'bottom':
				if (player.shieldLocation === 'bottom') {
					ball.y = player.y + player.height + ball.r;
					ball.vy = -ball.vy;
				} else {
					status = 'playerDie';
				}
				break;
			case 'left':
				if (player.shieldLocation === 'left') {
					ball.x = player.x - ball.r;
					ball.vx = -ball.vx;
				} else {
					status = 'playerDie';
				}
				break;
			case 'right':
				if (player.shieldLocation === 'right') {
					ball.x = player.x + player.width + ball.r;
					ball.vx = -ball.vx;
				} else {
					status = 'playerDie';
				}
				break;
			case 'topright':
				if (player.shieldLocation === 'top' || player.shieldLocation === 'right') {
					ball.y = player.y - ball.r;
					ball.x = player.x + player.width + ball.r;
					ball.vy = -ball.vy;
					ball.vx = -ball.vx;
				} else {
					status = 'playerDie';
				}
				break;
			case 'topleft':
				if (player.shieldLocation === 'top' || player.shieldLocation === 'left') {
					ball.y = player.y - ball.r;
					ball.x = player.x - ball.r;
					ball.vy = -ball.vy;
					ball.vx = -ball.vx;
				} else {
					status = 'playerDie';
				}
				break;
			case 'bottomright':
				if (player.shieldLocation === 'bottom' || player.shieldLocation === 'right') {
					ball.y = player.y + player.height + ball.r;
					ball.x = player.x + player.width + ball.r;
					ball.vy = -ball.vy;
					ball.vx = -ball.vx;
				} else {
					status = 'playerDie';
				}
				break;
			case 'bottomleft':
				if (player.shieldLocation === 'bottom' || player.shieldLocation === 'left') {
					ball.y = player.y + player.height + ball.r;
					ball.x = player.x - ball.r;
					ball.vy = -ball.vy;
					ball.vx = -ball.vx;
				} else {
					status = 'playerDie';
				}
				break;
		}
		return status;
	} else {
		status = 'noCollison';
		return status;
	}
}

module.exports = {
	isCollision: isCollision,
	squareCollision: squareCollision,
	circleSquareCollision: circleSquareCollision,
	playerBallCollision: playerBallCollision
};
