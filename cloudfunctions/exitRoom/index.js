const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { roomId, openId } = event

  // 1. 查询房间
  const roomRes = await db.collection('rooms').where({ roomId }).get()
  if (roomRes.data.length === 0) {
    return { success: true, msg: "房间不存在" }
  }
  const room = roomRes.data[0]

  // 2. 过滤退出的玩家
  let newPlayers = room.players.filter(p => p.openId !== openId)
  let newOwnerOpenId = room.ownerOpenId

  // 3. 房主退出，自动转让房主
  if (room.ownerOpenId === openId && newPlayers.length > 0) {
    newOwnerOpenId = newPlayers[0].openId // 转让给第一个玩家
  }

  // 4. 房间无人，直接解散房间
  if (newPlayers.length === 0) {
    await db.collection('rooms').doc(room._id).remove()
    return { success: true, roomDismissed: true }
  }

  // 5. 更新房间数据
  await db.collection('rooms').doc(room._id).update({
    data: {
      players: newPlayers,
      ownerOpenId: newOwnerOpenId,
      updateTime: db.serverDate()
    }
  })

  return { success: true }
}