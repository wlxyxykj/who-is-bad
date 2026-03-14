import config from "./config.js";
import utils from "./utils.js";
import player from "./player.js";
import room from "./room.js";
import gameCore from "./gameCore.js";

/**
 * UI渲染&交互模块
 * 所有场景的Canvas绘制、触摸事件处理
 */
class UIManager {
  constructor() {
    this.ctx = null; // Canvas上下文
    this.canvas = null;
    this.dpr = 1; // 设备像素比，适配高清屏
    this.currentScene = config.scene.LOBBY; // 当前场景
    
    // 按钮区域缓存，用于触摸点击判断
    this.buttonRects = [];

    // 输入相关
    this.inputFocus = null; // 当前聚焦的输入框
    this.inputValue = {
      roomId: "",
      password: "",
      roomName: "",
      desc: ""

    };
    this.initInput();
  }

  // 初始化Canvas
  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.dpr = wx.getWindowInfo().pixelRatio || 2;
    
    // 设置Canvas尺寸，适配高清屏
    canvas.width = config.canvasWidth * this.dpr;
    canvas.height = config.canvasHeight * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
    
    // 绑定触摸事件
    canvas.addEventListener("touchstart", this.handleTouchStart.bind(this));
    canvas.addEventListener("touchend", this.handleTouchEnd.bind(this));

    // 开启微信输入框（小游戏没有原生input，用wx.createInput）
    this.initInput();
  }

  // 初始化输入框
// 初始化输入框管理
initInput() {
  this.activeInput = null // 当前激活的输入框实例
  this.inputConfig = {
    roomId: {
      type: 'number',
      placeholder: '请输入6位房间号',
      maxLength: 6,
      bindKey: 'roomId'
    },
    password: {
      type: 'number',
      placeholder: '请输入房间密码',
      maxLength: 6,
      bindKey: 'password',
      secure: true
    },
    roomName: {
      type: 'text',
      placeholder: '请输入房间名称',
      maxLength: 20,
      bindKey: 'roomName'
    },
    desc: {
      type: 'text',
      placeholder: '请输入你的描述',
      maxLength: 50,
      bindKey: 'desc'
    }
  }
}

// 唤起输入框
showInput(inputType) {
  // 先销毁之前的输入框
  this.hideInput()

  const config = this.inputConfig[inputType]
  if (!config) return

  // 创建输入框实例
  this.activeInput = wx.createInput({
    type: config.type,
    placeholder: config.placeholder,
    maxLength: config.maxLength,
    secureTextEntry: config.secure || false,
    style: {
      position: 'absolute',
      left: '-9999px', // 移出屏幕外，只保留键盘功能
      top: '-9999px',
      width: '1px',
      height: '1px'
    }
  })

  // 监听输入
  this.activeInput.onInput((e) => {
    this.inputValue[config.bindKey] = e.value
  })

  // 监听完成
  this.activeInput.onConfirm(() => {
    this.hideInput()
  })

  // 自动聚焦，唤起键盘
  this.activeInput.focus()
}

// 隐藏并销毁输入框
hideInput() {
  if (this.activeInput) {
    this.activeInput.blur()
    this.activeInput.destroy()
    this.activeInput = null
  }
}

  // 清空画布
  clear() {
    this.ctx.clearRect(0, 0, config.canvasWidth, config.canvasHeight);
  }

  // 主渲染方法，根据当前场景渲染对应内容
  render() {
    this.clear();
    this.buttonRects = []; // 清空按钮缓存

    // 绘制背景
    this.drawBg();

    // 根据场景渲染
    switch (this.currentScene) {
      case config.scene.LOBBY:
        this.renderLobby();
        break;
      case config.scene.CREATE_ROOM:
        this.renderCreateRoom();
        break;
      case config.scene.ROOM:
        this.renderRoom();
        break;
      case config.scene.GAME:
        this.renderGame();
        break;
      case config.scene.SETTLEMENT:
        this.renderSettlement();
        break;
    }
  }

  // 绘制背景
  drawBg() {
    this.ctx.fillStyle = "#1a1a2e";
    this.ctx.fillRect(0, 0, config.canvasWidth, config.canvasHeight);
  }

  // 绘制按钮通用方法
  drawButton(options) {
    const { x, y, width, height, text, bgColor = "#4361ee", textColor = "#fff", fontSize = 16, radius = 8, key } = options;
    
    // 绘制按钮背景
    this.ctx.fillStyle = bgColor;
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, width, height, radius);
    this.ctx.fill();

    // 绘制按钮文字
    this.ctx.fillStyle = textColor;
    this.ctx.font = `${fontSize}px sans-serif`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(text, x + width / 2, y + height / 2);

    // 缓存按钮区域，用于点击判断
    this.buttonRects.push({ key, rect: { x, y, width, height } });
  }

  // 绘制文本通用方法
  drawText(options) {
    const { text, x, y, fontSize = 14, color = "#fff", textAlign = "left", textBaseline = "top" } = options;
    this.ctx.fillStyle = color;
    this.ctx.font = `${fontSize}px sans-serif`;
    this.ctx.textAlign = textAlign;
    this.ctx.textBaseline = textBaseline;
    this.ctx.fillText(text, x, y);
  }

  // ==================== 场景1：大厅场景 ====================
  renderLobby() {
    // 标题
    this.drawText({
      text: "谁是卧底",
      x: config.canvasWidth / 2,
      y: 100,
      fontSize: 36,
      color: "#fff",
      textAlign: "center"
    });

    // 房间号输入框
    this.ctx.fillStyle = "#2a2a42";
    this.ctx.roundRect(30, 200, config.canvasWidth - 60, 50, 8);
    this.ctx.fill();
    this.drawText({
      text: this.inputValue.roomId || "请输入6位房间号",
      x: 45,
      y: 225,
      fontSize: 16,
      color: this.inputValue.roomId ? "#fff" : "#888"
    });

    // 密码输入框
    this.ctx.fillStyle = "#2a2a42";
    this.ctx.roundRect(30, 270, config.canvasWidth - 60, 50, 8);
    this.ctx.fill();
    this.drawText({
      text: this.inputValue.password ? "●".repeat(this.inputValue.password.length) : "请输入房间密码（选填）",
      x: 45,
      y: 295,
      fontSize: 16,
      color: this.inputValue.password ? "#fff" : "#888"
    });

    // 加入房间按钮
    this.drawButton({
      key: "joinRoom",
      x: 30,
      y: 350,
      width: config.canvasWidth - 60,
      height: 50,
      text: "加入房间",
      bgColor: "#4361ee",
      fontSize: 18
    });

    // 创建房间按钮
    this.drawButton({
      key: "createRoom",
      x: 30,
      y: 420,
      width: config.canvasWidth - 60,
      height: 50,
      text: "创建房间",
      bgColor: "#7209b7",
      fontSize: 18
    });
  }

  // ==================== 场景2：创建房间场景 ====================
  renderCreateRoom() {
    this.drawText({
      text: "创建房间",
      x: config.canvasWidth / 2,
      y: 60,
      fontSize: 24,
      textAlign: "center"
    });

    // 房间名称输入框
    this.ctx.fillStyle = "#2a2a42";
    this.ctx.roundRect(30, 120, config.canvasWidth - 60, 50, 8);
    this.ctx.fill();
    this.drawText({
      text: this.inputValue.roomName || `${player.userInfo?.nickName || "我的"}的房间`,
      x: 45,
      y: 145,
      fontSize: 16,
      color: this.inputValue.roomName ? "#fff" : "#888"
    });
    this.drawText({
      text: "房间名称",
      x: 45,
      y: 100,
      fontSize: 14,
      color: "#aaa"
    });

    // 人数选择
    this.drawText({
      text: "最大人数",
      x: 30,
      y: 190,
      fontSize: 14,
      color: "#aaa"
    });
    const playerOptions = [4,6,8,10,12];
    playerOptions.forEach((num, index) => {
      const x = 30 + index * 65;
      this.drawButton({
        key: `setPlayerNum_${num}`,
        x,
        y: 210,
        width: 60,
        height: 40,
        text: `${num}人`,
        bgColor: config.room.defaultMaxPlayers === num ? "#4361ee" : "#2a2a42",
        fontSize: 14
      });
    });

    // 模式选择
    this.drawText({
      text: "游戏模式",
      x: 30,
      y: 270,
      fontSize: 14,
      color: "#aaa"
    });
    const modeOptions = ["经典", "爆照", "竞技"];
    modeOptions.forEach((mode, index) => {
      const x = 30 + index * 110;
      this.drawButton({
        key: `setMode_${mode}`,
        x,
        y: 290,
        width: 100,
        height: 40,
        text: mode,
        bgColor: config.room.defaultMode === mode.toLowerCase() ? "#4361ee" : "#2a2a42",
        fontSize: 14
      });
    });

    // 底部按钮
    this.drawButton({
      key: "backLobby",
      x: 30,
      y: config.canvasHeight - 100,
      width: 150,
      height: 50,
      text: "取消",
      bgColor: "#2a2a42"
    });

    this.drawButton({
      key: "confirmCreateRoom",
      x: config.canvasWidth - 180,
      y: config.canvasHeight - 100,
      width: 150,
      height: 50,
      text: "创建",
      bgColor: "#4361ee"
    });
  }

  // ==================== 场景3：房间等待场景 ====================
  renderRoom() {
    if (!room.roomData) return;

    // 房间信息
    this.drawText({
      text: room.roomData.name,
      x: config.canvasWidth / 2,
      y: 40,
      fontSize: 20,
      textAlign: "center"
    });
    this.drawText({
      text: `房间号：${room.roomData.roomId}`,
      x: config.canvasWidth / 2,
      y: 70,
      fontSize: 16,
      color: "#aaa",
      textAlign: "center"
    });

    // 玩家列表
    this.drawText({
      text: `玩家列表 (${room.roomData.players.length}/${room.roomData.maxPlayers})`,
      x: 30,
      y: 110,
      fontSize: 16,
      color: "#fff"
    });

    // 绘制玩家卡片
    const players = room.roomData.players;
    players.forEach((playerItem, index) => {
      const row = Math.floor(index / 2);
      const col = index % 2;
      const x = 30 + col * 160;
      const y = 140 + row * 80;
      const width = 150;
      const height = 70;

      // 卡片背景
      this.ctx.fillStyle = "#2a2a42";
      this.ctx.roundRect(x, y, width, height, 8);
      this.ctx.fill();

      // 房主皇冠
      if (playerItem.openId === room.roomData.ownerOpenId) {
        this.drawText({
          text: "👑",
          x: x + 15,
          y: y + 10,
          fontSize: 14
        });
      }

      // 准备标识
      if (playerItem.isReady) {
        this.drawText({
          text: "已准备",
          x: x + width - 20,
          y: y + 10,
          fontSize: 12,
          color: "#4ade80",
          textAlign: "right"
        });
      }

      // 昵称
      this.drawText({
        text: utils.truncateText(playerItem.nickName, 8),
        x: x + width / 2,
        y: y + height / 2,
        fontSize: 14,
        textAlign: "center"
      });
    });

    // 底部按钮
    if (player.isOwner) {
      // 房主按钮
      this.drawButton({
        key: "startGame",
        x: 30,
        y: config.canvasHeight - 80,
        width: config.canvasWidth - 60,
        height: 50,
        text: "开始游戏",
        bgColor: "#10b981",
        fontSize: 18
      });
    } else {
      // 普通玩家按钮
      this.drawButton({
        key: "toggleReady",
        x: 30,
        y: config.canvasHeight - 80,
        width: config.canvasWidth - 60,
        height: 50,
        text: player.isReady ? "取消准备" : "准备",
        bgColor: player.isReady ? "#f59e0b" : "#4361ee",
        fontSize: 18
      });
    }

    // 退出房间按钮
    this.drawButton({
      key: "exitRoom",
      x: 10,
      y: 10,
      width: 60,
      height: 30,
      text: "退出",
      bgColor: "#ef4444",
      fontSize: 12,
      radius: 15
    });
  }

  // ==================== 场景4：游戏中场景 ====================
  renderGame() {
    if (!room.roomData) return;

    // 顶部信息
    this.drawText({
      text: `第${gameCore.currentRound}轮`,
      x: config.canvasWidth / 2,
      y: 30,
      fontSize: 20,
      textAlign: "center"
    });

    // 阶段提示
    const phaseText = {
      [config.gamePhase.VIEW_WORD]: "查看你的词语",
      [config.gamePhase.SPEAKING]: "轮流描述阶段",
      [config.gamePhase.VOTING]: "投票淘汰阶段"
    }[gameCore.currentPhase];
    this.drawText({
      text: phaseText,
      x: config.canvasWidth / 2,
      y: 60,
      fontSize: 16,
      color: "#aaa",
      textAlign: "center"
    });

    // 倒计时
    if (gameCore.timer) {
      this.drawText({
        text: utils.formatTime(gameCore.timer.remainingSeconds),
        x: config.canvasWidth / 2,
        y: 90,
        fontSize: 24,
        color: gameCore.timer.remainingSeconds <= 5 ? "#ef4444" : "#fff",
        textAlign: "center"
      });
    }

    // 1. 查看词语阶段
    if (gameCore.currentPhase === config.gamePhase.VIEW_WORD) {
      // 词语卡片
      this.ctx.fillStyle = "#2a2a42";
      this.ctx.roundRect(50, 150, config.canvasWidth - 100, 200, 12);
      this.ctx.fill();

      // 身份提示
      const roleText = {
        [config.role.CIVILIAN]: "平民",
        [config.role.UNDERCOVER]: "卧底",
        [config.role.WHITEBOARD]: "白板"
      }[player.role];
      this.drawText({
        text: `你的身份：${roleText}`,
        x: config.canvasWidth / 2,
        y: 180,
        fontSize: 18,
        color: player.role === config.role.CIVILIAN ? "#4ade80" : player.role === config.role.UNDERCOVER ? "#ef4444" : "#f59e0b",
        textAlign: "center"
      });

      // 词语
      const showWord = player.role === config.role.WHITEBOARD ? "你没有词语，靠猜！" : player.word;
      this.drawText({
        text: showWord,
        x: config.canvasWidth / 2,
        y: 250,
        fontSize: 32,
        fontWeight: "bold",
        textAlign: "center"
      });

      // 提示
      if (player.role !== config.role.WHITEBOARD) {
        this.drawText({
          text: "不要让别人猜到你的词语，也不要暴露自己的身份",
          x: config.canvasWidth / 2,
          y: 300,
          fontSize: 12,
          color: "#888",
          textAlign: "center"
        });
      }
    }

    // 2. 发言阶段
    if (gameCore.currentPhase === config.gamePhase.SPEAKING) {
      const currentSpeakerOpenId = gameCore.speakOrder[gameCore.currentSpeakerIndex];
      const currentSpeaker = room.roomData.players.find(p => p.openId === currentSpeakerOpenId);
      
      // 当前发言人提示
      this.drawText({
        text: `当前发言：${currentSpeaker?.nickName}`,
        x: config.canvasWidth / 2,
        y: 130,
        fontSize: 18,
        color: currentSpeakerOpenId === player.openId ? "#4361ee" : "#fff",
        textAlign: "center"
      });

      // 自己发言时，输入框和提交按钮
      if (currentSpeakerOpenId === player.openId) {
        // 描述输入框
        this.ctx.fillStyle = "#2a2a42";
        this.ctx.roundRect(30, 180, config.canvasWidth - 60, 100, 8);
        this.ctx.fill();
        this.drawText({
          text: this.inputValue.desc || "请输入你的描述，不能直接说词语哦",
          x: 45,
          y: 195,
          fontSize: 16,
          color: this.inputValue.desc ? "#fff" : "#888"
        });

        // 提交按钮
        this.drawButton({
          key: "submitDesc",
          x: 30,
          y: 300,
          width: config.canvasWidth - 60,
          height: 50,
          text: "提交描述",
          bgColor: "#4361ee"
        });
      }

      // 玩家列表（存活/出局状态）
      this.drawText({
        text: "玩家状态",
        x: 30,
        y: 380,
        fontSize: 16,
        color: "#fff"
      });

      room.roomData.players.forEach((p, index) => {
        const x = 30 + (index % 3) * 105;
        const y = 410 + Math.floor(index / 3) * 70;
        const width = 100;
        const height = 60;

        // 卡片背景
        this.ctx.fillStyle = p.isAlive ? "#2a2a42" : "#111";
        this.ctx.roundRect(x, y, width, height, 6);
        this.ctx.fill();

        // 昵称
        this.drawText({
          text: utils.truncateText(p.nickName, 4),
          x: x + width / 2,
          y: y + 15,
          fontSize: 12,
          color: p.isAlive ? "#fff" : "#666",
          textAlign: "center"
        });

        // 状态
        this.drawText({
          text: p.isAlive ? "存活" : "已出局",
          x: x + width / 2,
          y: y + 35,
          fontSize: 10,
          color: p.isAlive ? "#4ade80" : "#ef4444",
          textAlign: "center"
        });

        // 发言中标识
        if (p.openId === currentSpeakerOpenId) {
          this.drawText({
            text: "🎤",
            x: x + width - 10,
            y: y + 5,
            fontSize: 12
          });
        }
      });
    }

    // 3. 投票阶段
    if (gameCore.currentPhase === config.gamePhase.VOTING) {
      this.drawText({
        text: "点击你认为是卧底的玩家，投出宝贵的一票",
        x: config.canvasWidth / 2,
        y: 130,
        fontSize: 14,
        color: "#aaa",
        textAlign: "center"
      });

      // 投票玩家列表
      const alivePlayers = room.roomData.players.filter(p => p.isAlive);
      alivePlayers.forEach((p, index) => {
        const row = Math.floor(index / 2);
        const col = index % 2;
        const x = 30 + col * 160;
        const y = 160 + row * 90;
        const width = 150;
        const height = 80;

        // 卡片背景
        this.ctx.fillStyle = "#2a2a42";
        this.ctx.roundRect(x, y, width, height, 8);
        this.ctx.fill();

        // 昵称
        this.drawText({
          text: utils.truncateText(p.nickName, 8),
          x: x + width / 2,
          y: y + 20,
          fontSize: 16,
          textAlign: "center"
        });

        // 投票按钮
        this.drawButton({
          key: `vote_${p.openId}`,
          x: x + 25,
          y: y + 45,
          width: 100,
          height: 25,
          text: "投TA",
          bgColor: "#ef4444",
          fontSize: 12,
          radius: 12
        });
      });

      // 弃权按钮
      if (config.rule.allowAbstain) {
        this.drawButton({
          key: "vote_abstain",
          x: 30,
          y: config.canvasHeight - 100,
          width: config.canvasWidth - 60,
          height: 40,
          text: "弃权",
          bgColor: "#666",
          fontSize: 14
        });
      }
    }
  }

  // ==================== 场景5：结算场景 ====================
  renderSettlement() {
    if (!room.roomData) return;

    // 结算标题
    const isWin = false; // 后续根据身份和胜利方判断
    this.drawText({
      text: isWin ? "胜利！" : "游戏结束",
      x: config.canvasWidth / 2,
      y: 80,
      fontSize: 36,
      color: isWin ? "#4ade80" : "#ef4444",
      textAlign: "center"
    });

    // 词语揭晓
    const wordPair = room.roomData.currentWordPair;
    this.drawText({
      text: `平民词：${wordPair?.[0] || ""}`,
      x: config.canvasWidth / 2,
      y: 140,
      fontSize: 18,
      textAlign: "center"
    });
    this.drawText({
      text: `卧底词：${wordPair?.[1] || ""}`,
      x: config.canvasWidth / 2,
      y: 170,
      fontSize: 18,
      textAlign: "center"
    });

    // 玩家身份揭晓
    this.drawText({
      text: "身份揭晓",
      x: 30,
      y: 220,
      fontSize: 18,
      color: "#fff"
    });

    room.roomData.players.forEach((p, index) => {
      const y = 250 + index * 50;
      // 背景
      this.ctx.fillStyle = "#2a2a42";
      this.ctx.roundRect(30, y, config.canvasWidth - 60, 40, 6);
      this.ctx.fill();

      // 昵称
      this.drawText({
        text: utils.truncateText(p.nickName, 10),
        x: 45,
        y: y + 20,
        fontSize: 14,
        textBaseline: "middle"
      });

      // 身份
      const roleText = {
        [config.role.CIVILIAN]: "平民",
        [config.role.UNDERCOVER]: "卧底",
        [config.role.WHITEBOARD]: "白板"
      }[p.role];
      const roleColor = p.role === config.role.CIVILIAN ? "#4ade80" : p.role === config.role.UNDERCOVER ? "#ef4444" : "#f59e0b";
      this.drawText({
        text: roleText,
        x: config.canvasWidth - 100,
        y: y + 20,
        fontSize: 14,
        color: roleColor,
        textBaseline: "middle",
        textAlign: "right"
      });
    });

    // 底部按钮
    if (player.isOwner) {
      this.drawButton({
        key: "againGame",
        x: 30,
        y: config.canvasHeight - 100,
        width: config.canvasWidth - 60,
        height: 50,
        text: "再来一局",
        bgColor: "#10b981",
        fontSize: 18
      });
    }

    this.drawButton({
      key: "backLobby",
      x: 30,
      y: config.canvasHeight - 40,
      width: config.canvasWidth - 60,
      height: 30,
      text: "返回大厅",
      bgColor: "#2a2a42",
      fontSize: 14
    });
  }

  // ==================== 触摸事件处理 ====================
  // 补充到 handleTouchEnd 方法里，在按钮判断之前，先处理输入框点击
async handleTouchEnd(e) {
  const touchEndPos = {
    x: e.changedTouches[0].clientX / this.dpr,
    y: e.changedTouches[0].clientY / this.dpr
  };

  // ========== 新增：输入框点击唤起 ==========
  // 大厅场景：房间号输入框
  if (this.currentScene === config.scene.LOBBY) {
    // 房间号输入框区域
    if (utils.isPointInRect(touchEndPos, { x:30, y:200, width: config.canvasWidth-60, height:50 })) {
      this.showInput('roomId')
      return
    }
    // 密码输入框区域
    if (utils.isPointInRect(touchEndPos, { x:30, y:270, width: config.canvasWidth-60, height:50 })) {
      this.showInput('password')
      return
    }
  }

  // 创建房间场景：房间名称输入框
  if (this.currentScene === config.scene.CREATE_ROOM) {
    if (utils.isPointInRect(touchEndPos, { x:30, y:120, width: config.canvasWidth-60, height:50 })) {
      this.showInput('roomName')
      return
    }
  }

  // 游戏场景：描述输入框
  if (this.currentScene === config.scene.GAME && gameCore.currentPhase === config.gamePhase.SPEAKING) {
    const currentSpeakerOpenId = gameCore.speakOrder[gameCore.currentSpeakerIndex]
    if (currentSpeakerOpenId === player.openId) {
      if (utils.isPointInRect(touchEndPos, { x:30, y:180, width: config.canvasWidth-60, height:100 })) {
        this.showInput('desc')
        return
      }
    }
  }
  // ========== 输入框处理结束 ==========

  // 原有按钮判断逻辑不变
  for (const item of this.buttonRects) {
    if (utils.isPointInRect(touchEndPos, item.rect)) {
      this.handleButtonClick(item.key);
      break;
    }
  }
}

  // 按钮点击事件处理
  async handleButtonClick(key) {
    utils.audio.play("audio/click.mp3");

    // 大厅场景按钮
    if (this.currentScene === config.scene.LOBBY) {
      if (key === "joinRoom") {
        if (!this.inputValue.roomId) {
          wx.showToast({ title: "请输入房间号", icon: "none" });
          return;
        }
        const res = await room.joinRoom(this.inputValue.roomId, this.inputValue.password);
        if (res.success) {
          this.currentScene = config.scene.ROOM;
        } else {
          wx.showToast({ title: res.msg || "加入房间失败", icon: "none" });
        }
      }
      if (key === "createRoom") {
        this.currentScene = config.scene.CREATE_ROOM;
      }
    }

    // 创建房间场景按钮
    if (this.currentScene === config.scene.CREATE_ROOM) {
      if (key === "backLobby") {
        this.currentScene = config.scene.LOBBY;
      }
      if (key === "confirmCreateRoom") {
        const res = await room.createRoom({
          name: this.inputValue.roomName
        });
        if (res.success) {
          this.currentScene = config.scene.ROOM;
        } else {
          wx.showToast({ title: "创建房间失败", icon: "none" });
        }
      }
      // 人数选择
      if (key.startsWith("setPlayerNum_")) {
        const num = parseInt(key.split("_")[1]);
        config.room.defaultMaxPlayers = num;
      }
      // 模式选择
      if (key.startsWith("setMode_")) {
        const mode = key.split("_")[1].toLowerCase();
        config.room.defaultMode = mode;
      }
    }

    // 房间场景按钮
    if (this.currentScene === config.scene.ROOM) {
      if (key === "exitRoom") {
        await room.exitRoom();
        this.currentScene = config.scene.LOBBY;
      }
      if (key === "toggleReady") {
        await room.toggleReady();
      }
      if (key === "startGame") {
        const res = await room.startGame();
        if (res.success) {
          this.currentScene = config.scene.GAME;
          gameCore.initGame(room.roomData);
        } else {
          wx.showToast({ title: res.msg || "开始游戏失败", icon: "none" });
        }
      }
    }

    // 游戏场景按钮
    if (this.currentScene === config.scene.GAME) {
      if (key === "submitDesc") {
        if (!this.inputValue.desc) {
          wx.showToast({ title: "请输入你的描述", icon: "none" });
          return;
        }
        await gameCore.submitDesc(this.inputValue.desc);
        this.inputValue.desc = "";
      }
      // 投票按钮
      if (key.startsWith("vote_")) {
        const targetOpenId = key.split("_")[1];
        gameCore.playerVote(targetOpenId);
        // 提交投票
        await gameCore.submitVoteResult();
      }
    }

    // 结算场景按钮
    if (this.currentScene === config.scene.SETTLEMENT) {
      if (key === "backLobby") {
        await room.exitRoom();
        gameCore.reset();
        this.currentScene = config.scene.LOBBY;
      }
      if (key === "againGame") {
        const res = await room.againGame();
        if (res.success) {
          gameCore.reset();
          this.currentScene = config.scene.ROOM;
        }
      }
    }
  }
}

// 单例导出
export default new UIManager();