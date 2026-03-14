// 云函数：startGame 开局游戏
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { roomId } = event
  if (!roomId) {
    return { success: false, msg: "房间号不能为空" }
  }

  try {
    // 1. 查询房间信息
    const roomRes = await db.collection('rooms').doc(roomId).get()
    if (!roomRes.data) {
      return { success: false, msg: "房间不存在" }
    }
    const roomData = roomRes.data

    // 2. 校验房主权限
    const { OPENID } = cloud.getWXContext()
    if (roomData.ownerOpenId !== OPENID) {
      return { success: false, msg: "只有房主可以开始游戏" }
    }

    // 3. 校验玩家数量
    const players = roomData.players
    if (players.length < 2) {
      return { success: false, msg: "至少需要2名玩家才能开始游戏" }
    }

    // 4. 【核心修复】从词库随机选词，严格匹配字段名
    const wordRes = await db.collection('words').where({
      isEnabled: _.neq(false) // 只取启用的词
    }).get()
    const wordList = wordRes.data
    if (wordList.length === 0) {
      return { success: false, msg: "词库为空，请先在数据库添加词库" }
    }
    // 随机选一组词
    const randomWord = wordList[Math.floor(Math.random() * wordList.length)]
    const civilianWord = randomWord.civilian
    const undercoverWord = randomWord.undercover
    console.log("选中的词对：", { civilianWord, undercoverWord })

    // 5. 分配身份和词语
    const playerCount = players.length
    // 卧底数量规则：4-6人1个卧底，7-9人2个，10人+3个，白板1个
    let undercoverCount = 1
    if (playerCount >= 7 && playerCount <= 9) undercoverCount = 2
    if (playerCount >= 10) undercoverCount = 3
    const whiteboardCount = 1 // 白板数量，可根据需求调整

    // 生成身份数组
    let roles = []
    // 先加平民
    for (let i = 0; i < playerCount - undercoverCount - whiteboardCount; i++) {
      roles.push("CIVILIAN")
    }
    // 加卧底
    for (let i = 0; i < undercoverCount; i++) {
      roles.push("UNDERCOVER")
    }
    // 加白板
    for (let i = 0; i < whiteboardCount; i++) {
      roles.push("WHITEBOARD")
    }

    // 打乱身份顺序
    roles = roles.sort(() => Math.random() - 0.5)

    // 给每个玩家分配身份、词语、重置状态
    const newPlayers = players.map((player, index) => {
      const role = roles[index]
      let word = ""
      if (role === "CIVILIAN") word = civilianWord
      if (role === "UNDERCOVER") word = undercoverWord
      // 白板没有词语
      return {
        ...player,
        role: role,
        word: word,
        isAlive: true,
        isReady: false,
        speakDesc: "",
        hasVoted: false
      }
    })

    // 生成发言顺序
    const speakOrder = newPlayers.map(p => p.openId).sort(() => Math.random() - 0.5)

    // 6. 更新房间数据到数据库
    await db.collection('rooms').doc(roomId).update({
      data: {
        status: "playing", // 房间状态改为游戏中
        currentRound: 1,
        currentWordPair: [civilianWord, undercoverWord], // 保存词对
        players: newPlayers,
        speakOrder: speakOrder,
        currentSpeakerIndex: 0,
        currentPhase: "VIEW_WORD", // 初始阶段：查看词语
        gameStartTime: db.serverDate(),
        // 倒计时相关
        phaseEndTime: db.serverDate({
          offset: 10 * 1000 // 看词阶段给10秒
        })
      }
    })

    return {
      success: true,
      msg: "游戏开始成功",
      data: {
        currentWordPair: [civilianWord, undercoverWord],
        players: newPlayers
      }
    }

  } catch (err) {
    console.error("startGame云函数报错:", err)
    return { success: false, msg: "开始游戏失败：" + err.message }
  }
}