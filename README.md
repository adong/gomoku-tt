# TT Gomoku

[![TT Gomoku title screen](docs/screenshot.jpg)](https://adong.github.io/gomoku-tt/)

Press **?** any time (or tap the round **?** button on the left edge) to see the keys. The game waits while you look.
Tap the language button under it (the A文 icon) to switch between English and 中文; the dashboard and every game remember the choice.

Five in a row on a wooden board in the garden, with Teddy's dark blue stones against Tommy's cream ones: a little 9×9 board, a big 13×13 one or the classic 15×15. 1 or 2 players.

**中文：** 花园里的五子棋：Teddy 的深蓝色黑子对 Tommy 的奶油色白子，五个连成一线就赢！有 9×9 小棋盘、13×13 大棋盘和 15×15 标准棋盘，单人或双人。

A gomoku game starring Teddy and Tommy, built with Claude Code from plain JavaScript and Three.js on the shared Claude Games kit. The board is a thick wooden block on short legs, on a straw mat on the lawn, with a bowl of stones beside each player. There are no image, model or audio files: the boys are the kit's blocky characters, the grid and every texture are painted on a canvas, and every sound is synthesised.

The name is a working title. It lives in one constant, `GMK_TITLE` in `js/title.js`, and the page title, the logo and the ? panel read it from there.

## Play

- **Double-click `index.html`.** It works offline because Three.js and the kit are copied into `kit/`. Without internet the title font falls back to Arial Black.
- **Send one file:** `dist/gomoku-tt.html` is the whole game in one page. AirDrop or email it, then open it in a browser.
- Rebuild that file after any edit: `python3 kit/tools/bundle.py . --name gomoku-tt`

## Rules

- **Take turns putting one stone on an empty point** (where the lines cross). **Teddy is always black** (dark blue stones with a 🏀) and **Tommy is always white** (cream stones with a ✌️).
- **Five in a row wins:** across, down or corner to corner. The five light up with a glowing bar and bounce, the winner does his signature move beside the board (Teddy's boxing combo or his 🏀 jump shot, in turn; Tommy's Y with peace fingers ✌️), the loser does a silly shrug, and when a kid wins there's confetti. Then **PLAY AGAIN**.
- **Free-style:** five or more in a row wins, and there are no forbidden moves. **EXACTLY 5** (a switch on the menu): only exactly five wins; a row of six or more doesn't count, for both sides.
- **A full board with no five is a draw.**
- **The score keeps running** from game to game for the same two players (it's on the scoreboard and the game-over card) until the page is closed. **Who goes first swaps every game**; you go first in the first game (Teddy, in 2 players).
- **The boards:** **LITTLE 9×9** (for Tommy), **BIG 13×13**, **CLASSIC 15×15**. The star points are drawn like a real board.
- **Helpers:**
  - **↩️ Undo** (top left, or **U**) takes back one move. Against the CPU it takes back your stone and the CPU's answer, so it's your turn again (just yours while the CPU is still thinking). It works as often as you like until the game ends. **UNDO** on the menu switches the button off.
  - **A soft gold glow** rings the last stone played.
  - **Good moves get a cheer:** NICE! for your three, FOUR! for a four, BLOCKED! for stopping a four or an open three, SUPER! for a two-way trap.

### Who you play

- **1 player:** you pick Teddy or Tommy and play a friend from the kit. **🐣 EASY is Bruno the bear** (the default, for Tommy, 5): he takes a five he can see 6 times in 10, always blocks an obvious four (four stones side by side), blocks a split four (●●_●●) only now and then, never blocks a three, and otherwise builds his own lines with lots of randomness. **🔥 NORMAL is Bolt the robot** (for Teddy, 8), who plays by threats: he takes his five, blocks your four, makes an open four or two fours when he can, always stops your open three, and otherwise picks the best move by a score that makes and blocks threes, fours and four-three / three-three traps. A quarter of his turns he doesn't notice a trap you're setting up, so a clever Teddy can catch him.
- **2 players:** Teddy and Tommy take turns on one device.

## Controls

| | Keys | Touch |
|---|---|---|
| move round the board · put your stone there | ← ↑ → ↓ · Enter or Space | press a point, slide, let go |
| undo one move | U | ↩️ (top left) |
| call your brother (2 players: high five) | T | his face, bottom right (🙌 in 2 players) |
| new game | R | 🔄 on the pause screen |
| pause · sound | P or Esc · M | ⏸️ · 🔊 |
| menu: LITTLE 9×9 · BIG 13×13 · CLASSIC 15×15 | 1 · 2 · 3 | the three big tiles |
| menu: Teddy or Tommy · 1 or 2 players · level | ← → · ↑ ↓ · L | the buttons under the tiles |
| menu: undo button on or off · EXACTLY 5 | U · F | the two switches at the bottom |

- **Pressing shows before it plays:** while your finger (or the mouse button) is down, the point under it gets a yellow ring, guide lines along its row and column, and a see-through stone. Slide to fix it, let go to put the stone down. With a mouse, the point under the pointer shows the same ring.
- **The stone that bobs over a boy's head** shows whose turn it is.
- **Point sizes** (one step of the grid on screen, measured, 15×15 / 13×13 / 9×9): iPad landscape 1024×768 38 / 44 / 66 px, iPad portrait 768×1024 37–38 / 43 / 64 px, phone upright 390×844 22 / 26 / 39 px, phone on its side 740×360 21 / 25 / 37 px. On a tall screen the round ? and language buttons move to the bottom left corner during a game so the board can use the whole width; on a phone on its side the score moves to a column on the right so the board can use the whole height.

## Call your brother (companion mode)

**1 player:** the CPU is a friend from the kit, so your brother is free to help. Call him with **T** or by tapping his face (bottom right), **any time and as often as you like** (`Kit.roster.buddyFor`: Tommy for Teddy, Teddy for Tommy).

- **He pops in** beside the board in a puff of stars, at his roster `buddyScale` (a smaller Tommy, a slightly smaller Teddy), with his name tag.
- **He says hi** with his signature move (Tommy's Y with peace fingers, Teddy's boxing combo) and **tosses you a treat** (🍦 💧 🧃 🍪 🍉 🍌) that arcs into your hand: "🧃 JUICE BOX FROM TOMMY!"
- **He shows you the move:** he turns and points, the point glows gold with a see-through stone and a bouncing 👇, and a toast says "TOMMY SAYS: HERE!". It's your five when you have one ("WIN HERE!"), else the block of the CPU's four or open three ("BLOCK HERE!"), else the move a careful player would make (Bolt's thinking, without his slips). If it's the CPU's turn when he arrives, he waits for yours.
- **Once you've played**, he does his goodbye move and pops out. Call him again while he's there and he says hi again, brings another treat and points again. After an undo he looks again.
- **When the CPU makes a four or an open three against you**, his button wiggles (and a soft "uh-oh" plays): a good time to call him.

**2 players:** both brothers are already at the board, so **T** (or 🙌) is a **high five**: they run together behind the board, slap hands (both hands, 💥) and run back. It doesn't change the game.

## Make it yours

- `js/title.js`: the game's name.
- `js/rules.js`, near the top: `EASY` (how often Bruno takes a five, blocks a split four, wanders, minds your lines) and `NORMAL.slip` (how often Bolt misses a trap). `ATT` / `DEF` further down are Bolt's scores.
- `js/game.js`, top: `CPU` (who plays each level).
- `js/stage.js`: the garden, the board, the stones and their colours (`COL`) and emblems (`EMBLEM`).

## How it works, and how it's tested

- `js/rules.js` has no Three.js and no page in it: the board, both rules (free-style and EXACTLY 5), the CPU, your brother's tip and the "good move" judge. The same file runs the game and the headless checks.
  - The CPU looks at shapes: for a point and a colour it counts, line by line, fives, open fours (two ways to five), fours (one way) and open threes (one more stone makes an open four), checking overlines for EXACTLY 5. Normal adds a score for every five-long stretch that could still become a five.
- `js/game.js` runs the games and turns each move into the stone drop, sounds, word bursts and the boys' reactions.
- Console hooks (`window.game`):

```js
game.start({ size: 15, players: 1, who: 'tommy', level: 'easy', exact: false, undo: true })   // straight into a game
game.tapRC(7, 7)         // put a stone on row 7, column 7 for the kid whose turn it is (game.tap(i) takes row * size + col)
game.undo()              // the undo button
game.call()              // call your brother (2 players: high five)
game.step(2)             // advance 2 s and draw (when the browser tab's animation is throttled)
game.hold(true)          // freeze the live loop, so only game.step() moves time
game.auto(true, 'easy')  // a test bot plays the kid's side too
game.check()             // the headless checks below (game.rates() for the win rates)
game.info()              // state, board, turn, score, the brother, the size of a grid step on screen
```

The same checks run from a terminal with Node:

```bash
node tools/check.js 40
```

```bash
node tools/check.js 24 --sabotage blind
```

```bash
node tools/check.js 24 --sabotage nodraw
```

```bash
node tools/check.js 24 --sabotage weak
```

```bash
node tools/check.js rates 200
```

- **legal:** every move either CPU level picks is on an empty point of the board while the game is on.
- **blocks:** 🔥 NORMAL always takes its own five, and otherwise always blocks a four, an open four too (it plays one of the two ends, though the other end still wins). It also always stops an open three when one move can, unless it makes a four of its own. This is checked at every one of its moves in the games, and on made-up boards with an open four or an open three in a random direction and place, on every size and with both rules.
- **ends:** every game ends with a five or a full board (a draw) by move n × n.
- **strength:** 🔥 NORMAL beats 🐣 EASY in at least 80% of games.
- **hint:** your brother's tip takes your five when there is one, and otherwise blocks the CPU's four.
- **The games:** for each board size and rule, Normal against Easy (both colours, who starts swapping), and Normal, Easy and the kids' test bots against each other: a random bot, "little" (like a 5-year-old: puts stones in a row, sometimes sees a five, now and then blocks four in a row), "kid" (like an 8-year-old: sees its five, usually blocks a four, stops an open three half the time) and "careful" (never misses a five, a four or an open three).
- **It can fail:** `--sabotage blind` makes Normal ignore the other side's stones (it missed 243 of 477 fours and 352 of 620 open threes in the games, 233 of 240 made-up open fours, and beat Easy only 74% of the time); `--sabotage nodraw` makes a full board not the end (58 of 648 games got stuck with nowhere to play); `--sabotage weak` makes Normal play like Easy (it beat Easy in 50% of games, and missed fours and threes). Each makes the check fail.
- **At the last check** (`node tools/check.js 40`, 8 s): 1,080 games, all ended (98 full-board draws, the longest 225 moves); 17,260 CPU moves, none illegal; Normal took or blocked every one of 1,577 fives and fours in the games, stopped all 1,234 open threes, and all 240 made-up open fours and 240 open threes; the tip was right 550 of 550 times; Normal beat Easy in 478 of 480 games (99.6%).
- **Win rates with bots** (`node tools/check.js rates 200`: 200 games each, free-style, the bot as Teddy and as Tommy in turn). Not a pass or fail check; it's how the levels were tuned:
  - 🐣 EASY: "little" wins 44–47% (before any help from his brother); "kid" wins about 90%; "careful" 97%; the random bot never.
  - 🔥 NORMAL: "kid" wins 3% on 9×9 (64% draws), 10% on 13×13 and 13% on 15×15; "careful" wins 3% / 19% / 26% (with many draws); "little" and the random bot never.
- **The browser:** whole games on every size, both levels and both rules were played through the real renderer (`game.auto`) to PLAY AGAIN, calling the brother every few seconds, with no console errors. Undo was checked for each case (your stone and the CPU's answer; only yours while the CPU thinks; one stone in 2 players; switched off), and EXACTLY 5 (a six isn't a win, a five is). 中文: every screen visited (home in 1 and 2 players, the ? panel, games in 1 and 2 players with the brother, undo, pause, game over, a "BLOCK HERE!" tip), and `Kit.lang.untranslated()` stayed `[]` (a planted string was caught). English: no Chinese anywhere except the kit's language button tooltip. Layouts checked by screenshot: 1024×768 and 768×1024 (iPad), phone upright 390×844, phone on its side 740×360.
- **Offline:** `index.html` and `dist/gomoku-tt.html` boot from `file://` in headless Chrome (`tools/shoot.js`), with the tab icon and the apple-touch-icon in place, and play a move and the CPU's answer with real animation frames, with no page errors.

## Files

```
index.html               page, HUD, menus, panels (CSS inline)
js/title.js              the game's name (one constant)
js/rules.js              the rules, the CPU, your brother's tip, the good-move judge (no Three.js)
js/check.js              the headless checks, the test bots and the win-rate report (game.check, game.rates, tools/check.js)
js/stage.js              the garden, the board and grid, the stones, the drop and the undo, the glows and the ring, the camera fit, picking
js/actor.js              a boy beside the board: poses, reactions, treats (from TT Tic-Tac-Toe)
js/buddy.js              your brother's visit and tip, and the 2-player high five
js/fx.js                 emoji flyers, word bursts, confetti
js/sfx.js                game sounds on top of Kit.sound
js/game.js               the games, turns, undo, the CPU's timing, the score, screens, input, main loop, window.game hooks
js/keys.js               the keys the ? panel shows (Kit.help)
js/zh.js                 中文 for every word the player sees (Kit.lang); names and the game's name stay English
tools/check.js           runs the headless checks under Node
tools/shoot.js           screenshots with headless Chrome (tools/shots.json makes docs/screenshot.jpg)
kit/                     copy of ~/claude-games/kit (python3 ../kit/tools/sync.py .), never edited here
dist/gomoku-tt.html      the single-page build
```

## Not verified

- **Sound:** the synth code runs without errors, but nobody listened to it.
- **Real touch devices:** press, slide and let go was checked with synthetic touch pointer events (the ring shows on press, slides with the finger, the stone goes down on release; a tap a little off a point lands on the nearest one), and the layouts in the browser's phone and tablet sizes, but no real phone or iPad was used. On a phone the 15×15 board's points are about 22 px apart, which is small for a finger; the 9×9 board is the one for phones.
- **Real kids:** the levels are tuned with test bots. How Easy feels for Tommy, and whether Normal is too hard for Teddy (a kid-like bot wins about 1 game in 8 on 15×15, more with his brother's tips), needs Tommy and Teddy. `EASY` and `NORMAL.slip` in `js/rules.js` are the knobs. On 9×9 Normal draws a lot.
- **Double-click from Finder:** `index.html` and `dist/gomoku-tt.html` were opened from `file://` in headless Chrome, not by double-clicking in Finder.
- **The iPad home-screen icon:** the apple-touch-icon is drawn by script like the siblings'; nobody added it to a real iPad.
