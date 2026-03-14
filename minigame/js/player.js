import cloud from "./cloud.js";

/**
 * 玩家数据管理
 */
class PlayerManager {
  constructor() {
    this.userInfo = null; // 微信用户信息
    this.openId = null;
    this.currentRoomId = null; // 当前所在房间号
    this.isOwner = false; // 是否是房主
    this.role = null; // 身份
    this.word = null; // 词语
    this.isAlive = true; // 是否存活
    this.isReady = false; // 是否准备
  }

  // 初始化玩家信息
  async init() {
    this.openId = await cloud.init();
    // 获取微信用户信息
    return new Promise((resolve) => {
      wx.getUserProfile({
        desc: "用于游戏内昵称和头像展示",
        success: (res) => {
          this.userInfo = res.userInfo;
          resolve(this.userInfo);
        },
        fail: () => {
          // 用户拒绝授权，使用默认信息
          this.userInfo = {
            nickName: "玩家" + Math.floor(Math.random() * 1000),
            avatarUrl: "images/avatar_default.png"
          };
          resolve(this.userInfo);
        }
      });
    });
  }

  // 从房间数据更新自己的状态
  updateFromRoomData(roomData) {
    const myData = roomData.players.find(p => p.openId === this.openId);
    if (myData) {
      this.isOwner = roomData.ownerOpenId === this.openId;
      this.role = myData.role;
      this.word = myData.word;
      this.isAlive = myData.isAlive;
      this.isReady = myData.isReady;
    }
  }

  // 重置玩家游戏状态
  resetGameState() {
    this.role = null;
    this.word = null;
    this.isAlive = true;
    this.isReady = false;
  }

  // 退出房间
  exitRoom() {
    cloud.closeRoomWatcher();
    this.currentRoomId = null;
    this.resetGameState();
    this.isOwner = false;
  }
}

// 单例导出
export default new PlayerManager();