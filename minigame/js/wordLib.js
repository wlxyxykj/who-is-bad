import cloud from "./cloud.js";

/**
 * 词库管理模块
 */
class WordLibManager {
  constructor() {
    this.wordList = []; // 全量词库
  }

  // 初始化加载词库
  async init() {
    const words = await cloud.getWords();
    this.wordList = words;
    return words;
  }

  // 随机抽取一组词语
  getRandomWord(category = null, difficulty = null) {
    let filterList = this.wordList;
    if (category) filterList = filterList.filter(w => w.category === category);
    if (difficulty) filterList = filterList.filter(w => w.difficulty === difficulty);
    
    if (filterList.length === 0) filterList = this.wordList;
    const randomIndex = Math.floor(Math.random() * filterList.length);
    return filterList[randomIndex];
  }

  // 按分类获取词库
  getWordsByCategory(category) {
    return this.wordList.filter(w => w.category === category);
  }

  // 按难度获取词库
  getWordsByDifficulty(difficulty) {
    return this.wordList.filter(w => w.difficulty === difficulty);
  }
}

// 单例导出
export default new WordLibManager();