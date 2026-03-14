const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { roomId } = event
  const wxContext = cloud.getWXContext()

  // 1. 查询房间
  const roomRes = await db.collection('rooms').where({ roomId }).get()
  if (roomRes.data.length === 0) {
    return { success: false, msg: "房间不存在" }
  }
  const room = roomRes.data[0]

  // 2. 权限校验：仅房主可重置房间
  if (room.ownerOpenId !== wxContext.OPENID) {
    return { success: false, msg: "仅房主可开启再来一局" }
  }

  // 3. 重置所有玩家的游戏状态
  const newPlayers = room.players.map(p => {
    return {
      ...p,
      role: '',
      word: '',
      isAlive: true,
      isReady: false,
      descHistory: []
    }
  })

  // 4. 重置房间状态
  await db.collection('rooms').doc(room._id).update({
    data: {
      status: 'waiting',
      gamePhase: 'waiting',
      currentRound: 1,
      players: newPlayers,
      currentWordPair: [],
      speakOrder: [],
      currentSpeakerIndex: 0,
      voteData: {},
      settlementData: null,
      updateTime: db.serverDate()
    }
  })

  return { success: true }
}