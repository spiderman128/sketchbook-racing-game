import { io } from "socket.io-client";
import { World } from "./World";
import * as $ from "jquery";
import {
  ARRIVE_REQUEST,
  ARRIVE_RESPONSE,
  CREATE_ROOM_REQUEST,
  CREATE_ROOM_SUCCESS,
  GAME_DATA_REQUEST,
  GAME_DATA_RESPONSE,
  GET_ROOM_LIST_REQUEST,
  JOIN_ROOM_REQUEST,
  JOIN_ROOM_RESPONSE,
  OUT_OF_ROOM_REQUEST,
  OUT_OF_ROOM_RESPONSE,
  PLAYER_IDS_RESPONSE,
  PLAYER_ID_RESPONSE,
  ROOM_CLOSED_RESPONSE,
  ROOM_LIST_RESPONSE,
  START_GAME_REQUEST,
  START_GAME_RESPONSE,
  WINNER_LIST_RESPONSE,
} from "./../constant";
import Swal from "sweetalert2";

export class SocketClient {
  static instance;

  public socket: any;
  public world: World;

  static getInstance(world: World) {
    if (SocketClient.instance) {
      return SocketClient.instance;
    }
    SocketClient.instance = new SocketClient(world);
    return SocketClient.instance;
  }

  constructor(world: World) {
    this.socket = io("http://localhost:3000");
    this.world = world;

    // Connected
    this.socket.on("connect", () => {
      console.log("Connected to socket server successfully.");
    });

    // Disconnected
    this.socket.on("disconnect", () => {
      console.log("Disconnected from socket server.");
      this.world.playerId = null;
      this.world.playerList = [];
      this.world.roomList = [];
      this.world.roomId = null;
    });

    // Get player id from socket server
    this.socket.on(PLAYER_ID_RESPONSE, (playerId: string) => {
      console.log("My socket id :", playerId);
      this.world.playerId = playerId;
    });

    // Create room response
    this.socket.on(CREATE_ROOM_SUCCESS, (roomId: string) => {
      console.log("Room created successfully: ", roomId);

      // Update roomId and playerList
      this.world.roomId = roomId;
      this.world.playerList = [
        {
          id: this.world.playerId,
          gameData: {},
          spawnId: 0,
        },
      ];

      // Show create UI
      this.world.showMultiUI(true);
    });

    // Get room list
    this.socket.on(ROOM_LIST_RESPONSE, (roomList: Array<any>) => {
      console.log("Get room list : ", roomList);
      this.world.roomList = roomList;
      if (this.world.UIcontrollers.roomSelect) {
        // Remove old UI
        this.world.scenarioGUIFolder.remove(
          this.world.UIcontrollers.roomSelect
        );
        this.world.scenarioGUIFolder.remove(this.world.UIcontrollers.joinRoom);

        // Update UI
        this.world.UIcontrollers.roomSelect = this.world.scenarioGUIFolder.add(
          this.world.params,
          "Room_Select",
          roomList
        );
        this.world.UIcontrollers.joinRoom = this.world.scenarioGUIFolder.add(
          this.world.params,
          "Join_Room"
        );
        this.world.scenarioGUIFolder.updateDisplay();
      }
    });

    // Get join room response
    this.socket.on(JOIN_ROOM_RESPONSE, (success: boolean) => {
      if (success) {
        this.world.UIcontrollers.playerNumber =
          this.world.scenarioGUIFolder.add(
            this.world.params,
            "Player_Number",
            1
          );
        this.world.scenarioGUIFolder.updateDisplay();
      } else {
        this.world.showMultiUI(false);
      }
    });

    // Get player ids in the room
    this.socket.on(PLAYER_IDS_RESPONSE, (playerIds: Array<any>) => {
      this.world.playerList = playerIds.map((item) => {
        return [
          {
            id: item,
            gameData: {},
            spawnId: 0,
          },
        ];
      });
      console.log("Player list updated: ", this.world.playerList);
      this.world.params.Player_Number = playerIds.length;
      this.world.scenarioGUIFolder.updateDisplay();
    });

    // Get start game reponse
    this.socket.on(START_GAME_RESPONSE, (playerIds: Array<any>) => {
      this.world.playerList = playerIds.map((item, index) => {
        if (item === this.world.playerId) this.world.spawnNumber = index;
        return {
          id: item,
          gameData: {},
          spawnId: index,
        };
      });

      this.world.startGame();
    });

    // Get game data
    this.socket.on(GAME_DATA_RESPONSE, (data) => {
      let vehicle = this.world.vehicles.find(
        (item) => item.playerId === data.playerId
      );
      if (vehicle) {
        let body = vehicle.rayCastVehicle.chassisBody;
        body.position.copy(data.position);
        body.interpolatedPosition.copy(data.interpolatedPosition);
        body.quaternion.copy(data.quaternion);
        body.interpolatedQuaternion.copy(data.interpolatedQuaternion);
        body.velocity.copy(data.velocity);
        body.angularVelocity.copy(data.angularVelocity);
      }
    });

    // Out user response
    this.socket.on(OUT_OF_ROOM_RESPONSE, (playerId) => {
      const outIndex = this.world.playerList.findIndex(
        (item) => item.id === playerId
      );
      this.world.playerList.splice(outIndex, 1);
      const vehicle = this.world.vehicles.find(
        (item) => item.playerId === playerId
      );
      if (this.world.gameStatus && vehicle) {
        this.world.remove(vehicle);
      }
    });

    // Get room closed response
    this.socket.on(ROOM_CLOSED_RESPONSE, () => {
      this.world.closeGame();
    });

    // Get arrived list
    this.socket.on(WINNER_LIST_RESPONSE, (data) => {
      $("#rank").html(
        "WinnerList: <br/><br/>" +
          data.map((item, index) => {
            const num = index+1;
            return "<p>" + num + ":" + item + "</p>"
          }).join("")
      );
    });

    // Get score
    this.socket.on(ARRIVE_RESPONSE, (data) => {
      let word;

      if (data === 1) word = "st";
      else if (data === 2) word = "nd";
      else if (data === 3) word = "rd";
      else word = "th";
      Swal.fire({
        icon: "success",
        title: "Complete game",
        text: "You take " + data + word + " place",
        buttonsStyling: false,
      });
    });
  }

  public getRoomList(): void {
    this.socket.emit(GET_ROOM_LIST_REQUEST);
  }

  public createRoom(): void {
    this.socket.emit(CREATE_ROOM_REQUEST);
  }

  public joinRoom(roomId: string): void {
    this.socket.emit(JOIN_ROOM_REQUEST, roomId);

    this.world.clearMultiUI();
  }

  public startGame(): void {
    this.socket.emit(START_GAME_REQUEST);
  }

  public outRoom(): void {
    this.socket.emit(OUT_OF_ROOM_REQUEST);
    window.location.href = "/";
  }

  public sendGameData(data: CANNON.Body): void {
    this.socket.emit(GAME_DATA_REQUEST, {
      position: data.position,
      interpolatedPosition: data.interpolatedPosition,
      quaternion: data.quaternion,
      interpolatedQuaternion: data.interpolatedQuaternion,
      velocity: data.velocity,
      angularVelocity: data.angularVelocity,
    });
  }

  public sendArrive(): void {
    this.socket.emit(ARRIVE_REQUEST);
  }
}
