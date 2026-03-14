// 云函数：readygame 切换玩家准备状态（修复版）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { roomId } = event;
  // 【修复1】从云函数上下文获取当前用户的OPENID，绝对安全，不用前端传
  const { OPENID } = cloud.getWXContext();

  // 前置参数校验
  if (!roomId || !OPENID) {
    return { success: false, msg: "参数错误，缺少房间号或用户信息" };
  }

  try {
    // 【修复2】查询房间时，用 _id 字段，不是 roomId！
    const roomRes = await db.collection('rooms').doc(roomId).get();
    if (!roomRes.data) {
      return { success: false, msg: "房间不存在" };
    }
    const roomData = roomRes.data;

    // 校验房间状态
    if (roomData.status !== 'waiting') {
      return { success: false, msg: "游戏已开始，无法修改准备状态" };
    }

    // 找到当前玩家在房间里的索引
    const playerIndex = roomData.players.findIndex(p => p.openId === OPENID);
    if (playerIndex === -1) {
      return { success: false, msg: "你不在这个房间里" };
    }

    // 【修复3】自动切换准备状态，不用前端传 isReady，更安全
    const currentReadyStatus = roomData.players[playerIndex].isReady;
    const newReadyStatus = !currentReadyStatus;
    const updateField = `players.${playerIndex}.isReady`;

    // 更新数据库（只更新单个玩家的状态，性能更好）
    await db.collection('rooms').doc(roomId).update({
      data: {
        [updateField]: newReadyStatus,
        updateTime: db.serverDate()
      }
    });

    console.log(`玩家${OPENID}切换准备状态：${currentReadyStatus} → ${newReadyStatus}`);
    return { success: true, isReady: newReadyStatus };

  } catch (err) {
    console.error("切换准备状态报错：", err);
    return { success: false, msg: "操作失败：" + err.message };
  }
}