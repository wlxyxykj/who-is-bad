const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 胜负判定函数
function checkGameOver(players) {
  const alivePlayers = players.filter(p => p.isAlive)
  const aliveUndercover = alivePlayers.filter(p => p.role === 'undercover')
  const aliveWhiteboard = alivePlayers.filter(p => p.role === 'whiteboard')
  const aliveCivilian = alivePlayers.filter(p => p.role === 'civilian')

  // 1. 平民胜利：所有卧底被淘汰
  if (aliveUndercover.length === 0) {
    let winTeam = 'civilian'
    // 白板胜利条件：所有卧底出局且白板存活
    if (aliveWhiteboard.length > 0) {
      winTeam = 'whiteboard'
    }
    return {
      gameOver: true,
      winTeam,
      settlementData: { aliveUndercover, aliveCivilian, aliveWhiteboard }
    }
  }

  // 2. 卧底胜利：存活总人数≤3人，且卧底仍存活
  if (alivePlayers.length <= 3 && aliveUndercover.length > 0) {
    return {
      gameOver: true,
      winTeam: 'undercover',
      settlementData: { aliveUndercover, aliveCivilian, aliveWhiteboard }
    }
  }

  // 游戏未结束
  return { gameOver: false }
}

exports.main = async (event, context) => {
  const { roomId, round, voteData } = event

  // 1. 查询房间
  const roomRes = await db.collection('rooms').where({ roomId }).get()
  if (roomRes.data.length === 0) {
    return { success: false, msg: "房间不存在" }
  }
  const room = roomRes.data[0]

  // 2. 校验游戏阶段
  if (room.gamePhase !== 'voting') {
    return { success: false, msg: "当前不是投票阶段" }
  }

  // 3. 合并投票数据（防止重复投票）
  const finalVoteData = { ...room.voteData, ...voteData }

  // 4. 计票逻辑
  const voteCount = {}
  Object.values(finalVoteData).forEach(targetId => {
    if (targetId === 'abstain') return // 弃权不计票
    voteCount[targetId] = (voteCount[targetId] || 0) + 1
  })

  // 5. 处理投票结果
  let eliminatedOpenId = null
  const voteEntries = Object.entries(voteCount)

  if (voteEntries.length > 0) {
    // 排序得票
    voteEntries.sort((a, b) => b[1] - a[1])
    const maxVote = voteEntries[0][1]
    const topPlayers = voteEntries.filter(item => item[1] === maxVote)

    // 平局处理：平票进入PK，这里先按需求的PK规则处理
    if (topPlayers.length > 1) {
      // 平票无人出局，直接进入下一轮
      eliminatedOpenId = null
    } else {
      // 得票最高者出局
      eliminatedOpenId = topPlayers[0][0]
    }
  }

  // 6. 更新玩家存活状态
  let newPlayers = room.players
  if (eliminatedOpenId) {
    newPlayers = room.players.map(p => {
      if (p.openId === eliminatedOpenId) {
        return { ...p, isAlive: false }
      }
      return p
    })
  }

  // 7. 胜负判定
  const gameResult = checkGameOver(newPlayers)

  // 8. 更新房间状态
  let updateData = {
    players: newPlayers,
    voteData: finalVoteData,
    updateTime: db.serverDate()
  }

  if (gameResult.gameOver) {
    // 游戏结束
    updateData.status = 'ended'
    updateData.gamePhase = 'settlement'
    updateData.settlementData = gameResult
  } else {
    // 游戏继续，更新轮次和发言顺序
    const newSpeakOrder = newPlayers.filter(p => p.isAlive).map(p => p.openId)
    updateData.gamePhase = 'speaking'
    updateData.currentRound = round + 1
    updateData.speakOrder = newSpeakOrder
    updateData.currentSpeakerIndex = 0
  }

  await db.collection('rooms').doc(room._id).update({ data: updateData })

  return { 
    success: true, 
    eliminatedOpenId,
    gameOver: gameResult.gameOver,
    winTeam: gameResult.winTeam,
    settlementData: gameResult.settlementData
  }
}