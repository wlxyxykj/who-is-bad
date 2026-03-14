import config from "./config.js";

/**
 * 云开发封装
 * 统一管理云函数调用、数据库操作、实时监听
 */
class CloudManager {
  constructor() {
    this.db = null;
    this._ = null;
    this.roomWatcher = null; // 房间实时监听器
    this.openId = null; // 当前玩家openid
  }

  // 初始化云开发
  async init() {
    if (this.db) return;
    wx.cloud.init({
      env: config.envId,
      traceUser: true
    });
    this.db = wx.cloud.database();
    this._ = this.db.command;
    
    // 获取当前用户openid
    const res = await wx.cloud.callFunction({
      name: "getOpenId"
    });
    this.openId = res.result.openId;
    return this.openId;
  }

  // 调用云函数通用方法
  async callFunction(name, data = {}) {
    try {
      const res = await wx.cloud.callFunction({
        name,
        data
      });
      return res.result;
    } catch (err) {
      console.error(`云函数[${name}]调用失败`, err);
      wx.showToast({ title: "网络错误，请重试", icon: "none" });
      return { success: false, error: err };
    }
  }

  // 监听房间实时数据变化（核心联网功能）
  watchRoom(roomId, onChange) {
    // 先关闭之前的监听
    this.closeRoomWatcher();
    
    this.roomWatcher = this.db.collection("rooms")
      .where({ roomId })
      .watch({
        onChange: (snapshot) => {
          if (snapshot.docs.length > 0) {
            const roomData = snapshot.docs[0];
            onChange?.(roomData);
          }
        },
        onError: (err) => {
          console.error("房间监听失败", err);
        }
      });
  }

  // 关闭房间监听
  closeRoomWatcher() {
    if (this.roomWatcher) {
      this.roomWatcher.close();
      this.roomWatcher = null;
    }
  }

  // 获取词库数据
  async getWords(category = null, difficulty = null) {
    let query = this.db.collection("words");
    if (category) query = query.where({ category });
    if (difficulty) query = query.where({ difficulty });
    const res = await query.get();
    return res.data;
  }
}

// 单例导出
export default new CloudManager();