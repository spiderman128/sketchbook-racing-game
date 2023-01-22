const { v4 } = require("uuid");

var uuid = v4;

let Player = class {
    constructor(socket) {
        this.socketServer = require("../socket").getInstance();
        this.socketServer.playerCount++;
        this.id = "Player" + this.socketServer.playerCount;
        this.roomId = null;
        this.socket = socket;
        this.gameData = {}
    }
}

module.exports = Player;