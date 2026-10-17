// battle.js
// バトル進行の中核
// 1問=1ターン: 正解→こちらの攻撃 / 不正解・時間切れ→敵の攻撃＋正解タップで訂正
//
// 注意（前作の教訓）:
//  - すべての分岐で必ず次のステップ（nextQuestion / 勝敗処理）につなげること
//  - isInputBlocked は全分岐で解除すること
//  - CSSアニメ再発火は remove → offsetWidth → add

const BattleManager = {

    // --- ステージ状態 ---
    stage: null,           // 現在のステージ設定
    isMetamon: false,      // とっくん（メタモン / イーブイ）中か
    trainingKind: null,    // null / "metamon" / "eevee"
    maskIndex: 0,          // オーガポンの おめん
    enemyIndex: 0,
    enemyHp: 0,
    enemyMaxHp: 0,
    raged: false,
    hearts: 0,

    // --- 進行状態 ---
    combo: 0,
    maxCombo: 0,
    voltGauge: 0,
    questionCount: 0,
    correctTotal: 0,
    wrongTotal: 0,
    critTotal: 0,
    missedFacts: {},       // { "7x6": q } 今回のバトルで間違えた問題
    revengeQueue: [],      // [{a, b, due}]
    weakFactList: null,    // 苦手ステージ/メタモン用の出題リスト [[a,b],...]
    orderedIndex: 0,       // W1ジム前半の順出題用

    // --- 現在の問題 ---
    currentQ: null,
    isRevenge: false,
    questionStartTime: 0,
    currentTimeLimit: null,
    _timerInterval: null,
    _shuffleTimer: null,
    _answered: false,

    // --- 入力制御 ---
    isInputBlocked: true,
    awaitingCorrectTap: false,
    pendingDefeat: false,
    currentHint: null,
    _finished: false,      // 最後の敵を倒した後（勝利確定〜リザルト表示まで）

    // --- バトル世代トークン ---
    // にげる/勝敗確定/新バトル開始のたびに増やし、古いバトルの保留タイマーを無効化する
    _session: 0,

    // トークン付きsetTimeout: 発行時と実行時のセッションが違えば何もしない
    _later: function(ms, fn) {
        const s = this._session;
        return setTimeout(() => {
            if (s !== this._session) return;
            fn();
        }, ms);
    },

    // ==========================================
    //  ステージ開始
    // ==========================================
    startStage: function(stageId, fromIds) {
        const stage = GameConfig.getStage(stageId);
        if (!stage) return;
        this.isMetamon = false;
        this.trainingKind = null;
        this._beginBattle(stage, null, fromIds);
    },

    // メタモンとっくん（苦手TOP5の動的ステージ）
    startMetamon: function(fromIds) {
        let weak = GameState.getWeakFacts(GameConfig.metamon.weakCount);
        let factList = weak.map(w => [w.a, w.b]);
        // 苦手が足りなければ6〜9の段からランダム補充
        while (factList.length < GameConfig.metamon.weakCount) {
            const a = 6 + Math.floor(Math.random() * 4);
            const b = 1 + Math.floor(Math.random() * 9);
            if (!factList.some(f => f[0] === a && f[1] === b)) factList.push([a, b]);
        }
        const stage = {
            id: "metamon", mode: "kake", world: 0, name: "メタモンとっくん", subName: "きみのにがて",
            dans: [1,2,3,4,5,6,7,8,9],
            hearts: GameConfig.metamon.hearts,
            timeLimit: GameConfig.metamon.timeLimit,
            enemies: [{ key: "メタモン", img: "メタモン01.gif", hp: GameConfig.metamon.hp }]
        };
        this.isMetamon = true;
        this.trainingKind = "metamon";
        this._beginBattle(stage, factList, fromIds);
    },

    // イーブイとっくん（わりざんの 苦手TOP5。きょうの イーブイが あいて）
    startDivTraining: function(fromIds) {
        const conf = GameConfig.divTraining;
        const weak = GameState.getWeakFacts(conf.weakCount, "d");
        const factList = weak.map(w => [w.a, w.b, "div"]);
        // 苦手が足りなければ ÷6〜÷9 から補充
        while (factList.length < conf.weakCount) {
            const a = 6 + Math.floor(Math.random() * 4);
            const b = 1 + Math.floor(Math.random() * 9);
            if (!factList.some(f => f[0] === a && f[1] === b)) factList.push([a, b, "div"]);
        }
        const e = GameState.todaysEevee();
        StorageManager.save();
        const isGiga = e.key === GameConfig.eeveeGiga.key;
        const stage = {
            id: "divtrain", mode: "wari", world: 0, name: "イーブイとっくん", subName: "わりざんの にがて",
            dans: [1,2,3,4,5,6,7,8,9], qTypes: ["div"],
            hearts: conf.hearts,
            timeLimit: conf.timeLimit,
            enemies: [{ key: e.key, img: e.img, hp: isGiga ? conf.gigaHp : conf.hp,
                        intro: isGiga ? "キョダイマックスの イーブイだ！" : null }]
        };
        this.isMetamon = true;
        this.trainingKind = "eevee";
        this._beginBattle(stage, factList, fromIds);
    },

    _beginBattle: function(stage, factList, fromIds) {
        // 画面遷移中の二重開始を防ぐ（マップ連打・とっくん連打）
        if (TransitionManager._busy) return;
        this._session++;
        const session = this._session;
        this._clearTimers();

        this.stage = stage;
        this.enemyIndex = 0;
        this.raged = false;
        this.hearts = stage.hearts;
        this.combo = 0;
        this.maxCombo = 0;
        this.voltGauge = 0;
        this.questionCount = 0;
        this.correctTotal = 0;
        this.wrongTotal = 0;
        this.critTotal = 0;
        this.missedFacts = {};
        this.revengeQueue = [];
        this.weakFactList = factList || (stage.weakStage ? this._buildWeakStageList(stage) : null);
        this.orderedIndex = 0;
        this.isInputBlocked = true;
        this.awaitingCorrectTap = false;
        this.pendingDefeat = false;
        this._answered = false;
        this._finished = false;
        this.currentQ = null;
        this.currentHint = null;
        QuestionGenerator.resetRecent();

        const mode = stage.mode === "wari" ? "wari" : "kake";
        UIManager.clearQuestion();
        UIManager.setBattleMode(mode);
        this._setupEnemy(0);
        UIManager.setPartner(mode);
        UIManager.renderHearts(this.hearts, stage.hearts);
        UIManager.updateCombo(0);
        UIManager.updateVoltGauge(0, GameConfig.battle.voltGaugeMax);
        UIManager.showYomiTelop({}, false);
        UIManager.showTimer(false);
        this._hideOboe();

        // ステージ名表示
        const label = document.getElementById("battle-stage-label");
        if (label) label.textContent = stage.name + "　" + stage.subName;

        // BGM: ステージ指定 > ワールド既定
        const bgmKey = this.isMetamon ? "bgm_training" :
                       (stage.bgm || (GameConfig.worlds[stage.world] ? GameConfig.worlds[stage.world].bgm : "bgm_battle1"));

        // バトル突入ワイプ
        TransitionManager.battleWipe(fromIds || ["map-screen"], "battle-screen", () => {
            if (session !== this._session) return;
            SoundManager.playBGM(bgmKey);
            // おぼえタイム（未クリアのW1ジムのみ）
            if (stage.oboeTime && !GameState.isStageCleared(stage.id)) {
                this._showOboe(stage, () => this._introEnemy());
            } else {
                this._introEnemy();
            }
        });
    },

    // にがてリベンジ面: 苦手TOP12（足りなければ7〜9段で補完）
    _buildWeakStageList: function(stage) {
        const weak = GameState.getWeakFacts(12);
        const list = weak.map(w => [w.a, w.b]);
        while (list.length < 12) {
            const a = stage.dans[Math.floor(Math.random() * stage.dans.length)];
            const b = 1 + Math.floor(Math.random() * 9);
            if (!list.some(f => f[0] === a && f[1] === b)) list.push([a, b]);
        }
        return list;
    },

    _setupEnemy: function(index) {
        const enemy = this.stage.enemies[index];
        this.enemyIndex = index;
        this.enemyHp = enemy.hp;
        this.enemyMaxHp = enemy.hp;
        this.raged = false;
        this.maskIndex = 0;
        // 制限時間: 敵ごとの上書き > ステージ設定。ゆっくりモードで1.5倍
        let tl = enemy.timeLimit !== undefined ? enemy.timeLimit : this.stage.timeLimit;
        if (tl && GameState.settings.slow) tl = Math.round(tl * 1.5);
        this.currentTimeLimit = tl;
        this.baseTimeLimit = tl;   // accelギミックの戻し先

        UIManager.setEnemy(enemy);
        UIManager.updateEnemyHp(this.enemyHp, this.enemyMaxHp);
    },

    _currentEnemy: function() {
        return this.stage.enemies[this.enemyIndex];
    },

    // 敵の登場メッセージ→最初の問題
    _introEnemy: function() {
        const enemy = this._currentEnemy();
        UIManager.showCommentary(enemy.key + "が あらわれた！", 1500);
        SoundManager.playSE("select");

        // 説明テキスト（敵ごと > ステージ共通（最初の敵のみ））
        const intro = enemy.intro || (this.enemyIndex === 0 ? this.stage.intro : null);
        if (intro) {
            this._later(1600, () => UIManager.showCommentary(intro, 2400));
        } else if (this._hasG(enemy, "barrier")) {
            this._later(1600, () => UIManager.showRandomCommentary("barrier"));
        }
        this._later(intro ? 4100 : 1700, () => this.nextQuestion());
    },

    // ギミックを持っているか（配列指定・変身後に増えるギミックにも対応）
    _hasG: function(enemy, name) {
        if (!enemy) return false;
        const g = enemy.gimmick;
        if (g === name || (Array.isArray(g) && g.indexOf(name) >= 0)) return true;
        return this.raged && enemy.rageGimmick === name;
    },

    // ステージの出題形式からランダムに1つ選ぶ（おめんの敵は おめんの形式）
    _pickType: function() {
        const enemy = this._currentEnemy();
        const types = (enemy && enemy.masks) ? enemy.masks[this.maskIndex].qTypes : this.stage.qTypes;
        if (!types || types.length === 0) return "normal";
        return types[Math.floor(Math.random() * types.length)];
    },

    // ==========================================
    //  出題
    // ==========================================
    nextQuestion: function() {
        this._clearTimers();
        this.questionCount++;
        this._answered = false;
        this.isRevenge = false;
        this.awaitingCorrectTap = false;

        let q = null;

        // 1) リベンジ問題（誤答の再出題）が期限到来していれば最優先（同じ形式・同じ あな・同じ あまり）
        const dueIdx = this.revengeQueue.findIndex(r => r.due <= this.questionCount);
        if (dueIdx >= 0) {
            const r = this.revengeQueue.splice(dueIdx, 1)[0];
            q = QuestionGenerator.makeQuestion(r.a, r.b, 4, r.type, { missing: r.missing, r: r.r });
            this.isRevenge = true;
        }
        // 2) 苦手リスト面（にがてリベンジ/とっくん）はリストから出題 [a, b, type]
        else if (this.weakFactList) {
            const f = this.weakFactList[Math.floor(Math.random() * this.weakFactList.length)];
            q = QuestionGenerator.makeQuestion(f[0], f[1], 4, f[2]);
        }
        // 3) おぼえタイムのある面の序盤（敵HPが半分になるまで）は ×1, ×2… の順出題（足場かけ）
        //    段が2つある面は こうごに（2÷2, 3÷3, 4÷2, 6÷3 …）
        else if (this.stage.oboeTime && this.enemyHp > this.enemyMaxHp / 2) {
            const dans = this.stage.dans;
            const dan = dans[this.orderedIndex % dans.length];
            const b = Math.floor(this.orderedIndex / dans.length) % 9 + 1;
            this.orderedIndex++;
            q = QuestionGenerator.makeQuestion(dan, b, 4, this._pickType());
        }
        // 4) 通常: 苦手混入（ワールドごとの率）または範囲内から重み付き抽選
        else {
            const type = this._pickType();
            const mixRate = GameConfig.battle.weakMixRate[this.stage.world] || 0;
            const prefix = QuestionGenerator.keyPrefix(type);
            const inRange = (w) => this.stage.mode !== "wari" || prefix !== "d" || this.stage.dans.indexOf(w.a) >= 0;
            const weakPool = ((mixRate > 0 && type !== "rem") ? GameState.getWeakFacts(12, prefix) : []).filter(w =>
                inRange(w) &&
                !QuestionGenerator._recentKeys.includes(w.key) &&
                !this.revengeQueue.some(r => r.a === w.a && r.b === w.b));
            if (weakPool.length > 0 && Math.random() < mixRate) {
                const w = weakPool[Math.floor(Math.random() * weakPool.length)];
                q = QuestionGenerator.makeQuestion(w.a, w.b, 4, type);
            } else {
                q = QuestionGenerator.generate(this.stage.dans, { type: type });
            }
        }

        // ヒントモード: 同じ問題を2回連続で間違えていたら2択＋ヒント
        // （わりざん系は ÷の2択、あまりは あまりの2択、かけざん系は ×の2択）
        let hintText = null;
        const fact = GameState.getFact(q.key);
        if (fact.cw >= 2) {
            let ht = "normal";
            if (QuestionGenerator.isDivType(q.type)) ht = "div";
            else if (q.type === "rem") ht = "rem";
            q = QuestionGenerator.makeQuestion(q.a, q.b, 2, ht, { r: q.r });
            hintText = this._makeHint(q);
        }

        this.currentQ = q;
        this.currentHint = hintText;
        UIManager.renderQuestion(q, hintText);
        if (this.isRevenge) {
            UIManager.showCommentary("さっきの もんだいだ！ リベンジ！", 1500);
        }

        // 入力ロック→解除、タイマー開始
        this.isInputBlocked = true;
        UIManager.setOptionsEnabled(false);
        this._later(GameConfig.battle.inputLockMs, () => {
            // 誤答訂正タップ待ちなど、状態が変わっていたら何もしない
            if (this._answered || this.awaitingCorrectTap) return;
            this.isInputBlocked = false;
            UIManager.setOptionsEnabled(true);
            this.questionStartTime = Date.now();
            this._startTimer();
            this._startShuffleGimmick();
        });
    },

    // ヒント（答えそのものは見せず、考え方を見せる）
    _makeHint: function(q) {
        // わりざん: わる数の だんを ならべる（数えると こたえに なる）
        if (QuestionGenerator.isDivType(q.type)) {
            let chips = "";
            for (let k = 1; k <= q.b; k++) {
                chips += '<span class="hint-chip' + (k === q.b ? " hint-chip-last" : "") + '">' + (q.a * k) + "</span>";
            }
            return "ヒント: " + q.a + "のだんで " + q.c + " は なんばんめ？" +
                   '<div class="hint-chips">' + chips + "</div>";
        }
        // あまり: わる数の だんで こえない いちばん おおきい かずを さがす
        if (q.type === "rem") {
            let chips = "";
            for (let k = 1; k <= q.b + 1; k++) {
                chips += '<span class="hint-chip' + (k === q.b + 1 ? " hint-chip-over" : "") + '">' + (q.a * k) + "</span>";
            }
            return "ヒント: " + q.a + "のだんで " + q.c + " を こえない いちばん おおきい かずは？" +
                   '<div class="hint-chips">' + chips + "</div>";
        }
        // 10〜12の だん: 10 と のこり に わける
        if (q.big) {
            const big = q.a >= 10 ? q.a : q.b, small = q.a >= 10 ? q.b : q.a;
            if (big === 10) return "ヒント: " + small + " が 10こ あつまった かず";
            return "ヒント: 10×" + small + " と " + (big - 10) + "×" + small + " を あわせた かず";
        }
        const prev = q.a * (q.b - 1);
        let text = "";
        if (q.b > 1) {
            text = "ヒント: " + q.a + "×" + q.b + " は " + q.a + "×" + (q.b - 1) +
                   " (" + prev + ") より " + q.a + " おおきい";
        } else {
            text = "ヒント: " + q.a + "×1 は " + q.a + " のまま！";
        }
        // ドット図（a×b個の●）— 行＝小さい方の数、列＝大きい方の数。大きすぎる場合は省略
        if (q.a * q.b <= 45) {
            const rows = Math.min(q.a, q.b);
            const cols = Math.max(q.a, q.b);
            let dots = '<div class="hint-dots">';
            for (let r = 0; r < rows; r++) {
                dots += '<div class="hint-dot-row">' + "●".repeat(cols) + "</div>";
            }
            dots += "</div>";
            text += dots;
        }
        return text;
    },

    // ==========================================
    //  タイマー
    // ==========================================
    _startTimer: function() {
        if (!this.currentTimeLimit) {
            UIManager.showTimer(false);
            return;
        }
        UIManager.showTimer(true);
        UIManager.setTimerRatio(1);
        const limit = this.currentTimeLimit;
        const start = Date.now();
        this._timerInterval = setInterval(() => {
            const remain = limit - (Date.now() - start);
            UIManager.setTimerRatio(remain / limit);
            if (remain <= 0) {
                this._clearTimers();
                this.onTimeout();
            }
        }, 50);
    },

    _clearTimers: function() {
        if (this._timerInterval) { clearInterval(this._timerInterval); this._timerInterval = null; }
        if (this._shuffleTimer) { clearTimeout(this._shuffleTimer); this._shuffleTimer = null; }
    },

    // ゲンガーのいたずら: 3の倍数の問題で1.2秒後に選択肢を入れ替える
    _startShuffleGimmick: function() {
        const enemy = this._currentEnemy();
        if (!this._hasG(enemy, "shuffle")) return;
        if (this.questionCount % 3 !== 0) return;
        // ヒントモード(2択)の子にいたずらは重ねない。式や「あまり」を読む問題でも発動しない
        const noShuffle = (q) => !q || q.options.length === 2 || ["reverse", "divReverse", "rem"].indexOf(q.type) >= 0;
        if (noShuffle(this.currentQ)) return;
        this._shuffleTimer = this._later(1200, () => {
            if (this._answered || this.awaitingCorrectTap || this.isInputBlocked) return;
            if (noShuffle(this.currentQ)) return;
            QuestionGenerator._shuffle(this.currentQ.options);
            UIManager.renderQuestion(this.currentQ, this.currentHint);
            UIManager.setOptionsEnabled(true);
            const wrap = document.getElementById("battle-options");
            if (wrap) {
                wrap.classList.remove("options-spin");
                void wrap.offsetWidth;
                wrap.classList.add("options-spin");
            }
            const enemyNow = this._currentEnemy();
            UIManager.showCommentary(enemyNow.shuffleText || (enemyNow.key + "の いたずら！ ばしょが かわった！"), 1500);
            SoundManager.playSE("select");
        });
    },

    // ==========================================
    //  回答処理
    // ==========================================
    onAnswer: function(index, value, btn) {
        // 誤答後の「正解タップ」待ち
        if (this.awaitingCorrectTap) {
            if (value === this.currentQ.answer) this._resumeAfterWrong(btn);
            return;
        }
        if (this.isInputBlocked || this._answered) return;

        this._answered = true;
        this.isInputBlocked = true;
        this._clearTimers();
        UIManager.setOptionsEnabled(false);

        const elapsed = Date.now() - this.questionStartTime;
        const isCorrect = (value === this.currentQ.answer);
        GameState.recordAnswer(this.currentQ.key, isCorrect, elapsed);

        if (isCorrect) {
            this._handleCorrect(elapsed, btn);
        } else {
            this._handleWrong(btn);
        }
    },

    onTimeout: function() {
        if (this._answered || this.awaitingCorrectTap) return;
        this._answered = true;
        this.isInputBlocked = true;
        UIManager.setOptionsEnabled(false);
        GameState.recordAnswer(this.currentQ.key, false, null);
        UIManager.showCommentary("じかんぎれ！", 1200);
        this._handleWrong(null);
    },

    // --- 正解 ---
    _handleCorrect: function(elapsed, btn) {
        this.correctTotal++;
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);

        const conf = GameConfig.battle;
        const isCrit = (elapsed <= conf.criticalTime) || this.isRevenge;
        if (isCrit) this.critTotal++;

        // 10まんボルト: ゲージMAX状態での正解で発動
        let isVolt = false;
        if (this.voltGauge >= conf.voltGaugeMax) {
            isVolt = true;
            this.voltGauge = 0;
        } else {
            this.voltGauge++;
        }

        // ダメージ決定
        let damage = isVolt ? conf.voltDamage : (isCrit ? conf.criticalDamage : conf.normalDamage);

        // バリア: 決められた時間いない（既定3びょう）の正解・リベンジ・ひっさつわざ でないと通らない
        const enemy = this._currentEnemy();
        const passMs = (enemy.barrierMs || conf.criticalTime) * (GameState.settings.slow ? 1.5 : 1);
        let barriered = false;
        if (this._hasG(enemy, "barrier") && !isVolt && !this.isRevenge && elapsed > passMs) {
            damage = 0;
            barriered = true;
        }

        if (btn) btn.classList.add("option-answered-correct");
        SoundManager.playSE("correct");
        if (this.combo >= 2) SoundManager.playComboTone(this.combo);
        EffectManager.playCorrect();
        UIManager.showFace("correct");
        UIManager.updateCombo(this.combo);
        UIManager.updateVoltGauge(this.voltGauge, conf.voltGaugeMax);

        // 攻撃演出
        this._later(350, () => {
            if (barriered) {
                UIManager.showCommentary(enemy.barrierText ||
                    ("バリアに ふせがれた！ " + Math.round(passMs / 1000) + "びょういないで こたえよう！"), 1800);
                SoundManager.playSE("damage");
                this._afterAttack(0);
                return;
            }

            this.enemyHp = Math.max(0, this.enemyHp - damage);

            if (isVolt) {
                SoundManager.playSE("burst");
                EffectManager.playBurst();
                EffectManager.playPlayerAttack(damage, true);
                UIManager.showCommentary(UIManager.specialMove.name + "！！ ひっさつだ！", 1800);
                UIManager.triggerShake();
            } else {
                SoundManager.playSE("attack");
                EffectManager.playPlayerAttack(damage, isCrit);
                if (this.isRevenge) {
                    UIManager.showRandomCommentary("revenge");
                } else if (isCrit) {
                    UIManager.showRandomCommentary("critical");
                } else if (this.combo >= 3 && this.combo % 3 === 0) {
                    UIManager.showRandomCommentary("combo");
                }
                if (isCrit) UIManager.triggerShake();
            }

            UIManager.updateEnemyHp(this.enemyHp, this.enemyMaxHp);
            this._afterAttack(damage);
        });
    },

    // 攻撃後の分岐（怒りモード→撃破判定→次の問題）
    _afterAttack: function(damage) {
        const enemy = this._currentEnemy();

        // ディアルガ: 正解するたび制限時間が縮む（accelMin まで）
        if (this._hasG(enemy, "accel") && this.currentTimeLimit) {
            const slowMul = GameState.settings.slow ? 1.5 : 1;
            const minT = Math.round((enemy.accelMin || 3000) * slowMul);
            const step = Math.round((enemy.accelStep || 300) * slowMul);
            if (this.currentTimeLimit > minT) {
                this.currentTimeLimit = Math.max(minT, this.currentTimeLimit - step);
                const sec = (this.currentTimeLimit / 1000).toFixed(1);
                // 「はやい！」等の実況を消さないよう少し遅らせる。撃破時は出さない
                if (this.enemyHp > 0) {
                    this._later(650, () => UIManager.showCommentary("⏳ じかんが ちぢむ！ のこり " + sec + "びょう", 1200));
                }
            }
        }

        // 変身（HP半分で2形態目）: おこる / キョダイマックス / メガシンカ / しんか
        if (this._hasG(enemy, "rage") && !this.raged &&
            this.enemyHp > 0 && this.enemyHp <= this.enemyMaxHp / 2) {
            this.raged = true;
            const style = enemy.rageStyle || "rage";
            UIManager.setEnemyRage(enemy.rageImg, style, enemy.rageName);
            if (style === "dynamax") { SoundManager.playSE("burst"); UIManager.triggerShake(); }
            else if (style === "mega" || style === "evolve") SoundManager.playSE("evolution");
            else SoundManager.playSE("damage");
            let text = enemy.rageText;
            if (enemy.rageTimeCut && this.currentTimeLimit) {
                this.currentTimeLimit = Math.max(3000, this.currentTimeLimit - enemy.rageTimeCut);
                if (!text) text = enemy.key + "が おこった！ じかんが みじかくなる！";
            }
            UIManager.showCommentary(text || (enemy.key + "が おこった！"), 2400);
        }

        // おめんチェンジ（HPが へるごとに 姿と 出題形式が かわる）
        if (enemy.masks && this.enemyHp > 0) {
            const idx = Math.min(enemy.masks.length - 1,
                Math.floor((1 - this.enemyHp / this.enemyMaxHp) * enemy.masks.length));
            if (idx > this.maskIndex) {
                this.maskIndex = idx;
                const m = enemy.masks[idx];
                UIManager.setEnemyRage(m.img, "mask", m.name);
                SoundManager.playSE("evolution");
                UIManager.showCommentary(m.text, 2200);
            }
        }

        if (this.enemyHp <= 0) {
            this._defeatEnemy();
        } else {
            this._later(900, () => this.nextQuestion());
        }
    },

    // 敵を撃破 → 連戦 or 勝利
    _defeatEnemy: function() {
        const enemy = this._currentEnemy();
        // 最後の敵なら勝利確定（この間の「にげる」は無効）
        if (this.enemyIndex >= this.stage.enemies.length - 1) this._finished = true;
        SoundManager.playSE("levelup");
        UIManager.showCommentary(enemy.key + "を たおした！", 1500);

        const img = document.getElementById("enemy-img");
        if (img) {
            img.classList.remove("enemy-defeated", "enemy-hit", "enemy-attack", "enemy-transform");
            void img.offsetWidth;
            img.classList.add("enemy-defeated");
        }

        this._later(1300, () => {
            if (this.enemyIndex < this.stage.enemies.length - 1) {
                // 連戦: 次の敵
                if (img) img.classList.remove("enemy-defeated");
                this._setupEnemy(this.enemyIndex + 1);
                this._introEnemy();
            } else {
                this._stageVictory();
            }
        });
    },

    // --- 不正解・時間切れ ---
    _handleWrong: function(btn) {
        this.wrongTotal++;
        this.combo = 0;   // コンボのみリセット（ゲージは維持=二重罰禁止）
        UIManager.updateCombo(0);

        const q = this.currentQ;
        this.missedFacts[q.key] = q;

        // リベンジ予約: 2〜3問後に同じ形式で必ず再出題
        this.revengeQueue.push({
            a: q.a, b: q.b, type: q.type, missing: q.missing, r: q.r,
            due: this.questionCount + 2 + Math.floor(Math.random() * 2)
        });

        // ディアルガ: 間違えたら制限時間を少し戻す（救済）
        const enemyNow = this._currentEnemy();
        if (this._hasG(enemyNow, "accel") && this.baseTimeLimit && this.currentTimeLimit) {
            const step = Math.round((enemyNow.accelStep || 300) * (GameState.settings.slow ? 1.5 : 1));
            this.currentTimeLimit = Math.min(this.baseTimeLimit, this.currentTimeLimit + step * 2);
        }

        if (btn) btn.classList.add("option-answered-wrong");
        SoundManager.playSE("wrong");
        EffectManager.playWrong();
        UIManager.showFace("wrong");

        // 敵の攻撃（ソーナンスのカウンターはハート2）
        const enemy = this._currentEnemy();
        const dmg = this._hasG(enemy, "counter") ? 2 : 1;

        this._later(400, () => {
            EffectManager.playEnemyDamage(dmg);
            SoundManager.playSE("damage");
            this.hearts = Math.max(0, this.hearts - dmg);
            UIManager.renderHearts(this.hearts, this.stage.hearts);
            UIManager.shakeHeart();
            if (dmg === 2) {
                UIManager.showCommentary("カウンター！ ハートが2つ へった！", 1000);
            }

            // 訂正入力: 正解を光らせてタップさせる（学習の核）
            this._later(700, () => {
                this.pendingDefeat = (this.hearts <= 0);
                this.awaitingCorrectTap = true;
                UIManager.highlightCorrect(q.answer);
                UIManager.showYomiTelop(q, true, dmg === 2 ? "💥 カウンター！ ハートが 2つ へった" : null);
            });
        });
    },

    // 正解タップ後の再開
    _resumeAfterWrong: function(btn) {
        this.awaitingCorrectTap = false;
        UIManager.showYomiTelop({}, false);
        if (btn) {
            btn.classList.remove("option-correct-glow");
            btn.classList.add("option-answered-correct");
        }
        SoundManager.playSE("correct");
        UIManager.showRandomCommentary(this.stage.mode === "wari" ? "divWrong" : "wrong");

        if (this.pendingDefeat) {
            this.pendingDefeat = false;
            this._later(600, () => this._stageDefeat());
        } else {
            this._later(500, () => this.nextQuestion());
        }
    },

    // ==========================================
    //  勝利
    // ==========================================
    _stageVictory: function() {
        this._session++;
        this._clearTimers();
        SoundManager.fadeOutBGM();
        SoundManager.playSE("win");

        // 星評価: クリア=1 / ミス1以下=2 / ノーミス＋クリティカル率60%以上=3
        const critRate = this.correctTotal > 0 ? this.critTotal / this.correctTotal : 0;
        let stars = 1;
        if (this.wrongTotal <= 1) stars = 2;
        if (this.wrongTotal === 0 && critRate >= 0.6) stars = 3;

        let newCostumes = [];
        let firstClear = false;
        // はじめて図鑑に のる ポケモンが いるか（リザルトの文言用）
        const dexBefore = GameState.countDex();

        if (this.trainingKind === "metamon") {
            firstClear = !GameState.isMetamonDoneToday();
            newCostumes = GameState.registerMetamonClear() || [];
            GameState.dex["メタモン"] = true;
        } else if (this.trainingKind === "eevee") {
            firstClear = !GameState.isDivTrainingDoneToday();
            newCostumes = GameState.registerDivTrainingClear(this._currentEnemy().key) || [];
        } else {
            firstClear = !GameState.isStageCleared(this.stage.id);
            newCostumes = GameState.registerClear(this.stage.id, stars) || [];
        }
        StorageManager.save();

        ResultScreen.showVictory({
            stage: this.stage,
            isMetamon: this.isMetamon,
            trainingKind: this.trainingKind,
            stars: stars,
            correct: this.correctTotal,
            wrong: this.wrongTotal,
            maxCombo: this.maxCombo,
            critRate: Math.round(critRate * 100),
            missedFacts: this.missedFacts,
            newCostumes: newCostumes,
            firstClear: firstClear,
            newDex: GameState.countDex() > dexBefore
        });
    },

    // ==========================================
    //  敗北
    // ==========================================
    _stageDefeat: function() {
        this._session++;
        this._clearTimers();
        SoundManager.fadeOutBGM();
        SoundManager.playSE("lose");
        StorageManager.save();   // 学習記録は残す
        ResultScreen.showDefeat({
            stage: this.stage,
            isMetamon: this.isMetamon,
            trainingKind: this.trainingKind,
            missedFacts: this.missedFacts
        });
    },

    // ==========================================
    //  おぼえタイム（ジム開始前に段の表を流す）
    // ==========================================
    _oboeInterval: null,

    _showOboe: function(stage, callback) {
        const overlay = document.getElementById("battle-oboe");
        const list = document.getElementById("battle-oboe-list");
        const title = document.getElementById("battle-oboe-title");
        if (!overlay || !list) { callback(); return; }

        const session = this._session;
        const skipBtn = document.getElementById("battle-oboe-skip");
        if (skipBtn) skipBtn.onclick = () => {
            if (session !== this._session) return;
            this._finishOboe(callback);
        };

        // あまりの ある わりざん: せつめいカード（ボタンで すすむ）
        if (stage.oboeKind === "rem") {
            if (title) title.textContent = "あまりの ある わりざん";
            list.innerHTML = this._remExplainHtml();
            overlay.style.display = "flex";
            return;
        }

        const dans = stage.dans;
        const isDiv = stage.mode === "wari";
        const two = dans.length > 1;
        if (title) {
            title.innerHTML = dans.join("と") + (isDiv ? "の わりざんを おぼえよう！" : "の だんを おぼえよう！") +
                (isDiv ? '<div class="oboe-sub">こたえは 九九で みつかるよ</div>' : "");
        }
        let html = "";
        for (let b = 1; b <= 9; b++) {
            html += '<div class="oboe-row' + (two ? " oboe-row2" : "") + '" id="oboe-row-' + b + '">';
            dans.forEach(d => {
                if (isDiv) {
                    html += '<span class="oboe-cell"><span class="oboe-shiki">' + (d * b) + " ÷ " + d + " = " + b + "</span>" +
                            '<span class="oboe-yomi">' + d + "×" + b + "=" + (d * b) + "</span></span>";
                } else if (two) {
                    const small = d > 9 ? '<span class="oboe-yomi">' + (d === 10 ? b + "が 10こ" : "10×" + b + "と" + (d - 10) + "×" + b) + "</span>" : "";
                    html += '<span class="oboe-cell"><span class="oboe-shiki">' + d + " × " + b + " = " + (d * b) + "</span>" + small + "</span>";
                } else {
                    const note = d > 9 ? (d === 10 ? b + "が 10こ" : "10×" + b + " と " + (d - 10) + "×" + b) : GameConfig.getYomi(d, b);
                    html += '<span class="oboe-shiki">' + d + " × " + b + " = " + (d * b) + "</span>" +
                            '<span class="oboe-yomi">' + note + "</span>";
                }
            });
            html += "</div>";
        }
        list.innerHTML = html;
        overlay.style.display = "flex";

        let i = 1;
        const highlight = () => {
            if (session !== this._session) {
                if (this._oboeInterval) { clearInterval(this._oboeInterval); this._oboeInterval = null; }
                return;
            }
            for (let b = 1; b <= 9; b++) {
                const row = document.getElementById("oboe-row-" + b);
                if (row) row.classList.toggle("oboe-active", b === i);
            }
            if (i <= 9) SoundManager.playSE("select");
            i++;
            if (i > 10) {
                this._finishOboe(callback);
            }
        };
        highlight();
        this._oboeInterval = setInterval(highlight, 1000);
    },

    // あまりの ある わりざんの せつめい
    _remExplainHtml: function() {
        let groups = "";
        for (let g = 0; g < 3; g++) groups += '<span class="rem-group">🍎🍎🍎🍎</span>';
        return '<div class="oboe-rem">' +
            '<div class="rem-line">13この きのみを <b>4こずつ</b> わけると…</div>' +
            '<div class="rem-visual">' + groups + '<span class="rem-left">🍎</span></div>' +
            '<div class="rem-line">4こずつ <b>3つ</b> できて、<b>1こ</b> あまる！</div>' +
            '<div class="rem-shiki">13 ÷ 4 = 3 あまり 1</div>' +
            '<div class="rem-line">4 × 3 = 12、 13 − 12 = 1</div>' +
            '<div class="rem-note">⚠ あまりは いつも わる数（4）より ちいさい！</div>' +
            '<div class="rem-tip">こつ: 4のだんで 13を こえない いちばん おおきい かず（12）を さがそう</div>' +
            "</div>";
    },

    _finishOboe: function(callback) {
        if (this._oboeInterval) { clearInterval(this._oboeInterval); this._oboeInterval = null; }
        this._hideOboe();
        if (callback) callback();
    },

    _hideOboe: function() {
        const overlay = document.getElementById("battle-oboe");
        if (overlay) overlay.style.display = "none";
    },

    // ==========================================
    //  バトル中断（マップへ戻る）
    // ==========================================
    quitBattle: function() {
        if (TransitionManager._busy) return;   // 遷移中の連打は無視
        if (this._finished) return;            // 勝利確定後（リザルト待ち）は無視
        this._session++;                        // 保留中のバトル進行タイマーを全て無効化
        this._clearTimers();
        if (this._oboeInterval) { clearInterval(this._oboeInterval); this._oboeInterval = null; }
        this._answered = true;
        this.isInputBlocked = true;
        this.awaitingCorrectTap = false;
        this.pendingDefeat = false;
        UIManager.showYomiTelop({}, false);
        this._hideOboe();
        SoundManager.fadeOutBGM();
        StorageManager.save();
        MapScreen.show(["battle-screen"]);
    }
};
