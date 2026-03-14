import config from "./js/config.js";
import ui from "./js/ui.js";
import player from "./js/player.js";
import wordLib from "./js/wordLib.js";
import utils from "./js/utils.js";

// 1. 获取Canvas
const canvas = wx.createCanvas();

// 2. 初始化UI模块
ui.init(canvas);

// 3. 初始化玩家信息和词库
(async () => {
  await player.init();
  await wordLib.init();
  // 播放背景音乐
  utils.audio.play("audio/bgm.mp3", true);
})();

// 4. 游戏主循环
function gameLoop() {
  ui.render();
  requestAnimationFrame(gameLoop);
}

// 启动主循环
gameLoop();

// 5. 处理小游戏生命周期
wx.onShow(() => {
  utils.audio.play("audio/bgm.mp3", true);
});

wx.onHide(() => {
  utils.audio.pauseAll();
});

// // 6. 处理返回键
// wx.onBackPress(() => {
//   if (ui.currentScene !== config.scene.LOBBY) {
//     if (ui.currentScene === config.scene.ROOM || ui.currentScene === config.scene.GAME) {
//       wx.showModal({
//         title: "提示",
//         content: "确定要退出房间吗？",
//         success: async (res) => {
//           if (res.confirm) {
//             await room.exitRoom();
//             gameCore.reset();
//             ui.currentScene = config.scene.LOBBY;
//           }
//         }
//       });
//     } else {
//       ui.currentScene = config.scene.LOBBY;
//     }
//     return true; // 拦截默认返回行为
//   }
//   return false; // 不拦截，退出小游戏
// });