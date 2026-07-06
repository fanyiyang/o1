// Bilingual UI strings (zh / en). `t(key, ...args)` looks up the current
// language; dictionary values may be functions taking interpolation args.
// Language priority: ?lang= URL param > localStorage > browser language.

const zh = {
  appTitle: '🧀 奶酪大盗',
  nickPh: '你的昵称',
  createRoom: '创建房间',
  or: '或',
  codePh: '房间号（如 CHS-7K2）',
  joinRoomBtn: '加入房间',
  homeHint: '4–8 人 · 可用内置语音或自行开语音沟通',
  enterNick: '请先输入昵称',
  enterCode: '请输入房间号',
  creating: '正在创建房间…',
  createFailRetry: '创建房间失败，请重试',
  createFail: (e) => `创建房间失败（${e}），请重试`,
  connecting: '正在连接房间…',
  connectFail: (e) => `连接失败（${e}），请检查房间号后重试`,
  connectedWait: '已连接，等待房主开始…',
  reconnecting: '🔄 连接中断，正在重连…',
  disconnectedRejoin: (code) => `与房主断开连接，可重新加入房间号：${code}`,
  rejectedInPlay: '游戏进行中，请等本局结束再加入',
  rejectedFull: '房间已满（最多 8 人）',
  cannotJoin: '无法加入房间',
  leftRoom: (who) => `${who} 离开了房间`,

  roomCodeLabel: '房间号',
  copyLink: '📋 复制房间号链接',
  copied: '已复制 ✓ 发给朋友',
  lobbyShareHint: '把房间号（或链接）发给朋友，4–8 人即可开始',
  peekRule: '偷看规则',
  on: '开',
  off: '关',
  mode4p: '官方 4 人变体：每人 2 颗骰子 · 无偷看 · 无共犯',
  mode5plus: (n, tc) => `官方 ${n} 人局：每人 1 颗骰子 · 独自睁眼可偷看 · ${tc} 名共犯`,
  modeGeneric: '官方规则：4 人＝2 骰无偷看；5–8 人＝1 骰可偷看＋共犯',
  startGameBtn: '开始游戏',
  joinedCount: (n, min, max) => `已加入 ${n} 人（需 ${min}–${max} 人）`,
  youSuffix: '（你）',
  dcSuffix: ' · 📵 掉线重连中…',

  yourRole: '你的身份',
  roleThief: '奶酪大盗',
  roleMouse: '睡鼠',
  yourDice: '你的骰子：',
  keepSecret: '记住身份，别让别人看到你的屏幕',
  toNight: '进入夜晚 🌙',
  thiefTwoNights: (a, b) =>
    `🧀 你会在 <b>第 ${a} 晚</b> 和 <b>第 ${b} 晚</b> 各睁眼一次，到时由你<b>挑其中一晚</b>拿走奶酪（拿的时候可能被同晚睁眼的人看到）。`,
  thiefOneNight: (n) => `🧀 你只会在 <b>第 ${n} 晚</b> 睁眼，那一晚拿走奶酪。`,
  mouseOneNight: (n) => `🐭 你会在 <b>第 ${n} 晚</b> 睁眼。`,
  chosenNight: (n) => `已选：第 ${n} 晚 睁眼`,
  choosePrompt: '🐭 选择你要睁眼的那一晚：',
  nightBtn: (n) => `第 ${n} 晚`,
  allChosen: '大家都选好了，可以进入夜晚',
  waitingChoose: (c, total) => `等待大家选择… ${c}/${total}`,
  chosenWait: '已选好，等待房主开始…',

  nightCounter: (n) => `🌙 第 ${n} 晚 / 6`,
  nightFalling: '🌙 天黑请闭眼…',
  introCaption: '🧀 奶酪在这里…准备数夜，看谁会偷走它',
  awakeWith: (names) => `👀 你睁眼了 · 同晚醒来：${names.join('、')}`,
  awakeAlone: '👀 你睁眼了 · 这一晚只有你',
  sawTheftSuffix: (name) => ` ｜ 🧀 你看到 ${name} 拿走了奶酪！`,
  cheeseGoneSuffix: ' ｜ 🧀 中间的奶酪已经不见了',
  sleepingUpcoming: (nights) => `😴 你在睡觉…你会在第 ${nights.join('、')} 晚睁眼`,
  sleepingWait: '😴 你在睡觉…静待天亮',
  youStole: '🧀 你拿走了奶酪！',
  youStoleHint: '同一晚睁眼的人会看到是你拿的。白天可以撒谎。',
  stoleEarlier: '🧀 奶酪已在你手上 · 这一晚你也睁着眼',
  heldTitle: '你忍住了 · 留到下一晚再偷 🧀',
  stealChoiceTitle: (later) => `🧀 你睁眼了 · 现在偷还是留到第 ${later} 晚？`,
  warnOthers: (n) => `⚠️ 今晚还有 ${n} 人睁着眼，现在偷会被他们看见。`,
  warnAlone: '✅ 今晚只有你睁眼，现在偷最安全。',
  stealNow: (n) => `现在就偷（第 ${n} 晚）`,
  holdUntil: (later) => `忍住，留到第 ${later} 晚再偷`,
  lastChanceTitle: '🧀 最后机会 · 拿走奶酪',
  stealBtn: '偷走奶酪',
  lastChanceHint: '这是你唯一/最后的睁眼之夜，必须在今晚拿走。',
  peekPrompt: '🔍 点桌上一个人的头像，偷看他的一颗骰子',
  skipPeek: '装睡（不看）',
  chosePass: '你选择了不看 😴',
  peeking: '正在偷看… 🔍',
  recognize: '你和别人同一晚睁眼 · 记住他们 😳',
  recognizeAlone: '这一晚只有你睁眼 · 静静观察 😌',
  peekResult: (name, face, die) => `🔍 ${name} 的其中一颗骰子是 ${face} ${die}`,
  peekResultHint: '随机看到的一颗（对方有两颗）。记住它。',
  peekResultOne: (name, face, die) => `🔍 ${name} 的骰子是 ${face} ${die}`,
  peekResultHintOne: (die) => `TA 会在第 ${die} 晚睁眼。记住它。`,

  deepNight: '🌙 深夜',
  thiefPicking: '🌙 奶酪大盗正在挑选共犯…',
  pickTitle: (count) => `🤝 大盗，挑选 ${count} 名共犯（与你共享胜利）`,
  confirm: '确认',
  pickedWait: '🤝 已选好，天就要亮了…',
  yourAllies: (names) => `🤝 你的共犯：${names.join('、')}`,
  traitorTitle: '🤝 你被招募为共犯！与奶酪大盗共享胜利',
  thiefIs: (name) => `大盗是：${name}`,
  fellowsAre: (names) => `其他共犯：${names.join('、')}`,
  dontKnowThief: '你不知道大盗是谁，护好彼此。',

  dayLabel: '☀️ 白天 · 讨论',
  cheeseGoneBanner: '🧀 天亮了——奶酪不见了！！！',
  dayTraitorCard: (knows, thief, fellows) =>
    `🤝 你是共犯${knows && thief ? '，大盗：' + thief : ''}${fellows && fellows.length ? '，同伙：' + fellows.join('、') : ''}`,
  dayAlliesCard: (names) => `🤝 你的共犯：${names.join('、')}`,
  privateClue: '🔍 你的私密线索：',
  dayHintDefault: '开语音讨论后投票。',
  dayHintHost: '开语音讨论，聊完后点下方「开始投票」。',
  dayHintClient: '开语音讨论，等房主点「开始投票」。',
  startVote: '开始投票 🗳️',

  whoIsThief: '🗳️ 谁是奶酪大盗？',
  confirmVote: '确认投票',
  forceResolve: '结束投票并结算',
  votedWait: '你已投票，等待其他人…',
  voteProgress: (d, total) => `已投票 ${d}/${total}`,
  waitingOthers: ' · 等待其他人…',
  voteDcSuffix: '（掉线中）',

  winSleepy: '🐭 睡鼠阵营胜利！',
  winThiefCamp: '🧀 大盗阵营胜利！',
  winThief: '🧀 奶酪大盗胜利！',
  tiedAllOut: '⚖️ 平票，全部出局 · ',
  nameWithRole: (name, label) => `${name}（${label}）`,
  elimList: (names) => `出局：${names.join('、')}`,
  noElim: '无人出局',
  labelThief: '🧀 大盗',
  labelTraitor: '🤝 背叛者',
  labelMouse: '🐭 睡鼠',
  thPlayer: '玩家',
  thRole: '身份',
  thDice: '骰子',
  thVotes: '得票',
  replay: '再来一局 🔄',
  hostNextHint: '（房主开始下一局，身份重新分配）',
  clientNextHint: '等待房主开始下一局…',
  abortedDefault: '本局作废，等待房主重开',
  thiefLeft: '🧀 大盗掉线了，本局作废，请房主重开',
  tooFew: '人数不足（少于 4 人），本局作废',

  rulesBtn: '❓ 规则',
  rulesTitle_: '查看规则',
  rTitle: '🧀 奶酪大盗 · 规则（官方）',
  rMeta: (n, four) => `${n} 人 · ${four ? '4 人变体：每人 2 颗骰子，无偷看' : `${n} 人局：每人 1 颗骰子，独自睁眼可偷看`}`,
  rGoal: '<b>目标</b>：找出奶酪大盗。投出大盗 → 🐭 睡鼠阵营赢；投错（投出睡鼠/共犯）→ 🧀 大盗阵营赢。',
  rRoles: (n, dice) => `<b>身份</b>：${n} 人 = <b>1</b> 名奶酪大盗 + <b>${n - 1}</b> 名睡鼠。每人秘密拿到身份和 ${dice} 颗骰子。`,
  rNight: (four) =>
    '<b>夜晚</b>：从「第1晚」数到「第6晚」，每晚约 10 秒。你骰子的点数 = 你睁眼的那一晚。' +
    (four ? '两颗点数不同的睡鼠，自己挑一晚睁眼。' : '') +
    '同一晚睁眼的人会互相看到对方睁眼。',
  rThief: (four) =>
    '<b>奶酪大盗</b>：在自己睁眼的那晚<b>必须</b>拿走奶酪，即使有人同晚睁眼看着' +
    (four ? '（两晚点数不同可睁眼两次，自己挑其中一晚拿）' : '') +
    '——同晚睁眼的人会看到是他拿的（关键线索）。',
  rPeek: '<b>偷看</b>：若你（睡鼠）某晚<b>独自</b>睁眼，可点桌上一个人的头像，偷看他的骰子点数。',
  rNoPeek: '<b>无偷看</b>：4 人变体中，独自睁眼的睡鼠<b>不可以</b>偷看别人的点数。',
  rDay: '<b>白天</b>：自由讨论、推理、诈唬——但不可展示自己的身份和点数（内置语音或自备）。',
  rVote: '<b>投票</b>：所有人同时投票，得票最多者出局并翻牌；<b>平票则全部出局</b>。',
  rTraitor: (n, tc) =>
    `<b>共犯</b>：${n} 人局有 <b>${tc}</b> 名共犯（与大盗共享胜利）。` +
    (n === 5
      ? '大盗睁眼那晚，与其同晚睁眼的玩家<b>当场</b>成为共犯（多人同晚时由大盗当场指定一人；无人同晚则本局无共犯）。'
      : n === 6
        ? '数完第 6 晚后，大盗再次睁眼挑选 1 名共犯，两人相认。'
        : n === 7
          ? '数完第 6 晚后，大盗挑选 2 名共犯；两名共犯彼此相认，但<b>不知道</b>大盗是谁。'
          : '数完第 6 晚后，大盗挑选 2 名共犯，三人相认。'),
  rTraitorNote: '投出共犯也算大盗阵营获胜——要找的是大盗本人。',
  rNoTraitor: '4 人变体没有共犯。',
  gotIt: '知道了',

  skyNight: '🌙 天黑了',
  skyDay: '☀️ 天亮了',

  myLog: '📜 我的记录',
  myLogTitle_: '我的记录',
  logEmpty: '本局还没有和你相关的记录',
  logRole: (isThief, dice) => `🎭 身份：${isThief ? '🧀 奶酪大盗' : '🐭 睡鼠'}（骰子 ${dice}）`,
  logWake: (night, others, gone) => {
    const who = others.length ? `（同晚：${others.join('、')}）` : '（只有你）';
    return `🌙 第 ${night} 晚你睁眼${who}——奶酪${gone ? '已经不见了！' : '还在桌上 🧀'}`;
  },
  logTook: '🧀 你拿走了奶酪！',
  logSawTheft: (night, name) => `👀 第 ${night} 晚你看见 ${name} 拿走了奶酪！`,
  logPeek: (name, face, die) => `🔍 你偷看 ${name}：${face} ${die}`,
  logTraitor: (knows, thief, fellows) => {
    let line = '🤝 你被招募为共犯';
    if (knows && thief) line += `，大盗是 ${thief}`;
    if (fellows && fellows.length) line += `，同伙：${fellows.join('、')}`;
    return line;
  },
  logDawn: '☀️ 天亮了——奶酪不见了！！！',
  logResult: (win, elim) => `🏁 ${win} ｜ ${elim}`,

  micOff: '点开麦克风语音',
  micNight: '夜晚已自动静音',
  micOn: '语音开启中（点关闭）',
  camOff: '点开摄像头（白天显示画面）',
  camHidden: '此阶段画面自动隐藏',
  camOn: '摄像头开启中（点关闭）',
  selfLabel: '你',
  vidSize: '画面大小',
  vidSmaller_: '画面变小',
  vidBigger_: '画面变大',
};

const en = {
  appTitle: '🧀 Cheese Thief',
  nickPh: 'Your nickname',
  createRoom: 'Create Room',
  or: 'or',
  codePh: 'Room code (e.g. CHS-7K2)',
  joinRoomBtn: 'Join Room',
  homeHint: '4–8 players · built-in voice chat, or bring your own',
  enterNick: 'Enter a nickname first',
  enterCode: 'Enter a room code',
  creating: 'Creating room…',
  createFailRetry: 'Failed to create the room, please retry',
  createFail: (e) => `Failed to create the room (${e}), please retry`,
  connecting: 'Connecting to room…',
  connectFail: (e) => `Connection failed (${e}) — check the room code and retry`,
  connectedWait: 'Connected. Waiting for the host to start…',
  reconnecting: '🔄 Connection lost, reconnecting…',
  disconnectedRejoin: (code) => `Disconnected from the host. Rejoin with room code: ${code}`,
  rejectedInPlay: 'A round is in progress — join when it ends',
  rejectedFull: 'Room is full (8 players max)',
  cannotJoin: 'Could not join the room',
  leftRoom: (who) => `${who} left the room`,

  roomCodeLabel: 'Room code',
  copyLink: '📋 Copy invite link',
  copied: 'Copied ✓ send it to friends',
  lobbyShareHint: 'Share the code (or link) with friends — 4–8 players to start',
  peekRule: 'Peek rule',
  on: 'On',
  off: 'Off',
  mode4p: 'Official 4-player variant: 2 dice each · no peeking · no accomplices',
  mode5plus: (n, tc) => `Official ${n}-player game: 1 die each · peek when awake alone · ${tc} accomplice${tc > 1 ? 's' : ''}`,
  modeGeneric: 'Official rules: 4p = 2 dice, no peek; 5–8p = 1 die, peek + accomplices',
  startGameBtn: 'Start Game',
  joinedCount: (n, min, max) => `${n} joined (need ${min}–${max})`,
  youSuffix: ' (you)',
  dcSuffix: ' · 📵 reconnecting…',

  yourRole: 'Your identity',
  roleThief: 'Cheese Thief',
  roleMouse: 'Sleepyhead',
  yourDice: 'Your dice: ',
  keepSecret: 'Memorize it — don’t let anyone see your screen',
  toNight: 'Begin the night 🌙',
  thiefTwoNights: (a, b) =>
    `🧀 You will wake on <b>night ${a}</b> and <b>night ${b}</b>. <b>Pick one of them</b> to take the cheese (anyone awake that night may see you do it).`,
  thiefOneNight: (n) => `🧀 You wake only on <b>night ${n}</b> — take the cheese then.`,
  mouseOneNight: (n) => `🐭 You will wake on <b>night ${n}</b>.`,
  chosenNight: (n) => `Chosen: wake on night ${n}`,
  choosePrompt: '🐭 Choose the night you will wake:',
  nightBtn: (n) => `Night ${n}`,
  allChosen: 'Everyone has chosen — ready for the night',
  waitingChoose: (c, total) => `Waiting for choices… ${c}/${total}`,
  chosenWait: 'Chosen. Waiting for the host to start…',

  nightCounter: (n) => `🌙 Night ${n} / 6`,
  nightFalling: '🌙 Night falls, close your eyes…',
  introCaption: '🧀 The cheese is here… count the nights and see who steals it',
  awakeWith: (names) => `👀 You are awake · also awake: ${names.join(', ')}`,
  awakeAlone: '👀 You are awake · you are the only one tonight',
  sawTheftSuffix: (name) => ` | 🧀 You saw ${name} take the cheese!`,
  cheeseGoneSuffix: ' | 🧀 The cheese in the middle is gone',
  sleepingUpcoming: (nights) => `😴 You are asleep… you wake on night ${nights.join(', ')}`,
  sleepingWait: '😴 You are asleep… waiting for dawn',
  youStole: '🧀 You took the cheese!',
  youStoleHint: 'Anyone awake this night saw you take it. Lie freely by day.',
  stoleEarlier: '🧀 The cheese is already yours · you are awake again tonight',
  heldTitle: 'You held back · steal on a later night 🧀',
  stealChoiceTitle: (later) => `🧀 You are awake · steal now, or wait for night ${later}?`,
  warnOthers: (n) => `⚠️ ${n} other player${n > 1 ? 's are' : ' is'} awake tonight — stealing now will be seen.`,
  warnAlone: '✅ You are alone tonight — stealing now is safest.',
  stealNow: (n) => `Steal now (night ${n})`,
  holdUntil: (later) => `Hold — steal on night ${later}`,
  lastChanceTitle: '🧀 Last chance · take the cheese',
  stealBtn: 'Steal the cheese',
  lastChanceHint: 'This is your only/last waking night — you must take it now.',
  peekPrompt: '🔍 Tap someone’s avatar to peek at one of their dice',
  skipPeek: 'Pretend to sleep (don’t look)',
  chosePass: 'You chose not to look 😴',
  peeking: 'Peeking… 🔍',
  recognize: 'You woke on the same night as others · remember them 😳',
  recognizeAlone: 'You are the only one awake tonight · just watch 😌',
  peekResult: (name, face, die) => `🔍 One of ${name}’s dice is ${face} ${die}`,
  peekResultHint: 'One die revealed at random (they have two). Remember it.',
  peekResultOne: (name, face, die) => `🔍 ${name}’s die is ${face} ${die}`,
  peekResultHintOne: (die) => `They wake on night ${die}. Remember it.`,

  deepNight: '🌙 Deep night',
  thiefPicking: '🌙 The Cheese Thief is choosing accomplices…',
  pickTitle: (count) => `🤝 Thief, pick ${count} accomplice${count > 1 ? 's' : ''} (they share your victory)`,
  confirm: 'Confirm',
  pickedWait: '🤝 Chosen. Dawn is coming…',
  yourAllies: (names) => `🤝 Your accomplices: ${names.join(', ')}`,
  traitorTitle: '🤝 You were recruited as an accomplice! You share the thief’s victory',
  thiefIs: (name) => `The thief is: ${name}`,
  fellowsAre: (names) => `Fellow accomplices: ${names.join(', ')}`,
  dontKnowThief: 'You don’t know who the thief is — protect each other.',

  dayLabel: '☀️ Day · Discussion',
  cheeseGoneBanner: '🧀 Morning — the cheese is GONE!!!',
  dayTraitorCard: (knows, thief, fellows) =>
    `🤝 You are an accomplice${knows && thief ? ' — thief: ' + thief : ''}${fellows && fellows.length ? ' — fellows: ' + fellows.join(', ') : ''}`,
  dayAlliesCard: (names) => `🤝 Your accomplices: ${names.join(', ')}`,
  privateClue: '🔍 Your private clue:',
  dayHintDefault: 'Discuss on voice, then vote.',
  dayHintHost: 'Discuss on voice, then tap “Start the vote” below.',
  dayHintClient: 'Discuss on voice and wait for the host to start the vote.',
  startVote: 'Start the vote 🗳️',

  whoIsThief: '🗳️ Who is the Cheese Thief?',
  confirmVote: 'Confirm vote',
  forceResolve: 'Close the vote & resolve',
  votedWait: 'Vote cast — waiting for the others…',
  voteProgress: (d, total) => `Votes in: ${d}/${total}`,
  waitingOthers: ' · waiting for others…',
  voteDcSuffix: ' (offline)',

  winSleepy: '🐭 The Sleepyheads win!',
  winThiefCamp: '🧀 The Thief’s side wins!',
  winThief: '🧀 The Cheese Thief wins!',
  tiedAllOut: '⚖️ Tie — everyone tied is out · ',
  nameWithRole: (name, label) => `${name} (${label})`,
  elimList: (names) => `Eliminated: ${names.join(', ')}`,
  noElim: 'No one was eliminated',
  labelThief: '🧀 Thief',
  labelTraitor: '🤝 Accomplice',
  labelMouse: '🐭 Sleepyhead',
  thPlayer: 'Player',
  thRole: 'Role',
  thDice: 'Dice',
  thVotes: 'Votes',
  replay: 'Play again 🔄',
  hostNextHint: '(The host starts the next round; roles are re-dealt)',
  clientNextHint: 'Waiting for the host to start the next round…',
  abortedDefault: 'Round voided — waiting for the host to restart',
  thiefLeft: '🧀 The thief disconnected — round voided, host please restart',
  tooFew: 'Not enough players (fewer than 4) — round voided',

  rulesBtn: '❓ Rules',
  rulesTitle_: 'View the rules',
  rTitle: '🧀 Cheese Thief · Rules (official)',
  rMeta: (n, four) => `${n} players · ${four ? '4-player variant: 2 dice each, no peeking' : `${n}-player game: 1 die each, peek when alone`}`,
  rGoal: '<b>Goal</b>: find the Cheese Thief. Vote the thief out → 🐭 Sleepyheads win; vote wrong (a sleepyhead/accomplice) → 🧀 the thief’s side wins.',
  rRoles: (n, dice) => `<b>Roles</b>: ${n} players = <b>1</b> Cheese Thief + <b>${n - 1}</b> Sleepyheads. Everyone secretly gets a role and ${dice} ${dice > 1 ? 'dice' : 'die'}.`,
  rNight: (four) =>
    '<b>Nights</b>: the game counts night 1 through 6, about 10 seconds each. Your die value = the night you wake. ' +
    (four ? 'A sleepyhead with two different values picks which night to wake. ' : '') +
    'Players awake on the same night see each other.',
  rThief: (four) =>
    '<b>The thief</b>: <b>must</b> take the cheese on a night it is awake, even if others are watching' +
    (four ? ' (if awake twice, it picks which night)' : '') +
    '. Anyone awake that night sees who took it — the key clue.',
  rPeek: '<b>Peek</b>: if you (a sleepyhead) wake <b>alone</b>, you may tap someone’s avatar to see their die.',
  rNoPeek: '<b>No peeking</b>: in the 4-player variant, a lone-waking sleepyhead may <b>not</b> peek.',
  rDay: '<b>Day</b>: discuss, deduce and bluff — but never show your role or dice (voice built-in or your own).',
  rVote: '<b>Vote</b>: everyone votes at once. Most votes is eliminated and revealed; <b>a tie eliminates everyone tied</b>.',
  rTraitor: (n, tc) =>
    `<b>Accomplices</b>: a ${n}-player game has <b>${tc}</b> accomplice${tc > 1 ? 's' : ''} (they share the thief’s victory). ` +
    (n === 5
      ? 'On the thief’s waking night, whoever is awake with it becomes an accomplice <b>on the spot</b> (if several, the thief picks one then; if none, there’s no accomplice this round).'
      : n === 6
        ? 'After night 6 the thief wakes again and picks 1 accomplice; the two recognize each other.'
        : n === 7
          ? 'After night 6 the thief picks 2 accomplices; the two know each other but <b>not</b> the thief.'
          : 'After night 6 the thief picks 2 accomplices; all three recognize each other.'),
  rTraitorNote: 'Voting out an accomplice still counts as a win for the thief’s side — you must catch the thief.',
  rNoTraitor: 'The 4-player variant has no accomplices.',
  gotIt: 'Got it',

  skyNight: '🌙 Night falls',
  skyDay: '☀️ Morning comes',

  myLog: '📜 My log',
  myLogTitle_: 'My log',
  logEmpty: 'Nothing has happened to you yet this round',
  logRole: (isThief, dice) => `🎭 Role: ${isThief ? '🧀 Cheese Thief' : '🐭 Sleepyhead'} (dice ${dice})`,
  logWake: (night, others, gone) => {
    const who = others.length ? ` (also awake: ${others.join(', ')})` : ' (alone)';
    return `🌙 Night ${night}: you woke${who} — the cheese was ${gone ? 'already gone!' : 'still there 🧀'}`;
  },
  logTook: '🧀 You took the cheese!',
  logSawTheft: (night, name) => `👀 Night ${night}: you saw ${name} take the cheese!`,
  logPeek: (name, face, die) => `🔍 You peeked at ${name}: ${face} ${die}`,
  logTraitor: (knows, thief, fellows) => {
    let line = '🤝 You were recruited as an accomplice';
    if (knows && thief) line += ` — the thief is ${thief}`;
    if (fellows && fellows.length) line += ` — fellows: ${fellows.join(', ')}`;
    return line;
  },
  logDawn: '☀️ Morning — the cheese is gone!!!',
  logResult: (win, elim) => `🏁 ${win} | ${elim}`,

  micOff: 'Turn on the microphone',
  micNight: 'Auto-muted for the night',
  micOn: 'Mic is on (tap to turn off)',
  camOff: 'Turn on the camera (video shows by day)',
  camHidden: 'Video auto-hidden during this phase',
  camOn: 'Camera is on (tap to turn off)',
  selfLabel: 'You',
  vidSize: 'Video size',
  vidSmaller_: 'Smaller video',
  vidBigger_: 'Bigger video',
};

const DICTS = { zh, en };

function detect() {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (q && DICTS[q]) {
      localStorage.setItem('lang', q);
      return q;
    }
    const s = localStorage.getItem('lang');
    if (s && DICTS[s]) return s;
  } catch (e) {}
  return ((navigator.language || 'zh').toLowerCase().startsWith('zh')) ? 'zh' : 'en';
}

let lang = detect();

export const getLang = () => lang;

export function setLang(l) {
  if (!DICTS[l]) return;
  lang = l;
  try { localStorage.setItem('lang', l); } catch (e) {}
  applyStatic();
}

export function t(key, ...args) {
  let v = DICTS[lang][key];
  if (v === undefined) v = DICTS.zh[key];
  if (typeof v === 'function') return v(...args);
  return v === undefined ? key : v;
}

// Fill every element tagged data-i18n / data-i18n-ph / data-i18n-title.
export function applyStatic() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
  const toggle = document.getElementById('lang-btn');
  if (toggle) toggle.textContent = lang === 'zh' ? '🌐 EN' : '🌐 中文';
}
