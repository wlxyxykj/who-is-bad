const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { roomId, password, userInfo } = event
  const wxContext = cloud.getWXContext()
  const openId = wxContext.OPENID

  // 查询房间
  const roomRes = await db.collection('rooms').where({ roomId }).get()
  if (roomRes.data.length === 0) {
    return { success: false, msg: "房间不存在" }
  }

  const room = roomRes.data[0]

  // 检查房间状态
  if (room.status === 'playing' && !room.allowJoinMidGame) {
    return { success: false, msg: "游戏已开始，无法加入" }
  }

  // 检查密码
  if (room.password && room.password !== password) {
    return { success: false, msg: "房间密码错误" }
  }

  // 检查人数
  if (room.players.length >= room.maxPlayers) {
    return { success: false, msg: "房间人数已满" }
  }

  // 检查是否已经在房间里
  const isInRoom = room.players.some(p => p.openId === openId)
  if (isInRoom) {
    return { success: true, roomData: room }
  }

  // 加入房间
  const newPlayer = {
    openId: openId,
    nickName: userInfo.nickName,
    avatarUrl: userInfo.avatarUrl,
    isReady: false,
    isAlive: true,
    role: '',
    word: '',
    descHistory: []
  }

  await db.collection('rooms').doc(room._id).update({
    data: {
      players: _.push(newPlayer),
      updateTime: db.serverDate()
    }
  })

  // 返回更新后的房间数据
  const newRoomRes = await db.collection('rooms').doc(room._id).get()
  return { success: true, roomData: newRoomRes.data }
}