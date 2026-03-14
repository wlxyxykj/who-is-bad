import config from "./config.js";

/**
 * 工具函数集合
 */
const utils = {
  /**
   * 生成6位随机房间号
   */
  generateRoomId: function () {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  /**
   * 随机打乱数组（洗牌算法）
   */
  shuffleArray: function (arr) {
    const newArr = arr.slice();
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = newArr[i];
      newArr[i] = newArr[j];
      newArr[j] = temp;
    }
    return newArr;
  },

  /**
   * 倒计时类（可暂停、重置）
   */
  CountdownTimer: function () {
    /**
     * 倒计时构造函数
     * @param {number} totalSeconds - 总秒数
     * @param {function} onTick - 每秒回调
     * @param {function} onEnd - 结束回调
     */
    function Timer(totalSeconds, onTick, onEnd) {
      this.totalSeconds = totalSeconds;
      this.remainingSeconds = totalSeconds;
      this.onTick = onTick;
      this.onEnd = onEnd;
      this.timer = null;
      this.isRunning = false;
    }

    // 开始倒计时
    Timer.prototype.start = function () {
      var self = this;
      if (self.isRunning) return;
      self.isRunning = true;
      self.timer = setInterval(function () {
        self.remainingSeconds--;
        if (self.onTick) {
          self.onTick(self.remainingSeconds);
        }
        
        if (self.remainingSeconds <= 0) {
          self.stop();
          if (self.onEnd) {
            self.onEnd();
          }
        }
      }, 1000);
    };

    // 停止倒计时
    Timer.prototype.stop = function () {
      clearInterval(this.timer);
      this.isRunning = false;
    };

    // 重置倒计时
    Timer.prototype.reset = function (newTotalSeconds) {
      this.stop();
      this.remainingSeconds = newTotalSeconds || this.totalSeconds;
    };

    return Timer;
  },

  /**
   * 音频播放封装
   */
  audio: {
    // 缓存音频实例
    audioCache: {},

    /**
     * 播放音频
     * @param {string} src - 音频路径
     * @param {boolean} loop - 是否循环
     */
    play: function (src, loop) {
      if (!loop) loop = false;
      
      if (!this.audioCache[src]) {
        this.audioCache[src] = wx.createInnerAudioContext();
        this.audioCache[src].src = src;
      }
      var audio = this.audioCache[src];
      audio.loop = loop;
      audio.play();
      audio.onError(function (err) {
        console.log("音频播放失败", err);
      });
    },

    /**
     * 停止音频
     * @param {string} src - 音频路径
     */
    stop: function (src) {
      if (this.audioCache[src]) {
        this.audioCache[src].stop();
      }
    },

    /**
     * 暂停所有音频
     */
    pauseAll: function () {
      var cache = this.audioCache;
      Object.keys(cache).forEach(function (key) {
        cache[key].pause();
      });
    }
  },

  /**
   * 坐标判断：判断点击是否在矩形区域内
   */
/**
 * 坐标判断：判断点击是否在矩形区域内
 */
isPointInRect: function (point, rect) {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
},

  /**
   * 文本适配：截断超长文本
   */
  truncateText: function (text, maxLength) {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  },

  /**
   * 时间格式化：秒转 mm:ss
   */
// 格式化倒计时：秒数 → mm:ss
formatTime: function (seconds) {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const min = Math.floor(seconds / 60).toString().padStart(2, "0");
  const sec = (seconds % 60).toString().padStart(2, "0");
  return `${min}:${sec}`;
},
};

export default utils;