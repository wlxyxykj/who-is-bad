import config from "./config.js";
import cloud from "./cloud.js";
import player from "./player.js";
import room from "./room.js";
import utils from "./utils.js";

/**
 * 游戏核心模块
 * 游戏流程控制、发言轮次、投票处理、胜负判定
 */
class GameCore {
  constructor() {
    this.currentPhase = config.gamePhase.WAITING;
    this.currentRound = 1; // 当前轮次
    this.speakOrder = []; // 发言顺序（玩家openid数组）
    this.currentSpeakerIndex = 0; // 当前发言人索引
    this.timer = null; // 当前阶段的倒计时器
    this.voteData = {}; // 本轮投票数据 {openId: 投票目标openId}
  }

  // 初始化游戏（游戏开始时调用）
  initGame(roomData) {
    this.currentRound = 1;
    this.currentPhase = config.gamePhase.VIEW_WORD;
    this.voteData = {};
    
    // 生成发言顺序：洗牌存活玩家
    const alivePlayers = roomData.players.filter(p => p.isAlive);
    this.speakOrder = utils.shuffleArray(alivePlayers.map(p => p.openId));
    this.currentSpeakerIndex = 0;

    // 启动查看词语倒计时
    this.startViewWordTimer();
  }

  // 启动查看词语倒计时
  startViewWordTimer() {
    const CountdownTimer = utils.CountdownTimer;
    this.timer = new CountdownTimer(
      config.timeConfig.viewWord,
      (remaining) => {
        // 倒计时tick，UI会自动读取
      },
      () => {
        // 倒计时结束，进入发言阶段
        this.enterSpeakPhase();
      }
    );
    this.timer.start();
  }

  // 进入发言阶段
  enterSpeakPhase() {
    this.currentPhase = config.gamePhase.SPEAKING;
    this.startSpeakTimer();
  }

  // 启动当前玩家的发言倒计时
  startSpeakTimer() {
    if (this.timer) this.timer.stop();
    
    const CountdownTimer = utils.CountdownTimer;
    this.timer = new CountdownTimer(
      config.timeConfig.speakPerPlayer,
      (remaining) => {},
      () => {
        // 发言时间到，自动下一位
        this.nextSpeaker();
      }
    );
    this.timer.start();
  }

  // 切换到下一位发言人
  nextSpeaker() {
    this.currentSpeakerIndex++;
    // 检查是否所有玩家都发言完毕
    if (this.currentSpeakerIndex >= this.speakOrder.length) {
      // 发言结束，进入投票阶段
      this.enterVotePhase();
    } else {
      // 下一位玩家发言
      this.startSpeakTimer();
    }
  }

  // 进入投票阶段
  enterVotePhase() {
    if (this.timer) this.timer.stop();
    this.currentPhase = config.gamePhase.VOTING;
    this.voteData = {};

    const CountdownTimer = utils.CountdownTimer;
    this.timer = new CountdownTimer(
      config.timeConfig.vote,
      (remaining) => {},
      () => {
        // 投票时间到，提交投票结果
        this.submitVoteResult();
      }
    );
    this.timer.start();
  }

  // 玩家提交投票
  playerVote(targetOpenId) {
    if (this.currentPhase !== config.gamePhase.VOTING) return;
    if (!player.isAlive) return; // 出局玩家不能投票
    
    this.voteData[player.openId] = targetOpenId;
    utils.audio.play("audio/vote.mp3");
  }

  // 提交投票结果，处理计票
  async submitVoteResult() {
    if (this.timer) this.timer.stop();
    
    const res = await cloud.callFunction("submitVote", {
      roomId: player.currentRoomId,
      round: this.currentRound,
      voteData: this.voteData
    });

    if (res.success) {
      // 检查游戏是否结束
      if (res.gameOver) {
        this.enterSettlementPhase(res.winTeam, res.settlementData);
      } else {
        // 游戏继续，下一轮
        this.currentRound++;
        // 重新生成下一轮的发言顺序（从被淘汰的下一位开始）
        const alivePlayers = room.roomData.players.filter(p => p.isAlive);
        this.speakOrder = utils.shuffleArray(alivePlayers.map(p => p.openId));
        this.currentSpeakerIndex = 0;
        // 轮次间隔后，进入下一轮发言
        setTimeout(() => {
          this.enterSpeakPhase();
        }, config.timeConfig.roundInterval * 1000);
      }
    }
  }

  // 进入结算阶段
  enterSettlementPhase(winTeam, settlementData) {
    this.currentPhase = config.gamePhase.SETTLEMENT;
    if (this.timer) this.timer.stop();
    utils.audio.play("audio/gameOver.mp3");
  }

  // 提交玩家描述，推进发言
  async submitDesc(descText) {
    if (this.currentPhase !== config.gamePhase.SPEAKING) return;
    if (this.speakOrder[this.currentSpeakerIndex] !== player.openId) return;

    const res = await cloud.callFunction("submitDesc", {
      roomId: player.currentRoomId,
      openId: player.openId,
      round: this.currentRound,
      desc: descText
    });

    if (res.success) {
      this.nextSpeaker();
    }
    return res;
  }

  // 重置游戏状态
  reset() {
    if (this.timer) this.timer.stop();
    this.currentPhase = config.gamePhase.WAITING;
    this.currentRound = 1;
    this.speakOrder = [];
    this.currentSpeakerIndex = 0;
    this.voteData = {};
    this.timer = null;
  }
}

// 单例导出
export default new GameCore();