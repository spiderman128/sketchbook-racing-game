const { Server } = require("socket.io");
const { v4 } = require("uuid");
const {
  RACING,
  INITIAL_STATE,
  CREATE_ROOM_REQUEST,
  CREATE_ROOM_SUCCESS,
  ROOM_LIST_RESPONSE,
  GET_ROOM_LIST_REQUEST,
  PLAYER_ID_RESPONSE,
  JOIN_ROOM_REQUEST,
  JOIN_ROOM_RESPONSE,
  START_GAME_REQUEST,
  GAME_DATA_REQUEST,
  DISCONNECT,
  OUT_OF_ROOM_REQUEST,
  ARRIVE_REQUEST,
  RESTART_GAME_REQUEST,
} = require("./car_racing/constant");
var uuid = v4;
const Player = require("./car_racing/Player");
const Room = require("./car_racing/Room");

class SocketServer {
  static instance;

  constructor(server) {
    this.io = null;
    this.roomlist = [];
    this.playerlist = [];
    this.playerCount = 0;
    this.roomCount = 0;
    this.createSocketServer(server);
  }

  static getInstance(server = null) {
    if (SocketServer.instance) {
      return SocketServer.instance;
    }
    SocketServer.instance = new SocketServer(server);
    return SocketServer.instance;
  }

  createSocketServer(server) {
    this.io = new Server(server, {
      cors: {
        origin: "http://localhost:8080",
      },
    });
    this.roomlist = [];
    this.playerlist = [];
    this.runSocketServer();
  }

  getSocketServer() {
    return this.io;
  }

  runSocketServer() {
    this.io.on("connection", (socket) => {
      var player = new Player(socket);
      this.connectUser(player);

      socket.on(CREATE_ROOM_REQUEST, () => {
        this.createRoom(player);
      });

      socket.on(GET_ROOM_LIST_REQUEST, () => {
        this.sendRoomListToOne(player);
      });

      socket.on(JOIN_ROOM_REQUEST, (roomId) => {
        var room = this.getRoom(roomId);

        if (!room || room.status === RACING) {
          socket.emit(JOIN_ROOM_RESPONSE, false);
        } else {
          room.joinUser(player);
        }
      });

      socket.on(START_GAME_REQUEST, () => {
        var room = this.getRoom(player.roomId);
        if (
          room &&
          room.admin.id === player.id &&
          room.status === INITIAL_STATE
        ) {
          room.startGame();
        } else {
          // Send error to this player
        }
      });

      socket.on(RESTART_GAME_REQUEST, () => {
        var room = this.getRoom(player.roomId);
        if (
          room &&
          room.admin.id === player.id &&
          room.status === INITIAL_STATE
        ) {
          room.restartGame();
        } else {
          // Send error to this player
        }
      });

      socket.on(GAME_DATA_REQUEST, (data) => {
        var room = this.getRoom(player.roomId);
        if (room) {
          room.sendGameData(player.id, data);
        } else {
          // Send error to this player
        }
      });

      socket.on(OUT_OF_ROOM_REQUEST, () => {
        var room = this.getRoom(player.roomId);
        if (room) {
          room.outUser(player);
        } else {
          // Send error to this player
        }
      });

      socket.on(ARRIVE_REQUEST, () => {
        var room = this.getRoom(player.roomId);
        if (room) {
          room.arrive(player);
        } else {
          // Send error to this player
        }
      });

      socket.on(DISCONNECT, () => {
        if (player.roomId) {
          var room = this.getRoom(player.roomId);
          if (room) {
            room.outUser(player);
          }
        }
        this.disconnectUser(player.id);
      });
    });
  }

  connectUser(player) {
    this.playerlist.push(player);
    player.socket.emit(PLAYER_ID_RESPONSE, player.id);
  }

  disconnectUser(playerId) {
    this.playerlist = this.playerlist.filter((item) => item.id !== playerId);
  }

  createRoom(player) {
    var room = new Room(player);
    player.roomId = room.id;
    this.roomlist.push(room);

    player.socket.emit(CREATE_ROOM_SUCCESS, room.id);
    this.sendRoomListToAll();
  }

  sendRoomListToOne(player) {
    player.socket.emit(ROOM_LIST_RESPONSE, this.getRoomList());
  }

  sendRoomListToAll() {
    this.io.emit(ROOM_LIST_RESPONSE, this.getRoomList());
  }

  getPlayer(playerId) {
    return this.playerlist.find((item) => item.id === playerId);
  }

  getRoom(roomId) {
    return this.roomlist.find((item) => item.id === roomId);
  }

  getPlayerList() {
    return this.playerlist.map((item) => item.id);
  }

  getRoomList() {
    return this.roomlist
      .filter((item) => item.status !== RACING)
      .map((item) => item.id);
  }
}

module.exports = SocketServer;
