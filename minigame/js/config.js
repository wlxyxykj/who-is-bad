/**
 * 谁是卧底 全局配置文件
 * 严格匹配需求文档的所有参数
 */
export default {
  // 云开发环境ID，替换成你自己的！
  envId: "cloud1-6gpaxpo995b92a8f",
  
  // 画布尺寸（适配微信小游戏，固定竖屏尺寸）
  canvasWidth: 375,
  canvasHeight: 667,

  // 房间基础配置
  room: {
    nameMaxLength: 20,
    passwordLength: [4,6],
    playerLimit: [4,12],
    defaultMaxPlayers: 8,
    ownerTransferTime: 20, // 房主未准备自动转让时间（秒）
    defaultMode: "classic", // 经典模式
    allowJoinMidGame: false // 默认不允许中途加入
  },

  // 人数-卧底数量配置表（严格匹配需求）
  roleConfig: {
    4: { undercover: 1, civilian: 3, whiteboard: 0 },
    5: { undercover: 1, civilian: 4, whiteboard: 0 },
    6: { undercover: 1, civilian: 5, whiteboard: 1 },
    7: { undercover: 2, civilian: 5, whiteboard: 0 },
    8: { undercover: 2, civilian: 6, whiteboard: 0 },
    9: { undercover: 2, civilian: 7, whiteboard: 0 },
    10: { undercover: 3, civilian: 7, whiteboard: 0 },
    11: { undercover: 3, civilian: 8, whiteboard: 0 },
    12: { undercover: 3, civilian: 9, whiteboard: 0 }
  },

  // 游戏时间参数（严格匹配需求）
  timeConfig: {
    viewWord: 15, // 查看词语时间（秒）
    speakPerPlayer: 60, // 每人发言时间（秒）
    vote: 30, // 投票时间（秒）
    roundInterval: 5, // 轮次间隔（秒）
    readyCountDown: 20 // 准备倒计时（秒）
  },

  // 游戏规则配置
  rule: {
    speakOrder: "random", // 随机开始发言
    voteShow: "public", // 票型公开
    tieHandle: "pk", // 平局处理：pk-平票PK，none-无人出局
    allowAbstain: true, // 允许弃权
    // 胜利条件
    winCondition: {
      civilian: "所有卧底被淘汰",
      undercover: "存活人数≤3人且卧底存活",
      whiteboard: "所有卧底出局且白板存活"
    }
  },

  // 词库配置
  wordConfig: {
    categories: ["食物", "行业", "成语", "潮流", "热点", "地名", "景点", "明星", "影视"],
    difficulty: {
      easy: 1,
      medium: 2,
      hard: 3
    }
  },

  // 场景枚举
  scene: {
    LOBBY: "lobby", // 大厅
    CREATE_ROOM: "createRoom", // 创建房间页
    ROOM: "room", // 房间等待页
    GAME: "game", // 游戏中
    SETTLEMENT: "settlement" // 结算页
  },

  // 游戏阶段枚举
  gamePhase: {
    WAITING: "waiting", // 等待中
    VIEW_WORD: "viewWord", // 查看词语阶段
    SPEAKING: "speaking", // 发言阶段
    VOTING: "voting", // 投票阶段
    SETTLEMENT: "settlement" // 结算阶段
  },

  // 身份枚举
  role: {
    CIVILIAN: "civilian", // 平民
    UNDERCOVER: "undercover", // 卧底
    WHITEBOARD: "whiteboard" // 白板
  },

  // 房间状态枚举
  roomStatus: {
    WAITING: "waiting", // 等待中
    PLAYING: "playing", // 游戏中
    ENDED: "ended" // 已结束
  }
}