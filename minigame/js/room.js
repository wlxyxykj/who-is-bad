// 房间数据管理
import cloud from "./cloud.js";
import player from "./player.js";
import ui from "./ui.js";
import gameCore from "./gameCore.js";

class RoomManager {
  constructor() {
    this.roomData = null;
    this.roomId = null;
    this.watcher = null; // 数据库实时监听
  }

  // 创建房间
  async createRoom(options = {}) {
    try {
      const res = await cloud.callFunction("createRoom", {
        name: options.name || `${player.userInfo.nickName}的房间`,
        maxPlayers: options.maxPlayers || 8,
        password: options.password || ""
      });

      if (res.success) {
        this.roomId = res.roomId;
        this.roomData = res.roomData;
        player.currentRoomId = this.roomId;
        player.isOwner = true;

        // 开启房间数据实时监听
        this.watchRoomData();
        return { success: true };
      } else {
        return { success: false, msg: res.msg || "创建房间失败" };
      }
    } catch (err) {
      console.error("创建房间报错：", err);
      return { success: false, msg: "创建房间失败" };
    }
  }

  // 加入房间
 // 加入房间（加固版）
async joinRoom(roomId, password = "") {
  try {
    console.log("🔵 开始加入房间，房间号：", roomId);
    const res = await cloud.callFunction("joinRoom", {
      roomId,
      password,
      nickName: player.userInfo?.nickName || "玩家",
      avatarUrl: player.userInfo?.avatarUrl || ""
    });

    console.log("🟢 joinRoom云函数返回结果：", res);
    if (res.success) {
      // 【强制赋值】确保roomId和roomData100%被写入
      this.roomId = roomId;
      this.roomData = res.roomData;
      player.currentRoomId = roomId;
      
      // 同步玩家信息
      player.updateFromRoomData(res.roomData);

      // 开启房间数据实时监听
      this.watchRoomData();

      console.log("✅ 加入房间成功，roomId已赋值：", this.roomId);
      return { success: true, roomId: this.roomId, roomData: this.roomData };
    } else {
      console.error("❌ 加入房间失败：", res.msg);
      return { success: false, msg: res.msg || "加入房间失败" };
    }
  } catch (err) {
    console.error("❌ 加入房间异常：", err);
    return { success: false, msg: "加入房间失败" };
  }
}
  // 【核心】实时监听房间数据变化，全量同步给前端
// 【核心】实时监听房间数据变化，全量同步
watchRoomData() {
  if (!this.roomId) {
    console.warn("⚠️ 房间监听失败，roomId为空");
    return;
  }

  // 先关闭之前的旧监听，避免重复监听
  this.closeRoomWatcher();

  const db = wx.cloud.database();
  this.watcher = db.collection('rooms').doc(this.roomId).watch({
    onChange: (snapshot) => {
      console.log("✅ 房间数据实时更新：", snapshot);
      if (snapshot.docs && snapshot.docs.length > 0) {
        // 更新全局房间数据
        this.roomData = snapshot.docs[0];
        
        // 同步玩家自己的信息
        player.updateFromRoomData(this.roomData);
        
        // 同步游戏核心逻辑
        gameCore.initGame(this.roomData);

        // 强制刷新UI
        ui.render();
      }
    },
    onError: (err) => {
      console.error("❌ 房间数据监听报错：", err);
    }
  });
}

  // 关闭房间监听
  closeRoomWatcher() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  // 退出房间
  async exitRoom() {
    if (!this.roomId) return;
    await cloud.callFunction("exitRoom", { roomId: this.roomId });
    
    // 清理数据
    this.closeRoomWatcher();
    this.roomData = null;
    this.roomId = null;
    player.exitRoom();
    ui.render();
  }

  // 切换准备状态
// 切换准备状态（修改版）
async toggleReady() {
  if (!this.roomId) {
    return { success: false, msg: "不在房间内" };
  }
  // 【关键】云函数名改成 readygame
  const res = await cloud.callFunction("readygame", { roomId: this.roomId });
  return res.result;
}

  // 开始游戏
  async startGame() {
    if (!this.roomId) return;
    const res = await cloud.callFunction("startGame", { roomId: this.roomId });
    return res;
  }

  // 更新房间数据（仅房主可用，比如更新阶段、倒计时）
  async updateRoomData(updateData) {
    if (!this.roomId || !player.isOwner) return;
    const res = await cloud.callFunction("updateRoom", {
      roomId: this.roomId,
      updateData: updateData
    });
    return res;
  }

  // 更新玩家自己的数据
  async updatePlayerData(updateData) {
    if (!this.roomId) return;
    const res = await cloud.callFunction("updatePlayer", {
      roomId: this.roomId,
      updateData: updateData
    });
    return res;
  }
}

// 单例导出
export default new RoomManager();