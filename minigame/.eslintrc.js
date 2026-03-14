module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
    'wx/game': true // 开启微信小游戏环境识别
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module'
  },
  rules: {
    // 关闭所有可能引起报错的格式规则
    'no-console': 'off',
    'no-unused-vars': 'warn', // 未使用的变量只警告，不报错
    'semi': 'off', // 关闭分号检查
    'comma-dangle': 'off', // 关闭尾逗号检查
    'quotes': 'off', // 关闭引号检查
    'indent': 'off' // 关闭缩进检查
  },
  globals: {
    wx: true // 声明 wx 为全局变量，避免报错
  }
};