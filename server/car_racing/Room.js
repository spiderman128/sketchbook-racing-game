const { v4 } = require("uuid");
const {
  INITIAL_STATE,
  RACING,
  JOIN_ROOM_RESPONSE,
  PLAYER_IDS_RESPONSE,
  OUT_OF_ROOM_RESPONSE,
  ROOM_CLOSED_RESPONSE,
  GAME_DATA_RESPONSE,
  START_GAME_RESPONSE,
  ARRIVE_RESPONSE,
  RESTART_GAME_RESPONSE,
  WINNER_LIST_RESPONSE,
} = require("./constant");
var uuid = v4;

let Room = class {
  constructor(admin) {
    this.socketServer = require("../socket").getInstance();
    this.socketServer.roomCount++;
    this.id = "Room" + this.socketServer.roomCount;
    this.playerList = [admin];
    this.admin = admin;
    this.status = INITIAL_STATE;
    this.winnerList = [];
    this.cnt = 0;
  }

  joinUser(player) {
    this.playerList.push(player);
    player.roomId = this.id;
    player.socket.emit(JOIN_ROOM_RESPONSE, true);
    this.broadcastAll(PLAYER_IDS_RESPONSE, this.getPlayerIds());
  }

  outUser(player) {
    const outIndex = this.playerList.findIndex(item => item.id === player.id);
    this.playerList.splice(outIndex, 1);
    this.broadcastAll(PLAYER_IDS_RESPONSE, this.getPlayerIds());
    this.broadcastOthers(player.id, OUT_OF_ROOM_RESPONSE, player.id);

    if (this.admin.id === player.id) {
      this.broadcastOthers(player.id, ROOM_CLOSED_RESPONSE);
      this.close();
      this.socketServer.sendRoomListToAll();
    }

    player.roomId = null;
  }

  sendGameData(playerId, data) {
    this.broadcastOthers(playerId, GAME_DATA_RESPONSE, {
      playerId: playerId,
      ...data,
    });
  }

  close() {
    for (var i = 0; i < this.socketServer.playerlist.length; i++) {
      let player = this.socketServer.playerlist[i];
      if (player.roomId === this.id) {
        player.roomId = null;
      }
    }

    this.socketServer.roomlist = this.socketServer.roomlist.filter(
      (item) => item.id !== this.id
    );
  }

  startGame() {
    this.status = RACING;
    this.broadcastAll(START_GAME_RESPONSE, this.getPlayerIds());
    this.socketServer.sendRoomListToAll();
    this.winnerList = [];
  }

  restartGame() {
    this.broadcastAll(RESTART_GAME_RESPONSE, this.getPlayerIds());
    this.winnerList = [];
  }

  arrive(player) {
    this.winnerList.push(player.id);
    player.socket.emit(ARRIVE_RESPONSE, this.winnerList.length);
    this.broadcastAll(WINNER_LIST_RESPONSE, this.winnerList);
  }

  getPlayerIds() {
    return this.playerList.map((item) => item.id);
  }

  broadcastAll(type, data = null) {
    for (var i = 0; i < this.playerList.length; i++) {
      this.playerList[i].socket.emit(type, data);
    }
  }

  broadcastOthers(playerId, type, data = null) {
    for (var i = 0; i < this.playerList.length; i++) {
      if (this.playerList[i].id !== playerId){
        this.playerList[i].socket.emit(type, data);
      }
    }
  }
};

module.exports = Room;
