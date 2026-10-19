/* 中文 for TT Gomoku: the words on the page, the toasts, the canvas word bursts and the ? panel (Kit.lang, from
   kit/lang.js). Simple words: Tommy is 5. The kids' and friends' names and the game's own name stay English. */
(function () {
  const L = Kit.lang;
  L.keep(['TT Gomoku', 'TT', 'Gomoku', 'TEDDY', 'TOMMY', 'BOLT', 'BRUNO', 'Teddy', 'Tommy', 'Esc', 'Enter', 'Space']);

  L.add({
    // the menu
    'FIVE IN A ROW WINS!': '五子棋：五个连成一线就赢！',
    LITTLE: '小棋盘', BIG: '大棋盘', CLASSIC: '标准棋盘',
    'Little board, 9 by 9': '小棋盘，9 × 9', 'Big board, 13 by 13': '大棋盘，13 × 13', 'Classic board, 15 by 15': '标准棋盘，15 × 15',
    '1 PLAYER': '1 人玩', '2 PLAYERS': '2 人玩', 'Players': '几个人玩', 'Who are you?': '你是谁？', 'Level': '难度',
    UNDO: '悔棋', 'Undo button on or off (U)': '悔棋按钮 开 / 关 (U)', 'Undo button on or off': '悔棋按钮 开 / 关',
    'EXACTLY 5': '正好五个', "Only exactly five wins: six in a row doesn't count (F)": '只有正好五个才算赢：六个连在一起不算 (F)',
    'Only exactly five wins': '只有正好五个才算赢',
    // while playing
    'Pause': '暂停', 'Pause (P)': '暂停 (P)', 'Undo': '悔棋', 'Undo (U)': '悔棋 (U)', 'Sound (M)': '声音 (M)', 'Sound on or off': '声音 开 / 关',
    'Call your brother': '叫兄弟来帮忙', 'High five!': '击掌！', 'High five! (T)': '击掌！(T)', 'HIGH FIVE! 🙌': '击掌！🙌',
    'YOUR TURN!': '轮到你啦！', 'DRAW!': '平局！', '↩️ UNDO!': '↩️ 悔棋！',
    // game over, pause
    'Home': '主页', 'Play again': '再玩一次', 'PLAY AGAIN': '再玩一次', 'Keep playing': '继续玩', 'New game': '新的一局',
    // canvas word bursts over the board (js/fx.js draws them through Kit.lang.t)
    'NICE!': '好棋！', 'BLOCKED!': '堵住了！', 'SUPER!': '太棒了！', 'FOUR!': '四个啦！',
    // the ? panel (js/keys.js)
    'move round the board · put your stone there': '在棋盘上移动 · 在这里落子',
    'undo one move': '悔一步棋',
    'call your brother (2 players: high five)': '叫兄弟来帮忙（2 人玩：击掌）',
    'new game': '新的一局',
    'menu: LITTLE 9 × 9 · BIG 13 × 13 · CLASSIC 15 × 15': '菜单：小棋盘 9 × 9 · 大棋盘 13 × 13 · 标准棋盘 15 × 15',
    'menu: Teddy or Tommy · 1 or 2 players · level': '菜单：Teddy 还是 Tommy · 1 人或 2 人 · 难度',
    'menu: undo button on or off · EXACTLY 5': '菜单：悔棋按钮 开 / 关 · 正好五个',
    "Take turns putting a stone on a point. Five in a row wins: across, down or corner to corner. Teddy has the dark blue stones 🏀, Tommy the cream ones ✌️. EXACTLY 5: six in a row doesn't count.":
      '轮流把棋子放在交叉点上。五个连成一线就赢：横着、竖着、斜着都行。Teddy 是深蓝色的黑子 🏀，Tommy 是奶油色的白子 ✌️。正好五个：六个连在一起不算。',
    "Press a point to see your stone, slide to move it, let go to put it down. Tap your brother's face (bottom right) to call him.":
      '按住一个点就能看到你的棋子，滑动可以换位置，松手就落子。点右下角兄弟的头像，叫他来帮忙。',
  });

  const TREAT = { 'ICE CREAM': '冰淇淋', WATER: '水', 'JUICE BOX': '果汁', COOKIE: '饼干', WATERMELON: '西瓜', BANANA: '香蕉' };
  L.rule(/^Call (\S+) \(T\)$/, '叫 $1 (T)');
  L.rule(/^Call (\S+)$/, '叫 $1');
  L.rule(/^(\S+)'S HERE!$/, '$1 来啦！');
  L.rule(/^(\S+) SAYS: HERE!$/, '$1 说：下这里！');
  L.rule(/^(\S+) SAYS: WIN HERE!$/, '$1 说：下这里就赢啦！');
  L.rule(/^(\S+) SAYS: BLOCK HERE!$/, '$1 说：快堵这里！');
  L.rule(/^(\S+) IS THINKING…$/, '$1 在想…');
  L.rule(/^(\S+)'S TURN!$/, '轮到 $1！');
  L.rule(/^(\S+) WINS!$/, '$1 赢啦！');
  L.rule(/^(\S+) (ICE CREAM|WATER|JUICE BOX|COOKIE|WATERMELON|BANANA) FROM (\S+)!$/, (m, emoji, item, who) => `${emoji} ${who} 给你${TREAT[item]}！`);
})();
