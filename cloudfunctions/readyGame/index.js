const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { roomId, openId, isReady } = event

  // 查询房间
  const roomRes = await db.collection('rooms').where({ roomId }).get()
  if (roomRes.data.length === 0) {
    return { success: false, msg: "房间不存在" }
  }

  const room = roomRes.data[0]
  if (room.status !== 'waiting') {
    return { success: false, msg: "游戏已开始，无法修改准备状态" }
  }

  // 更新玩家准备状态
  const newPlayers = room.players.map(p => {
    if (p.openId === openId) {
      return { ...p, isReady }
    }
    return p
  })

  await db.collection('rooms').doc(room._id).update({
    data: {
      players: newPlayers,
      updateTime: db.serverDate()
    }
  })

  return { success: true }
}