const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { roomId, kickOpenId } = event
  const wxContext = cloud.getWXContext()

  // 1. 查询房间
  const roomRes = await db.collection('rooms').where({ roomId }).get()
  if (roomRes.data.length === 0) {
    return { success: false, msg: "房间不存在" }
  }
  const room = roomRes.data[0]

  // 2. 权限校验：仅房主可踢人
  if (room.ownerOpenId !== wxContext.OPENID) {
    return { success: false, msg: "仅房主可执行踢人操作" }
  }

  // 3. 不能踢自己
  if (kickOpenId === wxContext.OPENID) {
    return { success: false, msg: "不能踢自己" }
  }

  // 4. 移除玩家
  const newPlayers = room.players.filter(p => p.openId !== kickOpenId)
  await db.collection('rooms').doc(room._id).update({
    data: {
      players: newPlayers,
      updateTime: db.serverDate()
    }
  })

  return { success: true }
}