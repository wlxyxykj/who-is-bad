const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 人数-身份配置表（严格匹配需求文档）
const ROLE_CONFIG = {
  4: { undercover: 1, civilian: 3, whiteboard: 0 },
  5: { undercover: 1, civilian: 4, whiteboard: 0 },
  6: { undercover: 1, civilian: 4, whiteboard: 1 },
  7: { undercover: 2, civilian: 5, whiteboard: 0 },
  8: { undercover: 2, civilian: 6, whiteboard: 0 },
  9: { undercover: 2, civilian: 7, whiteboard: 0 },
  10: { undercover: 3, civilian: 7, whiteboard: 0 },
  11: { undercover: 3, civilian: 8, whiteboard: 0 },
  12: { undercover: 3, civilian: 9, whiteboard: 0 }
}

// 洗牌算法
function shuffleArray(arr) {
  const newArr = [...arr]
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]]
  }
  return newArr
}

exports.main = async (event, context) => {
  const { roomId, playerCount } = event
  const wxContext = cloud.getWXContext()

  // 1. 查询房间
  const roomRes = await db.collection('rooms').where({ roomId }).get()
  if (roomRes.data.length === 0) {
    return { success: false, msg: "房间不存在" }
  }
  const room = roomRes.data[0]

  // 2. 权限校验：仅房主可开始游戏
  if (room.ownerOpenId !== wxContext.OPENID) {
    return { success: false, msg: "仅房主可开始游戏" }
  }

  // 3. 人数校验
  const validPlayers = room.players.filter(p => p.isReady || p.openId === room.ownerOpenId)
  if (validPlayers.length < 4) {
    return { success: false, msg: "最少4名玩家才能开始游戏" }
  }
  if (validPlayers.length > 12) {
    return { success: false, msg: "最多支持12名玩家" }
  }

  // 4. 随机抽取一组词语
  const wordsRes = await db.collection('words').aggregate().sample({ size: 1 }).end()
  if (wordsRes.list.length === 0) {
    return { success: false, msg: "词库为空，请先添加词语" }
  }
  const wordPair = wordsRes.list[0]
  const civilianWord = wordPair.word1
  const undercoverWord = wordPair.word2

  // 5. 计算身份数量
  const playerNum = validPlayers.length
  const roleNum = ROLE_CONFIG[playerNum]
  let { undercover, civilian, whiteboard } = roleNum

  // 6. 生成身份池
  let rolePool = []
  for (let i = 0; i < undercover; i++) rolePool.push('undercover')
  for (let i = 0; i < civilian; i++) rolePool.push('civilian')
  for (let i = 0; i < whiteboard; i++) rolePool.push('whiteboard')
  // 打乱身份池
  rolePool = shuffleArray(rolePool)

  // 7. 给玩家分配身份和词语
  const newPlayers = room.players.map((player, index) => {
    const role = rolePool[index]
    let word = ''
    if (role === 'civilian') word = civilianWord
    if (role === 'undercover') word = undercoverWord
    // 白板无词语
    return {
      ...player,
      role,
      word,
      isAlive: true,
      isReady: false,
      descHistory: []
    }
  })

  // 8. 生成初始发言顺序（随机打乱）
  const speakOrder = shuffleArray(newPlayers.filter(p => p.isAlive).map(p => p.openId))

  // 9. 更新房间状态
  await db.collection('rooms').doc(room._id).update({
    data: {
      status: 'playing',
      gamePhase: 'viewWord',
      currentRound: 1,
      players: newPlayers,
      currentWordPair: [civilianWord, undercoverWord],
      speakOrder,
      currentSpeakerIndex: 0,
      voteData: {},
      updateTime: db.serverDate()
    }
  })

  return { success: true }
}