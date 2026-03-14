const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 生成6位随机房间号
function generateRoomId() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

exports.main = async (event, context) => {
  const { userInfo, roomConfig } = event
  const wxContext = cloud.getWXContext()
  const openId = wxContext.OPENID

  // 生成唯一房间号（避免重复）
  let roomId = generateRoomId()
  let existRoom = await db.collection('rooms').where({ roomId }).get()
  while (existRoom.data.length > 0) {
    roomId = generateRoomId()
    existRoom = await db.collection('rooms').where({ roomId }).get()
  }

  // 房间数据
  const roomData = {
    roomId,
    name: roomConfig.name || `${userInfo.nickName}的房间`,
    password: roomConfig.password || '',
    maxPlayers: roomConfig.maxPlayers || 8,
    mode: roomConfig.mode || 'classic',
    undercoverCount: roomConfig.undercoverCount || 'auto',
    allowJoinMidGame: roomConfig.allowJoinMidGame || false,
    ownerOpenId: openId,
    status: 'waiting', // waiting/playing/ended
    gamePhase: 'waiting',
    players: [{
      openId: openId,
      nickName: userInfo.nickName,
      avatarUrl: userInfo.avatarUrl,
      isReady: false,
      isAlive: true,
      role: '',
      word: '',
      descHistory: [] // 每轮的描述记录
    }],
    currentWordPair: [],
    currentRound: 1,
    speakOrder: [],
    createTime: db.serverDate(),
    updateTime: db.serverDate()
  }

  // 写入数据库
  const res = await db.collection('rooms').add({ data: roomData })
  return { 
    success: true, 
    roomId, 
    roomData: { ...roomData, _id: res._id } 
  }
}