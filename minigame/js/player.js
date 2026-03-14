
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

  // 初始化玩家信息（极简版，不调用任何用户信息API）
  async init() {
    try {
      // 1. 先尝试获取 openId
      try {
        this.openId = await cloud.init();
        console.log("获取openId成功：", this.openId);
      } catch (e) {
        console.log("获取openId失败，使用临时ID：", e);
        // 临时生成一个openId用于测试
        this.openId = "temp_openid_" + Math.random().toString(36).substr(2, 9);
      }

      // 2. 直接设置默认用户信息，不调用任何API
      this._setDefaultUserInfo();
      
      console.log("玩家初始化完成：", this.userInfo, this.openId);
      return this.userInfo;
    } catch (e) {
      console.error("玩家初始化失败：", e);
      this._setDefaultUserInfo();
      return this.userInfo;
    }
  }

  // 内部方法：设置默认用户信息
  _setDefaultUserInfo() {
    this.userInfo = {
      nickName: "玩家" + Math.floor(Math.random() * 10000),
      avatarUrl: ""
    };
    console.log("使用默认用户信息：", this.userInfo);
  }

  // 从房间数据更新自己的状态
 // 从房间数据更新自己的状态
// 从房间数据里，更新当前玩家自己的信息（必须和roomData里的字段完全匹配）
updateFromRoomData(roomData) {
  // 前置容错
  if (!roomData || !roomData.players || !this.openId) {
    console.warn("⚠️ 玩家信息同步失败，参数不全");
    return;
  }

  // 从房间玩家列表里，找到当前玩家自己的信息
  const myInfo = roomData.players.find(p => p.openId === this.openId);
  if (!myInfo) {
    console.warn("⚠️ 未在房间里找到当前玩家");
    return;
  }

  // 【核心】同步身份和状态，直接决定按钮的显示和逻辑
  this.isOwner = myInfo.isOwner || false; // 是不是房主
  this.isReady = myInfo.isReady || false; // 准备状态
  this.isAlive = myInfo.isAlive || true; // 存活状态
  this.role = myInfo.role || ""; // 游戏身份
  this.word = myInfo.word || ""; // 词语
  this.speakDesc = myInfo.speakDesc || ""; // 发言描述

  console.log("✅ 玩家信息同步完成", { isOwner: this.isOwner, isReady: this.isReady });
}
}
// 单例导出
export default new PlayerManager();