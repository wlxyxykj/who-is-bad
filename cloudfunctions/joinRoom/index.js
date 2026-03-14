// 云函数：joinRoom 加入房间（最终加固版）
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const roomId = event.roomId;
  const password = event.password || "";
  
  // 获取当前用户的openid
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) {
    return { success: false, msg: "获取用户信息失败" };
  }

  try {
    // 1. 【核心】查询房间是否存在（用where查询，避免doc.get查不到直接报错）
    const checkRes = await db.collection('rooms').where({
      _id: roomId
    }).get();

    if (!checkRes.data || checkRes.data.length === 0) {
      return { success: false, msg: "房间不存在，请检查房间号" };
    }
    const roomData = checkRes.data[0];

    // 2. 校验房间状态
    if (roomData.status !== "waiting") {
      return { success: false, msg: "房间已开始游戏或已结束，无法加入" };
    }

    // 3. 校验人数是否已满
    if (roomData.players.length >= roomData.maxPlayers) {
      return { success: false, msg: "房间人数已满" };
    }

    // 4. 校验密码（如果有密码）
    if (roomData.password && roomData.password !== password) {
      return { success: false, msg: "房间密码错误" };
    }

    // 5. 校验是否已经在房间里
    const isAlreadyIn = roomData.players.some(p => p.openId === OPENID);
    if (isAlreadyIn) {
      return { success: true, roomId: roomId, roomData: roomData };
    }

    // 6. 构造新玩家信息
    const newPlayer = {
      openId: OPENID,
      nickName: event.nickName || "玩家",
      avatarUrl: event.avatarUrl || "",
      isOwner: false,
      isReady: false,
      isAlive: true,
      role: "",
      word: "",
      speakDesc: "",
      hasVoted: false
    };

    // 7. 更新数据库，把新玩家加入房间
    await db.collection('rooms').doc(roomId).update({
      data: {
        players: _.push(newPlayer),
        updateTime: db.serverDate()
      }
    });

    // 8. 重新获取最新的房间数据返回给前端
    const finalRoomRes = await db.collection('rooms').doc(roomId).get();
    return {
      success: true,
      roomId: roomId,
      roomData: finalRoomRes.data
    };

  } catch (err) {
    console.error("加入房间报错：", err);
    return { success: false, msg: "加入房间失败：" + err.message };
  }
}