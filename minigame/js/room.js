import config from "./config.js";
import cloud from "./cloud.js";
import player from "./player.js";
import utils from "./utils.js";

/**
 * 房间管理模块
 * 房间创建、加入、退出、准备、踢人、转让房主等
 */
class RoomManager {
  constructor() {
    this.roomData = null; // 当前房间完整数据
  }

  // 创建房间
  async createRoom(roomConfig = {}) {
    if (!player.userInfo) await player.init();
    
    const defaultConfig = {
      name: `${player.userInfo.nickName}的房间`,
      password: "",
      maxPlayers: config.room.defaultMaxPlayers,
      mode: config.room.defaultMode,
      undercoverCount: "auto",
      allowJoinMidGame: config.room.allowJoinMidGame
    };

    const res = await cloud.callFunction("createRoom", {
      userInfo: player.userInfo,
      roomConfig: { ...defaultConfig, ...roomConfig }
    });

    if (res.success) {
      this.roomData = res.roomData;
      player.currentRoomId = res.roomId;
      player.isOwner = true;
      // 开启房间实时监听
      cloud.watchRoom(res.roomId, (roomData) => {
        this.roomData = roomData;
        player.updateFromRoomData(roomData);
      });
    }
    return res;
  }

  // 加入房间
  async joinRoom(roomId, password = "") {
    if (!player.userInfo) await player.init();
    
    const res = await cloud.callFunction("joinRoom", {
      roomId,
      password,
      userInfo: player.userInfo
    });

    if (res.success) {
      this.roomData = res.roomData;
      player.currentRoomId = roomId;
      player.updateFromRoomData(res.roomData);
      // 开启房间实时监听
      cloud.watchRoom(roomId, (roomData) => {
        this.roomData = roomData;
        player.updateFromRoomData(roomData);
      });
    }
    return res;
  }

  // 玩家准备/取消准备
  async toggleReady() {
    if (!player.currentRoomId) return { success: false, msg: "不在房间内" };
    
    const res = await cloud.callFunction("readyGame", {
      roomId: player.currentRoomId,
      openId: player.openId,
      isReady: !player.isReady
    });
    return res;
  }

  // 房主开始游戏
  async startGame() {
    if (!player.isOwner) return { success: false, msg: "你不是房主" };
    if (this.roomData.players.length < 4) return { success: false, msg: "最少4人才能开始游戏" };
    
    const res = await cloud.callFunction("startGame", {
      roomId: player.currentRoomId,
      playerCount: this.roomData.players.length
    });
    return res;
  }

  // 房主踢人
  async kickPlayer(openId) {
    if (!player.isOwner) return { success: false, msg: "你不是房主" };
    const res = await cloud.callFunction("kickPlayer", {
      roomId: player.currentRoomId,
      kickOpenId: openId
    });
    return res;
  }

  // 再来一局
  async againGame() {
    if (!player.isOwner) return { success: false, msg: "你不是房主" };
    const res = await cloud.callFunction("againGame", {
      roomId: player.currentRoomId
    });
    return res;
  }

  // 退出房间
  async exitRoom() {
    if (player.currentRoomId) {
      await cloud.callFunction("exitRoom", {
        roomId: player.currentRoomId,
        openId: player.openId
      });
    }
    player.exitRoom();
    this.roomData = null;
  }
}

// 单例导出
export default new RoomManager();