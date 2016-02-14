$(document).ready(function() {
    var config = {
        'gridLength': 6,
        'gridHeight': 14,
        'gemWidth': 43,
        'boarderColor': 'white',
        'backGroundColor': "#333333",
        'startX': 3,
        'startY': 2,
        'refreshSpeed': 60,
        'dropSpeed': 1,
        'wait': 30,
        'colors': ['red', 'blue', 'yellow', 'green']
    };

    // draw the game board
    var gameTime = 0;
    var dspeed = config['dropSpeed'];
    var game = null;
    var canvasWidth = config['gridLength'] * config['gemWidth'];
    var canvasHeight = config['gridHeight'] * config['gemWidth'];
    var gemWidth = config['gemWidth'];
    var gemHeight = canvasHeight / config['gridHeight'];
    var canvas = document.getElementById('pf');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    var context = canvas.getContext('2d');
    context.fillStyle = config['backGroundColor'];

    // create squares in a loop
    for (var x = 0; x < canvas.width; x += gemWidth) {
        for (var y = 0; y < canvas.height; y += gemHeight) {
            context.fillRect(x, y, gemWidth - 1, gemHeight - 1);
        }
    }

    var Block = function(color, isBomb) {
        this.isActive = true;
        this.color = color;
        this.isBomb = isBomb;
        this.x = config['startX'];
        this.cordY = 0;
        this.left = 0;
        this.up = 0;
        this.right = 0;
        this.down = 0;
        this.wait = 0;

        this.getY = function() {
            return Math.floor(this.cordY / gemHeight);
        }

        this.getYceil = function() {
            return Math.ceil(this.cordY / gemHeight);
        }

        this.isOnGameBoard = function(x, y) {
            return x < game.width && x >= 0 && y < game.height && y >= 0;
        }

        this.lookAround = function() {
            if (this.isOnGameBoard(this.x - 1, this.getY())) {
                this.left = game.board[this.x - 1][this.getY()];
            }
            if (this.isOnGameBoard(this.x, this.getY() + 1)) {
                this.up = game.board[this.x][this.getY() + 1];
            }
            if (this.isOnGameBoard(this.x + 1, this.getY())) {
                this.right = game.board[this.x + 1][this.getY()];
            }
            if (this.isOnGameBoard(this.x, this.getY() - 1)) {
                this.down = game.board[this.x][this.getY() - 1];
            }
        }

        this.moveLeft = function() {
            if (this.x > 0 && game.board[this.x - 1][this.getYceil()] == 0) {
                this.x -= 1;
                return true;
            }
            return false;
        }

        this.moveRight = function() {
            if (this.x < config['gridLength'] - 1 && game.board[this.x + 1][this.getYceil()] == 0) {
                this.x += 1;
                return true;
            }
            return false;
        }

        this.moveUp = function() {
            if (this.getY() > 0 && game.board[this.x][this.getY() - 1] == 0) {
                this.cordY -= config['gemWidth'];
                return true;
            }
            return false;
        }

        this.moveDown = function() {
            if (this.getY() < config['gridHeight'] - 2 && game.board[this.x][this.getYceil() + 1] == 0) {
                this.cordY += config['gemWidth'];
                return true;
            }
            return false;
        }

        this.drop = function() {
            var y = this.getY();
            while (y < config['gridHeight'] - 1 && game.board[this.x][y + 1] == 0) {
                y++;
            }
            this.cordY = y * gemHeight;
            game.board[this.x][y] = this;
            this.isActive = false;
        }

        this.fall = function() {
            if (this.cordY + gemHeight < canvasHeight && game.board[this.x][this.getY() + 1] == 0) {
                //var y = this.getY();
                //while (y < config['gridHeight'] - 1 && game.board[this.x][y + 1] == 0) {
                //    y++;
                //}

                //var dist = Math.min(dspeed, canvasHeight-this.cordY-gemHeight, y*gemHeight-this.cordY);
                this.cordY += 1;
                return true;
            } else {
                if (game.collapsing == false && this.wait != config['wait']) {
                    this.wait += 1;
                    return true;
                }

                game.board[this.x][this.getY()] = this;
                this.isActive = false;
                return false;
            }
        }

        this.drawSelf = function() {
            context.fillStyle = this.color;
            if (this.isBomb) {
                context.beginPath();
                context.ellipse(this.x * gemWidth + gemWidth / 2, this.cordY + gemHeight / 2, (gemWidth - 2) / 2, (gemHeight - 2) / 2, 0, 0, Math.PI * 2);
                context.closePath();
                context.fill();
            } else {
                context.fillRect(this.x * gemWidth, this.cordY, gemWidth - 1, gemHeight - 1);
            }
        }

        this.explode = function() {
            this.lookAround();
            game.board[this.x][this.getY()] = 0;
            if (this.left != 0 && this.left.color == this.color) {
                this.left.explode();
            }
            if (this.up != 0 && this.up.color == this.color) {
                this.up.explode();
            }
            if (this.right != 0 && this.right.color == this.color) {
                this.right.explode();
            }
            if (this.down != 0 && this.down.color == this.color) {
                this.down.explode();
            }
        }
    }

    var TwoBlock = function(one, two) {
        this.blockOne = one;
        this.blockTwo = two;
        this.orientation = 180;

        this.isAlive = function() {
            return this.blockOne.isActive || this.blockTwo.isActive;
        }

        this.canMove = function() {
            return this.blockOne.isActive && this.blockTwo.isActive;
        }

        this.isOneInactive = function() {
            return !this.blockOne.isActive || !this.blockTwo.isActive;
        }

        this.rotate = function() {
            if (this.orientation == 180) {
                if (this.blockOne.x > 0 && game.board[this.blockOne.x - 1][this.blockOne.getYceil()] == 0 && game.board[this.blockOne.x - 1][this.blockOne.getY()] == 0) {
                    if (this.blockTwo.moveLeft() == true) {
                        if (this.blockTwo.moveUp() == true) {
                            this.orientation = (this.orientation + 90) % 360;
                            return true;
                        }
                    }
                }
            }
            if (this.orientation == 270) {
                if (this.blockTwo.moveUp() == true) {
                    if (this.blockTwo.moveRight() == true) {
                        this.orientation = (this.orientation + 90) % 360;
                        return true;
                    }
                }
            }
            if (this.orientation == 0) {
                if (this.blockOne.x < config['gridLength'] - 1 && game.board[this.blockOne.x + 1][this.blockOne.getYceil()] == 0) {
                    if (this.blockTwo.moveRight() == true) {
                        if (this.blockTwo.moveDown() == true) {
                            this.orientation = (this.orientation + 90) % 360;
                            return true;
                        }
                    }
                }
            }
            if (this.orientation == 90) {
                if (this.blockOne.getY() < config['gridHeight'] - 2 && game.board[this.blockOne.x][this.blockOne.getYceil() + 1] == 0) {
                    if (this.blockTwo.moveDown() == true) {
                        if (this.blockTwo.moveLeft() == true) {
                            this.orientation = (this.orientation + 90) % 360;
                            return true;
                        }
                    }
                }
            }
            return false;
        }

        this.changePosition = function() {
            if (this.isOneInactive()) {
                return false;
            }
            if (this.rotate()) {
                return true;
            }
        }

        this.moveLeft = function() {
            if (this.isOneInactive()) {
                return false;
            }

            var leftSide = this.blockOne;
            if (this.orientation == 270) {
                leftSide = this.blockTwo;
            }

            if (leftSide.x > 0 && game.board[this.blockOne.x - 1][this.blockOne.getYceil()] == 0 && game.board[this.blockOne.x - 1][this.blockOne.getY()] == 0 && game.board[this.blockTwo.x - 1][this.blockTwo.getYceil()] == 0 && game.board[this.blockTwo.x - 1][this.blockTwo.getY()] == 0) {

                this.blockOne.x -= 1;
                this.blockTwo.x -= 1;
                return true;
            }
            return false;
        }

        this.moveRight = function() {
            if (this.isOneInactive()) {
                return false;
            }

            var rightSide = this.blockTwo;
            if (this.orientation == 270) {
                rightSide = this.blockOne;
            }

            if (rightSide.x < config['gridLength'] - 1 && game.board[this.blockOne.x + 1][this.blockOne.getY()] == 0 && game.board[this.blockOne.x + 1][this.blockOne.getYceil()] == 0 && game.board[this.blockTwo.x + 1][this.blockTwo.getYceil()] == 0 && game.board[this.blockTwo.x + 1][this.blockTwo.getY()] == 0) {

                this.blockOne.x += 1;
                this.blockTwo.x += 1;
                return true;
            }
            return false;
        }

        this.drop = function() {
            var bottomBlock = this.blockTwo;
            var topBlock = this.blockOne;
            if (this.orientation == 0) {
                bottomBlock = this.blockOne;
                topBlock = this.blockTwo;
            }

            if (!this.isOneInactive()) {
                bottomBlock.drop();
                topBlock.drop();
            }
        }

        this.drawSelf = function() {
            this.blockOne.drawSelf();
            this.blockTwo.drawSelf();
        }

        this.fall = function() {
            if (this.isAlive()) {
                var stoppedBlock = this.blockOne;
                var otherBlock = this.blockTwo;
                // cannot move down anymore
                if (!(this.blockOne.cordY + config['gemWidth'] < canvasHeight && game.board[this.blockOne.x][this.blockOne.getY() + 1] == 0)) {
                    stoppedBlock = this.blockOne;
                    otherBlock = this.blockTwo;

                }

                if (!(this.blockTwo.cordY + config['gemWidth'] < canvasHeight && game.board[this.blockTwo.x][this.blockTwo.getY() + 1] == 0)) {
                    stoppedBlock = this.blockTwo;
                    otherBlock = this.blockOne;
                }

                var sby = stoppedBlock.cordY;
                if (stoppedBlock.isActive == true) {
                    stoppedBlock.fall();
                }

                if (otherBlock.isActive == true && stoppedBlock.isActive == true && stoppedBlock.cordY != sby) {
                    otherBlock.fall();
                } else if (otherBlock.isActive == true && stoppedBlock.isActive == false) {
                    otherBlock.fall();
                }

            }
        }
    }

    var twoBlockGame = function(w, h) {
        this.width = w;
        this.height = h;
        this.pause = false;
        this.board = startingBoard(w, h);
        this.secondBoard = null;
        this.activeLink = 0;
        this.collapsing = false;

        this.isGameOver = function() {
            return this.board[config['startX']][config['startY'] - 1];
        }

        this.nextLink = function() {
            var pot = [false, false];
            if (randomChoice([true, false])) {
                pot[randomChoice([0, 1])] = true;
            }

            var firstBlock = new Block(randomChoice(config['colors']), pot[0]);
            var secondBlock = new Block(randomChoice(config['colors']), pot[1]);
            secondBlock.cordY = config['gemWidth'];
            this.activeLink = new TwoBlock(firstBlock, secondBlock);
        }

        this.collapse = function() {
            var clps = false;
            for (var i = 0; i < this.width; i++) {
                for (var j = this.height - 1; j >= 0; j--) {
                    var block = this.secondBoard[i][j];
                    if (block != 0 && block.isActive) {
                        if (block.fall() == true) {
                            clps = true;
                        }
                    }
                }
            }
            this.collapsing = clps;
        }
    }

    function randomChoice(choices) {
        return choices[Math.floor(choices.length * Math.random())];
    }

    function drawBoard(g) {
        var boardToDraw = g.board;

        if (g.collapsing) {
            boardToDraw = g.secondBoard;
        }
        context.fillStyle = config['boarderColor'];
        context.fillRect(0, 0, canvasWidth, canvasHeight);

        for (var i = 0; i < g.width; i++) {
            for (var j = 0; j < g.height; j++) {
                context.fillStyle = config['backGroundColor'];
                context.fillRect(i * gemWidth, j * gemHeight, gemWidth - 1, gemHeight - 1);
            }
        }

        for (var i = 0; i < g.width; i++) {
            for (var j = 0; j < g.height; j++) {
                var blk = boardToDraw[i][j];
                if (blk != 0) {
                    blk.drawSelf();
                }
            }
        }

        // draw the activeLink
        if (g.activeLink && g.activeLink.isAlive()) {
            g.activeLink.drawSelf();
        }
    }

    //initiate the matrix 0
    function ZeroMatrix(m, n) {
        matrix = [];
        for (var i = 0; i < m; i++) {
            matrix.push([]);
            for (var j = 0; j < n; j++) {
                matrix[i].push(0);
            }
        }
        return matrix;
    }

    function startingBoard(m, n) {
        matrix = ZeroMatrix(m, n);
        for (var i = 0; i < m; i++) {
            for (var j = 0; j < 2; j++) {
                if (i != config['startX']) {
                    var bk = new Block(config['boarderColor'], false);
                    bk.isActive = false;
                    bk.x = i;
                    bk.cordY = j * gemWidth;
                    matrix[i][j] = bk;
                }
            }
        }
        return matrix;
    }

    document.onkeydown = function(event) {
        if (game.activeLink != 0 && game.activeLink.canMove() != 0) {
            if (!event)
                event = window.event;
            var code = event.keyCode;
            if (event.charCode && code == 0)
                code = event.charCode;
            switch (code) {
                case 37:
                    game.activeLink.moveLeft();
                    break;
                case 38:
                    game.activeLink.drop();
                    break;
                case 39:
                    game.activeLink.moveRight();
                    break;
                case 40:
                    game.activeLink.changePosition();
                    break;
            }
            event.preventDefault();
        }
    }

    function haveFun() {
        gameTime += config['refreshSpeed'];
        if (Math.floor(gameTime/3000) == 1) {
            gameTime = 0;
            dspeed += 1;
        }
        drawBoard(game);
        if (!game.pause && game.isGameOver() == 0) {
            if (game.activeLink != 0 && game.activeLink.isAlive() == true) {
                game.activeLink.fall();
                return;
            }
            if (game.activeLink != 0 && game.collapsing == false) {
                var bomb = 0;

                if (game.activeLink.blockOne.isBomb) {
                    bomb = game.activeLink.blockOne;
                }
                if (game.activeLink.blockTwo.isBomb) {
                    bomb = game.activeLink.blockTwo;
                }

                if (bomb != 0) {
                    bomb.explode();
                    game.secondBoard = game.board;
                    for (var i = 0; i < game.width; i++) {
                        for (var j = 2; j < game.height; j++) {
                            if (game.secondBoard[i][j] != 0) {
                                game.secondBoard[i][j].isActive = true;
                            }
                        }
                    }

                    game.board = startingBoard(config['gridLength'], config['gridHeight']);
                    game.collapsing = true;
                    game.activeLink = 0;
                    return;
                } else {
                    game.nextLink();
                    return;
                }
            }
            if (game.activeLink == 0 && game.collapsing == true) {
                game.collapse();
                return;
            } else {
                game.nextLink();
                return;
            }
        } else {
            return;
        }
    }

    function init(gameClass) {
        game = new gameClass(config['gridLength'], config['gridHeight']);
        game.nextLink();
        setInterval(haveFun, config['refreshSpeed']);
    }

    init(twoBlockGame);
});
