const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { roomId, openId, round, desc } = event

  // 1. 查询房间
  const roomRes = await db.collection('rooms').where({ roomId }).get()
  if (roomRes.data.length === 0) {
    return { success: false, msg: "房间不存在" }
  }
  const room = roomRes.data[0]

  // 2. 校验游戏阶段
  if (room.gamePhase !== 'speaking') {
    return { success: false, msg: "当前不是发言阶段" }
  }

  // 3. 校验是否是当前发言人
  const currentSpeakerOpenId = room.speakOrder[room.currentSpeakerIndex]
  if (currentSpeakerOpenId !== openId) {
    return { success: false, msg: "还没到你的发言轮次" }
  }

  // 4. 记录玩家描述
  const newPlayers = room.players.map(p => {
    if (p.openId === openId) {
      const newDescHistory = [...p.descHistory]
      newDescHistory[round - 1] = desc // 按轮次存储描述
      return { ...p, descHistory: newDescHistory }
    }
    return p
  })

  // 5. 更新数据库
  await db.collection('rooms').doc(room._id).update({
    data: {
      players: newPlayers,
      updateTime: db.serverDate()
    }
  })

  return { success: true }
}