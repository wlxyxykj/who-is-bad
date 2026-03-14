// 游戏核心逻辑类
import config from "./config.js";
import room from "./room.js";
import player from "./player.js";
import ui from "./ui.js";

class GameCore {
  constructor() {
    this.currentRound = 1;
    this.currentPhase = config.gamePhase.VIEW_WORD;
    this.speakOrder = [];
    this.currentSpeakerIndex = 0;
    this.timer = null; // 倒计时定时器
    this.voteMap = {}; // 投票记录
  }

  // 初始化游戏
  initGame(roomData) {
    console.log("初始化游戏核心逻辑", roomData);
    this.reset();

    this.currentRound = roomData.currentRound || 1;
    this.currentPhase = roomData.currentPhase || config.gamePhase.VIEW_WORD;
    this.speakOrder = roomData.speakOrder || [];
    this.currentSpeakerIndex = roomData.currentSpeakerIndex || 0;

    // 从房间数据更新玩家自己的信息
    player.updateFromRoomData(roomData);

    // 启动倒计时
    this.startPhaseTimer(roomData.phaseEndTime);

    // 重新渲染UI
    ui.render();
  }

  // 【核心修复】阶段倒计时启动
  startPhaseTimer(phaseEndTime) {
    // 先清空之前的定时器
    this.clearTimer();

    if (!phaseEndTime) return;

    // 计算剩余秒数
    const endTime = new Date(phaseEndTime).getTime();
    const updateTimer = () => {
      const now = Date.now();
      const remainingMs = endTime - now;
      const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

      this.timer = {
        remainingSeconds: remainingSeconds,
        endTime: endTime
      };

      // 倒计时结束
      if (remainingSeconds <= 0) {
        this.clearTimer();
        this.onPhaseTimeEnd();
      }

      // 重新渲染UI，更新倒计时显示
      ui.render();
    };

    // 立即执行一次，然后每秒更新
    updateTimer();
    this.timerInterval = setInterval(updateTimer, 1000);
  }

  // 清空定时器
  clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.timer = null;
  }

  // 阶段倒计时结束的处理
  onPhaseTimeEnd() {
    console.log("阶段倒计时结束", this.currentPhase);
    // 看词阶段结束，自动进入发言阶段
    if (this.currentPhase === config.gamePhase.VIEW_WORD) {
      this.enterSpeakingPhase();
    }
    // 发言阶段超时，自动跳过
    else if (this.currentPhase === config.gamePhase.SPEAKING) {
      this.nextSpeaker();
    }
    // 投票阶段超时，自动弃权
    else if (this.currentPhase === config.gamePhase.VOTING) {
      this.playerVote("abstain");
      this.submitVoteResult();
    }
  }

  // 进入发言阶段
  enterSpeakingPhase() {
    this.currentPhase = config.gamePhase.SPEAKING;
    this.currentSpeakerIndex = 0;
    // 更新房间数据，同步给所有玩家
    room.updateRoomData({
      currentPhase: this.currentPhase,
      currentSpeakerIndex: this.currentSpeakerIndex,
      phaseEndTime: new Date(Date.now() + config.rule.speakTime * 1000)
    });
    ui.render();
  }

  // 下一个发言人
  nextSpeaker() {
    this.currentSpeakerIndex++;
    // 所有人发言完毕，进入投票阶段
    if (this.currentSpeakerIndex >= this.speakOrder.length) {
      this.enterVotingPhase();
      return;
    }
    // 更新房间数据，重置发言倒计时
    room.updateRoomData({
      currentSpeakerIndex: this.currentSpeakerIndex,
      phaseEndTime: new Date(Date.now() + config.rule.speakTime * 1000)
    });
    ui.render();
  }

  // 进入投票阶段
  enterVotingPhase() {
    this.currentPhase = config.gamePhase.VOTING;
    this.voteMap = {};
    // 更新房间数据，投票倒计时
    room.updateRoomData({
      currentPhase: this.currentPhase,
      phaseEndTime: new Date(Date.now() + config.rule.voteTime * 1000)
    });
    ui.render();
  }

  // 玩家投票
  playerVote(targetOpenId) {
    this.voteMap[player.openId] = targetOpenId;
  }

  // 提交发言描述
  async submitDesc(desc) {
    if (this.currentPhase !== config.gamePhase.SPEAKING) return;
    // 更新自己的发言内容到房间数据
    await room.updatePlayerData({
      speakDesc: desc
    });
    // 自动进入下一个发言人
    this.nextSpeaker();
  }

  // 提交投票结果
  async submitVoteResult() {
    // 这里需要同步所有玩家的投票，建议在云函数里处理计票逻辑
    // 先把自己的投票提交到房间数据
    await room.updatePlayerData({
      hasVoted: true,
      voteTarget: this.voteMap[player.openId]
    });
    // 后续计票、淘汰、胜负判断，建议在云函数里实现，避免前端作弊
    wx.showToast({ title: "投票成功", icon: "success" });
  }

  // 重置游戏状态
  reset() {
    this.clearTimer();
    this.currentRound = 1;
    this.currentPhase = config.gamePhase.VIEW_WORD;
    this.speakOrder = [];
    this.currentSpeakerIndex = 0;
    this.voteMap = {};
  }
}

// 单例导出
export default new GameCore();