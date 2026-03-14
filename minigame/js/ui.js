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
    // 核心属性
    this.ctx = null;
    this.canvas = null;
    this.dpr = 2;
    this.currentScene = config.scene.LOBBY;
    
    // 按钮点击区域缓存
    this.buttonRects = [];

    // 输入相关
    this.activeInput = null;
    this.inputConfig = {};
    this.inputValue = {
      roomId: "",
      password: "",
      roomName: "",
      desc: ""
    };

    // 事件绑定锁，绝对避免重复绑定
    this._eventBinded = false;

    // 【核心修复】构造函数里直接绑定小游戏全局触摸事件，彻底解决事件不触发的问题
    this._bindGlobalTouchEvent();
  }

  // 【新增】绑定小游戏全局触摸事件，全机型兼容
  _bindGlobalTouchEvent() {
    if (this._eventBinded) return;

    console.log("🔗 绑定小游戏全局触摸事件");
    // 全局触摸开始
    wx.onTouchStart((e) => {
      this.handleTouchStart(e);
    });

    // 全局触摸结束（核心点击逻辑）
    wx.onTouchEnd((e) => {
      this.handleTouchEnd(e);
    });

    this._eventBinded = true;
    console.log("✅ 全局触摸事件绑定完成");
  }

  // 自定义圆角矩形（兼容小游戏）
  drawRoundRect(x, y, width, height, radius) {
    if (!this.ctx) return;
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }

  // Canvas初始化
  init(canvas) {
    // 1. 强校验canvas有效性
    if (!canvas) {
      console.error("❌ UI初始化失败：传入的canvas为空");
      return;
    }
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    console.log("✅ 拿到Canvas和上下文对象");

    // 2. 【修复1】获取设备信息，统一适配逻辑
    let systemInfo = {};
    try {
      if (wx.getWindowInfo) {
        systemInfo = wx.getWindowInfo();
      } else {
        systemInfo = wx.getSystemInfoSync();
      }
    } catch (e) {
      console.warn("获取设备信息失败，用默认值", e);
    }
    this.dpr = systemInfo.pixelRatio || systemInfo.devicePixelRatio || 2;
    const logicWidth = systemInfo.windowWidth || 375;
    const logicHeight = systemInfo.windowHeight || 667;

    // 3. 强制同步config的画布尺寸，和屏幕逻辑尺寸完全一致
    config.canvasWidth = logicWidth;
    config.canvasHeight = logicHeight;

    // 4. 设置Canvas物理像素尺寸（高清屏绘制）
    canvas.width = logicWidth * this.dpr;
    canvas.height = logicHeight * this.dpr;

    // 5. 重置画布缩放，确保绘制逻辑和坐标完全匹配
    this.ctx.resetTransform();
    this.ctx.scale(this.dpr, this.dpr);

    // 6. 初始化输入框配置
    this.initInput();

    console.log("===== UI初始化完成 =====");
    console.log("设备dpr：", this.dpr);
    console.log("画布逻辑尺寸：", logicWidth, logicHeight);
    console.log("画布物理尺寸：", canvas.width, canvas.height);
  }

  // 初始化输入框配置
  initInput() {
    this.activeInput = null;
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
    };
    console.log("✅ 输入框配置初始化完成");
  }

  // 小游戏兼容版输入弹窗（全环境可用）
  showInput(inputType) {
    const config = this.inputConfig[inputType];
    if (!config) return;

    console.log("✅ 唤起输入弹窗：", inputType);
    wx.showModal({
      title: config.placeholder,
      editable: true,
      placeholderText: config.placeholder,
      maxLength: config.maxLength,
      inputType: config.type === 'number' ? 'number' : 'text',
      secureTextEntry: config.secure || false,
      confirmText: "确认",
      success: (res) => {
        if (res.confirm && res.content !== undefined) {
          this.inputValue[config.bindKey] = res.content;
          console.log("输入完成，内容已同步：", config.bindKey, res.content);
        }
      },
      fail: (err) => {
        console.error("输入弹窗失败：", err);
      }
    });
  }

  // 空方法兼容原有调用
  hideInput() {
    return;
  }

  // 触摸开始事件（仅日志，无业务逻辑）
  handleTouchStart(e) {
    const touch = e.changedTouches?.[0] || e.touches?.[0];
    if (touch) {
      console.log("👆 触摸开始，原始坐标：", { x: touch.clientX, y: touch.clientY });
    }
  }

  // 触摸结束事件，核心点击逻辑，全链路日志
  async handleTouchEnd(e) {
    console.log("===== 触摸结束，开始处理点击 =====");
    
    // 1. 前置校验
    if (!config.canvasWidth || !config.canvasHeight) {
      console.error("❌ 画布尺寸未初始化");
      return;
    }

    // 2. 稳定获取触摸点（兼容真机所有情况）
    const touch = e.changedTouches?.[0] || e.touches?.[0];
    if (!touch) {
      console.log("❌ 未获取到有效触摸点");
      return;
    }

    // 3. 核心：触摸坐标直接使用clientX/clientY，和绘制逻辑完全匹配
    const touchPos = {
      x: touch.clientX,
      y: touch.clientY
    };

    console.log("🎯 最终点击坐标：", touchPos);
    console.log("📍 当前场景：", this.currentScene);

    // ========== 第一步：处理输入框点击 ==========
    if (this.currentScene === config.scene.LOBBY) {
      // 大厅-房间号输入框
      const roomIdRect = { x:30, y:200, width: config.canvasWidth-60, height:50 };
      console.log("📦 房间号输入框区域：", roomIdRect);
      if (utils.isPointInRect(touchPos, roomIdRect)) {
        console.log("✅ 命中房间号输入框");
        this.showInput('roomId');
        return;
      }

      // 大厅-密码输入框
      const pwdRect = { x:30, y:270, width: config.canvasWidth-60, height:50 };
      console.log("📦 密码输入框区域：", pwdRect);
      if (utils.isPointInRect(touchPos, pwdRect)) {
        console.log("✅ 命中密码输入框");
        this.showInput('password');
        return;
      }
    }

    // 创建房间场景-房间名称输入框
    if (this.currentScene === config.scene.CREATE_ROOM) {
      const roomNameRect = { x:30, y:120, width: config.canvasWidth-60, height:50 };
      if (utils.isPointInRect(touchPos, roomNameRect)) {
        console.log("✅ 命中房间名称输入框");
        this.showInput('roomName');
        return;
      }
    }

    // 游戏场景-描述输入框
    if (this.currentScene === config.scene.GAME && gameCore.currentPhase === config.gamePhase.SPEAKING) {
      const currentSpeaker = gameCore.speakOrder?.[gameCore.currentSpeakerIndex];
      if (currentSpeaker === player.openId) {
        const descRect = { x:30, y:180, width: config.canvasWidth-60, height:100 };
        if (utils.isPointInRect(touchPos, descRect)) {
          console.log("✅ 命中描述输入框");
          this.showInput('desc');
          return;
        }
      }
    }

    // ========== 第二步：处理按钮点击 ==========
    console.log("🔘 当前可点击按钮数量：", this.buttonRects.length);
    if (this.buttonRects.length === 0) {
      console.log("⚠️ 没有可点击的按钮，跳过按钮判断");
      return;
    }

    // 遍历按钮，判断命中
    for (const btn of this.buttonRects) {
      const isHit = utils.isPointInRect(touchPos, btn.rect);
      console.log(`检查按钮【${btn.key}】，区域：`, btn.rect, `是否命中：${isHit}`);
      
      if (isHit) {
        console.log("🎉 命中按钮，触发点击事件：", btn.key);
        await this.handleButtonClick(btn.key);
        break;
      }
    }
  }

  // 清空画布
  clear() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, config.canvasWidth, config.canvasHeight);
  }

  // 主渲染入口
  render() {
    this.clear();
    this.buttonRects = []; // 每次渲染清空按钮缓存，避免旧数据干扰
    this.drawBg();

    // 按场景渲染
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
    if (!this.ctx) return;
    this.ctx.fillStyle = "#1a1a2e";
    this.ctx.fillRect(0, 0, config.canvasWidth, config.canvasHeight);
  }

  // 通用按钮绘制方法
  drawButton(options) {
    if (!this.ctx) return;
    const { x, y, width, height, text, bgColor = "#4361ee", textColor = "#fff", fontSize = 16, radius = 8, key } = options;
    
    // 绘制按钮背景
    this.ctx.fillStyle = bgColor;
    this.drawRoundRect(x, y, width, height, radius);
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

  // 通用文本绘制方法
  drawText(options) {
    if (!this.ctx) return;
    const { text, x, y, fontSize = 14, color = "#fff", textAlign = "left", textBaseline = "top" } = options;
    this.ctx.fillStyle = color;
    this.ctx.font = `${fontSize}px sans-serif`;
    this.ctx.textAlign = textAlign;
    this.ctx.textBaseline = textBaseline;
    this.ctx.fillText(text, x, y);
  }

  // ==================== 大厅场景 ====================
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
    this.drawRoundRect(30, 200, config.canvasWidth - 60, 50, 8);
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
    this.drawRoundRect(30, 270, config.canvasWidth - 60, 50, 8);
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

  // ==================== 创建房间场景 ====================
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
    this.drawRoundRect(30, 120, config.canvasWidth - 60, 50, 8);
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
        bgColor: (config.room?.defaultMaxPlayers || 8) === num ? "#4361ee" : "#2a2a42",
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
        bgColor: (config.room?.defaultMode || "经典") === mode.toLowerCase() ? "#4361ee" : "#2a2a42",
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

  // ==================== 房间等待场景 ====================
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
    // 【修复2】房间号直接取 room.roomId，或者 room.roomData._id
    this.drawText({
      text: `房间号：${room.roomId}`,
      x: config.canvasWidth / 2,
      y: 70,
      fontSize: 16,
      color: "#aaa",
      textAlign: "center"
    });

    // 玩家列表
    this.drawText({
      text: `玩家列表 (${room.roomData.players?.length || 0}/${room.roomData.maxPlayers || 8})`,
      x: 30,
      y: 110,
      fontSize: 16,
      color: "#fff"
    });

    // 绘制玩家卡片
    const players = room.roomData.players || [];
    players.forEach((playerItem, index) => {
      const row = Math.floor(index / 2);
      const col = index % 2;
      const x = 30 + col * 160;
      const y = 140 + row * 80;
      const width = 150;
      const height = 70;

      // 卡片背景
      this.ctx.fillStyle = "#2a2a42";
      this.drawRoundRect(x, y, width, height, 8);
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

  // ==================== 游戏中场景 ====================
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
      this.drawRoundRect(50, 150, config.canvasWidth - 100, 200, 12);
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
      const currentSpeakerOpenId = gameCore.speakOrder?.[gameCore.currentSpeakerIndex];
      const currentSpeaker = room.roomData.players?.find(p => p.openId === currentSpeakerOpenId);
      
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
        this.drawRoundRect(30, 180, config.canvasWidth - 60, 100, 8);
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

      (room.roomData.players || []).forEach((p, index) => {
        const x = 30 + (index % 3) * 105;
        const y = 410 + Math.floor(index / 3) * 70;
        const width = 100;
        const height = 60;

        // 卡片背景
        this.ctx.fillStyle = p.isAlive ? "#2a2a42" : "#111";
        this.drawRoundRect(x, y, width, height, 6);
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
      const alivePlayers = (room.roomData.players || []).filter(p => p.isAlive);
      alivePlayers.forEach((p, index) => {
        const row = Math.floor(index / 2);
        const col = index % 2;
        const x = 30 + col * 160;
        const y = 160 + row * 90;
        const width = 150;
        const height = 80;

        // 卡片背景
        this.ctx.fillStyle = "#2a2a42";
        this.drawRoundRect(x, y, width, height, 8);
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
      if (config.rule?.allowAbstain) {
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

  // ==================== 结算场景 ====================
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

    (room.roomData.players || []).forEach((p, index) => {
      const y = 250 + index * 50;
      // 背景
      this.ctx.fillStyle = "#2a2a42";
      this.drawRoundRect(30, y, config.canvasWidth - 60, 40, 6);
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

  // 按钮点击事件处理
  async handleButtonClick(key) {
    console.log("开始处理按钮点击：", key);
    // 【修复3】音频播放加容错，路径修正
    try {
      utils.audio.play("audio/click.mp3");
    } catch (e) {
      console.log("点击音效播放失败（可忽略）", e);
    }

    // 大厅场景按钮
    if (this.currentScene === config.scene.LOBBY) {
      if (key === "joinRoom") {
        if (!this.inputValue.roomId) {
          wx.showToast({ title: "请输入房间号", icon: "none" });
          return;
        }
        const res = await room.joinRoom(this.inputValue.roomId, this.inputValue.password);
        if (res.success) {
          // ✅ 【必须加】给全局room对象赋值
          room.roomId = res.roomId;
          room.roomData = res.roomData;
          // ✅ 【必须加】启动房间数据实时监听
          room.watchRoomData();
          // 切换场景
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
      // 【修复4】核心：重写创建房间逻辑
      if (key === "confirmCreateRoom") {
        try {
          wx.showLoading({ title: "创建房间中..." });
          
          // 1. 取用户选的人数
          const selectedMaxPlayers = config.room?.defaultMaxPlayers || 8;

          // 2. 直接调云函数
          const res = await wx.cloud.callFunction({
            name: "createRoom",
            data: {
              name: this.inputValue.roomName || `${player.userInfo?.nickName || "我的"}的房间`,
              maxPlayers: selectedMaxPlayers,
              password: "",
              nickName: player.userInfo?.nickName || "玩家",
              avatarUrl: player.userInfo?.avatarUrl || ""
            }
          });

          wx.hideLoading();
          // 3. 正确取云函数返回值
          const result = res.result;

          if (result.success) {
            console.log("✅ 创建房间成功", result);
            
            // 4. 【核心】给全局room对象赋值
            room.roomId = result.roomId;
            room.roomData = result.roomData;
            
            // 5. 启动实时监听
            room.watchRoomData();
            
            // 6. 切换场景
            this.currentScene = config.scene.ROOM;
          } else {
            wx.showToast({ title: result.msg || "创建失败", icon: "none" });
          }
        } catch (err) {
          wx.hideLoading();
          console.error("❌ 创建房间报错", err);
          wx.showToast({ title: "创建房间失败", icon: "none" });
        }
      }
      // 【修复5】人数选择，加UI刷新
      if (key.startsWith("setPlayerNum_")) {
        const num = parseInt(key.split("_")[1]);
        if (!config.room) config.room = {};
        config.room.defaultMaxPlayers = num;
        this.render(); // 必须刷新UI
      }
      // 模式选择，加UI刷新
      if (key.startsWith("setMode_")) {
        const mode = key.split("_")[1].toLowerCase();
        if (!config.room) config.room = {};
        config.room.defaultMode = mode;
        this.render(); // 必须刷新UI
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