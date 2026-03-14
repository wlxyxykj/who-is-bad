// 云函数：createRoom 创建房间（最终修复版）
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _ = db.command

// 生成6位数字房间号
function generateRoomId() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

exports.main = async (event, context) => {
  const roomName = event.name || "谁是卧底房间";
  const maxPlayers = event.maxPlayers || 8;
  const password = event.password || "";
  
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) {
    return { success: false, msg: "获取用户信息失败" };
  }

  try {
    // 生成唯一房间号
    let roomId = generateRoomId();
    let isRoomExist = true;
    
    while (isRoomExist) {
      const checkRes = await db.collection('rooms').where({
        _id: roomId
      }).count();
      
      if (checkRes.total === 0) {
        isRoomExist = false;
      } else {
        roomId = generateRoomId();
      }
    }

    // 房主的玩家信息
    const ownerPlayer = {
      openId: OPENID,
      nickName: event.nickName || "玩家",
      avatarUrl: event.avatarUrl || "",
      isOwner: true,
      isReady: false,
      isAlive: true,
      role: "",
      word: "",
      speakDesc: "",
      hasVoted: false
    };

    // 【核心修复】创建房间记录，data里不要包含 _id 字段
    const roomData = {
      name: roomName,
      ownerOpenId: OPENID,
      maxPlayers: maxPlayers,
      password: password,
      status: "waiting",
      players: [ownerPlayer],
      createTime: db.serverDate(),
      updateTime: db.serverDate(),
      currentRound: 0,
      currentWordPair: [],
      speakOrder: [],
      currentSpeakerIndex: 0,
      currentPhase: "",
      phaseEndTime: null
    };

    // 写入数据库，通过 doc(roomId) 指定文档ID
    await db.collection('rooms').doc(roomId).set({
      data: roomData
    });

    console.log("创建房间成功，房间号：", roomId);
    return {
      success: true,
      roomId: roomId,
      roomData: { ...roomData, _id: roomId } // 返回给前端时可以加上_id
    };

  } catch (err) {
    console.error("创建房间报错：", err);
    return { success: false, msg: "创建房间失败：" + err.message };
  }
}