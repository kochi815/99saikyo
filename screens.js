// screens.js
// バトル以外の全画面: タイトル / マップ / リザルト / くくマップ / ずかん / きせかえ / せってい / レポート

// ==========================================
//  タイトル画面
// ==========================================
const TitleScreen = {
    show: function(hideIds) {
        this.render();
        if (hideIds) {
            TransitionManager.fade(hideIds, "title-screen", "flex", () => {
                SoundManager.playBGM("bgm_title");
            });
        } else {
            document.getElementById("title-screen").style.display = "flex";
        }
    },

    render: function() {
        // 月替わりピカチュウ
        const month = new Date().getMonth() + 1;
        const img = document.getElementById("title-pika");
        if (img) img.src = "img/" + (GameConfig.monthlyPika[month] || "ピカチュウ01.gif");

        // 裏面クリアで王冠
        const crown = document.getElementById("title-crown");
        if (crown) crown.style.display = GameState.flags.exCleared ? "block" : "none";

        const titleTag = document.getElementById("title-tag");
        if (titleTag) {
            titleTag.textContent = GameState.flags.exCleared ? "〜きみこそ 九九最強王！〜" : "ポケモンと 九九マスターへの たび";
        }

        // はじめる／つづきから
        const btn = document.getElementById("title-start-btn");
        if (btn) btn.textContent = StorageManager.hasSave() ? "つづきから" : "はじめる";
    },

    start: function() {
        SoundManager.playSE("select");
        MapScreen.show(["title-screen"]);
    }
};

// ==========================================
//  マップ画面（ステージ選択）
// ==========================================
const MapScreen = {
    show: function(hideIds) {
        this.render();
        TransitionManager.fade(hideIds, "map-screen", "block", () => {
            SoundManager.playBGM("bgm_home");
        });
    },

    render: function() {
        // ヘッダー: バッジ・星・ずかん・金マス
        const badgeWrap = document.getElementById("map-badges");
        if (badgeWrap) {
            let html = "";
            for (let d = 1; d <= 9; d++) {
                const owned = GameState.badges.includes(d);
                html += '<span class="badge-chip' + (owned ? " badge-owned" : "") + '">' + d + "</span>";
            }
            badgeWrap.innerHTML = html;
        }
        const statEl = document.getElementById("map-stats");
        if (statEl) {
            statEl.innerHTML =
                "⭐" + GameState.totalStars() +
                "　📖" + GameState.countDex() + "/" + GameConfig.dexList.length +
                "　🏅きんマス " + GameState.countGold() + "/81";
        }

        // ステージノード
        const wrap = document.getElementById("map-stages");
        if (!wrap) return;
        let html = "";
        let currentWorld = 0;

        GameConfig.stageOrder.forEach(id => {
            const stage = GameConfig.getStage(id);
            if (!stage) return;

            // 裏面はs34クリアまで非表示
            if (stage.secret && !GameState.isStageCleared("s34")) return;

            if (stage.world !== currentWorld) {
                currentWorld = stage.world;
                html += '<div class="map-world-title">' + GameConfig.worlds[stage.world].name + "</div>";
            }

            const unlocked = GameState.isStageUnlocked(id);
            const stars = GameState.getStars(id);
            const cleared = stars > 0;
            let cls = "map-node";
            if (!unlocked) cls += " node-locked";
            else if (!cleared) cls += " node-next";
            else cls += " node-cleared";
            if (stage.boss) cls += " node-boss";

            let starHtml = "";
            if (cleared) {
                starHtml = '<span class="node-stars">' + "★".repeat(stars) + "☆".repeat(3 - stars) + "</span>";
            }

            let lockHtml = "";
            if (!unlocked) {
                if (id === "ex1") {
                    lockHtml = '<span class="node-lock">🔒 くくマップ ぎん60マスで かいほう (' +
                               GameState.countSilverPlus() + "/60)</span>";
                } else {
                    lockHtml = '<span class="node-lock">🔒</span>';
                }
            }

            html += '<div class="' + cls + '" data-stage="' + id + '">' +
                    '<img class="node-img" src="img/' + stage.enemies[0].img + '" alt="">' +
                    '<div class="node-info">' +
                    '<div class="node-name">' + stage.name + "</div>" +
                    '<div class="node-sub">' + stage.subName + "</div>" +
                    starHtml + lockHtml +
                    "</div></div>";
        });
        wrap.innerHTML = html;

        // クリック登録
        wrap.querySelectorAll(".map-node").forEach(node => {
            node.addEventListener("click", () => {
                if (TransitionManager._busy) return;
                const id = node.dataset.stage;
                if (!GameState.isStageUnlocked(id)) {
                    SoundManager.playSE("wrong");
                    node.classList.remove("node-shake");
                    void node.offsetWidth;
                    node.classList.add("node-shake");
                    return;
                }
                SoundManager.playSE("select");
                BattleManager.startStage(id);
            });
        });

        // メタモンとっくんの表示
        const metaBtn = document.getElementById("map-metamon-btn");
        if (metaBtn) {
            metaBtn.innerHTML = '<img src="img/メタモン01.gif" alt="" class="menu-icon-img">とっくん' +
                (GameState.isMetamonDoneToday() ? ' <span class="metamon-done">きょうはクリアずみ✓</span>' : ' <span class="metamon-new">!</span>');
        }
    },

    startMetamon: function() {
        if (TransitionManager._busy) return;
        SoundManager.playSE("select");
        BattleManager.startMetamon();
    }
};

// ==========================================
//  リザルト画面（勝利・敗北）
// ==========================================
const ResultScreen = {
    _lastResult: null,
    _token: 0,     // 画面を離れたら演出タイマーを無効化するためのトークン

    _later: function(ms, fn) {
        const t = this._token;
        setTimeout(() => { if (t === this._token) fn(); }, ms);
    },

    showVictory: function(result) {
        this._token++;
        this._lastResult = result;
        const stage = result.stage;

        // 見出し
        const title = document.getElementById("victory-title");
        if (title) {
            title.textContent = result.isMetamon ? "とっくん クリア！" : "しょうり！";
        }

        // 捕獲演出エリア
        const capImg = document.getElementById("victory-pokemon");
        const lastEnemy = stage.enemies[stage.enemies.length - 1];
        if (capImg) {
            capImg.src = "img/" + lastEnemy.img;
            capImg.classList.remove("capture-anim");
        }
        const ball = document.getElementById("victory-ball");
        if (ball) ball.classList.remove("ball-anim");
        const capText = document.getElementById("victory-capture-text");
        if (capText) capText.textContent = "";

        // 星
        const starEl = document.getElementById("victory-stars");
        if (starEl) {
            starEl.innerHTML = "";
        }

        // 統計
        const statEl = document.getElementById("victory-stats");
        if (statEl) {
            statEl.innerHTML =
                '<div class="vstat"><span>せいかい</span><b>' + result.correct + "</b></div>" +
                '<div class="vstat"><span>ミス</span><b>' + result.wrong + "</b></div>" +
                '<div class="vstat"><span>さいだいコンボ</span><b>' + result.maxCombo + "</b></div>" +
                '<div class="vstat"><span>3びょういない</span><b>' + result.critRate + "%</b></div>";
        }

        // 復習リスト（今回の誤答）
        this._renderReviewList("victory-review", result.missedFacts);

        // 新きせかえ
        const costumeEl = document.getElementById("victory-costumes");
        if (costumeEl) {
            if (result.newCostumes && result.newCostumes.length > 0) {
                costumeEl.innerHTML = result.newCostumes.map(c =>
                    '<div class="new-costume">🎁 きせかえ「' + c.name + '」を ゲット！</div>').join("");
            } else {
                costumeEl.innerHTML = "";
            }
        }

        TransitionManager.fade(["battle-screen"], "victory-screen", "flex", () => {
            SoundManager.playBGM("bgm_result");
            this._playCapture(result);
        });
    },

    // 捕獲アニメ→星表示
    _playCapture: function(result) {
        const capImg = document.getElementById("victory-pokemon");
        const ball = document.getElementById("victory-ball");
        const capText = document.getElementById("victory-capture-text");

        this._later(600, () => {
            if (ball) {
                ball.classList.remove("ball-anim");
                void ball.offsetWidth;
                ball.classList.add("ball-anim");
            }
            if (capImg) {
                capImg.classList.remove("capture-anim");
                void capImg.offsetWidth;
                capImg.classList.add("capture-anim");
            }
            SoundManager.playSE("evolution");
            this._later(1400, () => {
                if (capText) {
                    capText.textContent = result.isMetamon ? "メタモンと なかよくなった！" : "ずかんに とうろく！";
                }
                this._showStars(result.stars);
            });
        });
    },

    _showStars: function(stars) {
        const starEl = document.getElementById("victory-stars");
        if (!starEl) return;
        starEl.innerHTML = "";
        for (let i = 1; i <= 3; i++) {
            this._later(i * 400, () => {
                const s = document.createElement("span");
                s.className = "victory-star" + (i <= stars ? " star-on" : " star-off");
                s.textContent = i <= stars ? "★" : "☆";
                starEl.appendChild(s);
                if (i <= stars) SoundManager.playSE("trophy");
            });
        }
    },

    _renderReviewList: function(elId, missedFacts) {
        const el = document.getElementById(elId);
        if (!el) return;
        const keys = Object.keys(missedFacts || {});
        if (keys.length === 0) {
            el.innerHTML = '<div class="review-perfect">🎉 パーフェクト！ ぜんもん せいかい！</div>';
            return;
        }
        let html = '<div class="review-title">📝 こんかいの ふくしゅう</div>';
        keys.forEach(k => {
            const q = missedFacts[k];
            html += '<div class="review-row"><b>' + q.a + " × " + q.b + " = " + q.answer + "</b>" +
                    '<span class="review-yomi">「' + q.yomi + '」</span></div>';
        });
        el.innerHTML = html;
    },

    // 「マップへ」
    backToMap: function() {
        if (TransitionManager._busy) return;
        SoundManager.playSE("select");
        this._token++;
        const r = this._lastResult;

        // チャンピオン初クリア→エンディング
        if (r && !r.isMetamon && r.stage.id === "s34" && !GameState.flags.endingSeen) {
            GameState.flags.endingSeen = true;
            StorageManager.save();
            Ending.show(["victory-screen"]);
            return;
        }
        // 裏面クリア→王冠のお祝い（初回のみ。「もういちど」で飛ばしても次回マップへ戻る時に見られる）
        if (r && !r.isMetamon && r.stage.id === "ex1" &&
            GameState.flags.exCleared && !GameState.flags.saikyoouSeen) {
            GameState.flags.saikyoouSeen = true;
            StorageManager.save();
            Ending.showSaikyoou(["victory-screen"]);
            return;
        }
        MapScreen.show(["victory-screen"]);
    },

    // 「もういちど」— リザルト画面から直接バトルワイプで再戦
    retry: function() {
        if (TransitionManager._busy) return;
        SoundManager.playSE("select");
        this._token++;
        const r = this._lastResult;
        if (r && r.isMetamon) BattleManager.startMetamon(["victory-screen"]);
        else if (r) BattleManager.startStage(r.stage.id, ["victory-screen"]);
    },

    // --- 敗北 ---
    showDefeat: function(result) {
        this._lastResult = { stage: result.stage, isMetamon: result.isMetamon };
        this._renderReviewList("defeat-review", result.missedFacts);
        TransitionManager.fade(["battle-screen"], "defeat-screen", "flex", null, "fade-black");
    },

    defeatRetry: function() {
        if (TransitionManager._busy) return;
        SoundManager.playSE("select");
        const r = this._lastResult;
        if (r && r.isMetamon) BattleManager.startMetamon(["defeat-screen"]);
        else if (r) BattleManager.startStage(r.stage.id, ["defeat-screen"]);
    },

    defeatToMap: function() {
        SoundManager.playSE("select");
        MapScreen.show(["defeat-screen"]);
    }
};

// ==========================================
//  エンディング
// ==========================================
const Ending = {
    show: function(hideIds) {
        // 捕まえたポケモンのパレード
        const parade = document.getElementById("ending-parade");
        if (parade) {
            let html = "";
            GameConfig.dexList.forEach(d => {
                if (GameState.dex[d.key]) {
                    html += '<img class="parade-img" src="img/' + d.img + '" alt="">';
                }
            });
            parade.innerHTML = html + html;  // ループ用に2周分
        }
        const title = document.getElementById("ending-title");
        if (title) title.textContent = "🏆 九九チャンピオン にんてい！ 🏆";
        const msg = document.getElementById("ending-msg");
        if (msg) {
            msg.innerHTML = "きみは ポケモンたちと いっしょに<br>九九を マスターした！<br><br>" +
                "うらワールド「まぼろしの島」が まっている…！";
        }
        TransitionManager.fade(hideIds, "ending-screen", "flex", () => {
            SoundManager.playBGM("bgm_result");
            SoundManager.playSE("trophy");
        });
    },

    showSaikyoou: function(hideIds) {
        const parade = document.getElementById("ending-parade");
        if (parade) parade.innerHTML = '<img class="parade-img parade-big" src="img/ミュウ01.gif" alt="">';
        const title = document.getElementById("ending-title");
        if (title) title.textContent = "👑 しょうごう「九九最強王」かくとく！ 👑";
        const msg = document.getElementById("ending-msg");
        if (msg) {
            msg.innerHTML = "3びょうの ミュウに かった！<br>きみこそ ほんものの 九九最強王だ！！<br><br>" +
                "🎁 きせかえ「ライチュウ」も ゲット！";
        }
        TransitionManager.fade(hideIds, "ending-screen", "flex", () => {
            SoundManager.playBGM("bgm_result");
            SoundManager.playSE("trophy");
        });
    },

    close: function() {
        SoundManager.playSE("select");
        TitleScreen.render();
        MapScreen.show(["ending-screen"]);
    }
};

// ==========================================
//  くくマップ（81マス）
// ==========================================
const KukuScreen = {
    show: function(hideIds) {
        this.render();
        TransitionManager.fade(hideIds, "kuku-screen", "block");
    },

    render: function() {
        const grid = document.getElementById("kuku-grid");
        if (!grid) return;

        let html = '<div class="kuku-cell kuku-header">×</div>';
        for (let b = 1; b <= 9; b++) {
            html += '<div class="kuku-cell kuku-header">' + b + "</div>";
        }
        for (let a = 1; a <= 9; a++) {
            html += '<div class="kuku-cell kuku-header">' + a + "</div>";
            for (let b = 1; b <= 9; b++) {
                const level = GameState.getFactLevel(a + "x" + b);
                const cls = ["kuku-new", "kuku-learning", "kuku-silver", "kuku-gold"][level];
                html += '<div class="kuku-cell kuku-fact ' + cls + '" data-a="' + a + '" data-b="' + b + '">' +
                        (level > 0 ? a * b : "?") + "</div>";
            }
        }
        grid.innerHTML = html;

        grid.querySelectorAll(".kuku-fact").forEach(cell => {
            cell.addEventListener("click", () => {
                SoundManager.playSE("select");
                this.practice(parseInt(cell.dataset.a, 10), parseInt(cell.dataset.b, 10));
            });
        });

        const stat = document.getElementById("kuku-stats");
        if (stat) {
            let gold = GameState.countGold();
            let silver = 0;
            for (let a = 1; a <= 9; a++)
                for (let b = 1; b <= 9; b++)
                    if (GameState.getFactLevel(a + "x" + b) === 2) silver++;
            stat.innerHTML = "🥇きん " + gold + "マス　🥈ぎん " + silver + "マス　" +
                "<span class='kuku-hint-text'>3かい せいかいで ぎん、3びょういないに 3かい せいかいで きん！</span>";
        }
    },

    // マスをタップして1問練習
    _practiceQ: null,
    _practiceAnswered: false,
    _closeTimer: null,

    practice: function(a, b) {
        const modal = document.getElementById("kuku-practice");
        if (!modal) return;
        if (this._closeTimer) { clearTimeout(this._closeTimer); this._closeTimer = null; }
        this._practiceQ = QuestionGenerator.makeQuestion(a, b, 4);
        this._practiceAnswered = false;

        const qEl = document.getElementById("kuku-practice-q");
        if (qEl) qEl.innerHTML = a + " × " + b + " = <span class='q-mark'>?</span>";
        const yomiEl = document.getElementById("kuku-practice-yomi");
        if (yomiEl) yomiEl.textContent = this._practiceQ.yomiQ;
        const fb = document.getElementById("kuku-practice-feedback");
        if (fb) fb.innerHTML = "";

        const optWrap = document.getElementById("kuku-practice-options");
        if (optWrap) {
            optWrap.innerHTML = "";
            const startTime = Date.now();
            this._practiceQ.options.forEach(v => {
                const btn = document.createElement("button");
                btn.className = "option-btn option-small";
                btn.innerHTML = '<span class="ball-icon"></span><span class="option-num">' + v + "</span>";
                btn.addEventListener("click", () => this._onPracticeAnswer(v, btn, startTime));
                optWrap.appendChild(btn);
            });
        }
        modal.style.display = "flex";
    },

    _onPracticeAnswer: function(value, btn, startTime) {
        if (this._practiceAnswered) return;
        this._practiceAnswered = true;

        const q = this._practiceQ;
        const elapsed = Date.now() - startTime;
        const isCorrect = value === q.answer;
        GameState.recordAnswer(q.key, isCorrect, elapsed);
        StorageManager.save();

        const fb = document.getElementById("kuku-practice-feedback");
        if (isCorrect) {
            SoundManager.playSE("correct");
            btn.classList.add("option-answered-correct");
            if (fb) fb.innerHTML = '<div class="practice-ok">⭕ せいかい！ 「' + q.yomi + "」</div>";
        } else {
            SoundManager.playSE("wrong");
            btn.classList.add("option-answered-wrong");
            if (fb) fb.innerHTML = '<div class="practice-ng">❌ こたえは <b>' + q.answer + "</b>！ 「" + q.yomi + "」</div>";
        }

        this._closeTimer = setTimeout(() => {
            this._closeTimer = null;
            this.closePractice();
        }, 1600);
    },

    closePractice: function() {
        if (this._closeTimer) { clearTimeout(this._closeTimer); this._closeTimer = null; }
        const modal = document.getElementById("kuku-practice");
        if (modal) modal.style.display = "none";
        // 手動で閉じても回答結果をグリッド色に反映
        this.render();
    },

    back: function() {
        SoundManager.playSE("select");
        MapScreen.show(["kuku-screen"]);
    }
};

// ==========================================
//  ずかん
// ==========================================
const DexScreen = {
    show: function(hideIds) {
        this.render();
        TransitionManager.fade(hideIds, "dex-screen", "block");
    },

    render: function() {
        const grid = document.getElementById("dex-grid");
        if (!grid) return;
        let html = "";
        GameConfig.dexList.forEach((d, i) => {
            const owned = !!GameState.dex[d.key];
            html += '<div class="dex-card' + (owned ? " dex-owned" : " dex-unknown") +
                    (d.boss ? " dex-boss" : "") + '" data-idx="' + i + '">' +
                    '<img src="img/' + d.img + '" alt="">' +
                    '<div class="dex-name">' + (owned ? d.key : "？？？") + "</div></div>";
        });
        grid.innerHTML = html;

        grid.querySelectorAll(".dex-card.dex-owned").forEach(card => {
            card.addEventListener("click", () => {
                const d = GameConfig.dexList[parseInt(card.dataset.idx, 10)];
                this.showBig(d);
            });
        });

        const count = document.getElementById("dex-count");
        if (count) {
            const n = GameState.countDex();
            const total = GameConfig.dexList.length;
            count.textContent = n >= total ? "🎉 ずかん コンプリート！" : "あと " + (total - n) + "ひき！（" + n + "/" + total + "）";
        }
    },

    showBig: function(d) {
        SoundManager.playSE("select");
        const overlay = document.getElementById("dex-big");
        const img = document.getElementById("dex-big-img");
        const name = document.getElementById("dex-big-name");
        if (img) img.src = "img/" + d.img;
        if (name) name.textContent = d.key;
        if (overlay) overlay.style.display = "flex";
    },

    closeBig: function() {
        const overlay = document.getElementById("dex-big");
        if (overlay) overlay.style.display = "none";
    },

    back: function() {
        SoundManager.playSE("select");
        MapScreen.show(["dex-screen"]);
    }
};

// ==========================================
//  きせかえ
// ==========================================
const DressScreen = {
    show: function(hideIds) {
        this.render();
        TransitionManager.fade(hideIds, "dress-screen", "block");
    },

    render: function() {
        const grid = document.getElementById("dress-grid");
        if (!grid) return;
        let html = "";
        GameConfig.costumes.forEach(c => {
            const unlocked = GameState.costumes.unlocked.includes(c.key);
            const selected = GameState.costumes.selected === c.key;
            let condText = "";
            if (!unlocked) {
                if (c.unlock.type === "star") condText = "⭐" + c.unlock.n + "こで かいほう";
                else if (c.unlock.type === "metamon") condText = "とっくん" + c.unlock.n + "かいで かいほう";
                else if (c.unlock.type === "ex") condText = "まぼろしの島クリアで かいほう";
            }
            html += '<div class="dress-card' + (unlocked ? " dress-unlocked" : " dress-locked") +
                    (selected ? " dress-selected" : "") + '" data-key="' + c.key + '">' +
                    '<img src="img/' + c.img + '" alt="">' +
                    '<div class="dress-name">' + c.name + "</div>" +
                    (selected ? '<div class="dress-badge">そうびちゅう</div>' : "") +
                    (condText ? '<div class="dress-cond">' + condText + "</div>" : "") +
                    "</div>";
        });
        grid.innerHTML = html;

        grid.querySelectorAll(".dress-card.dress-unlocked").forEach(card => {
            card.addEventListener("click", () => {
                GameState.costumes.selected = card.dataset.key;
                StorageManager.save();
                SoundManager.playSE("levelup");
                this.render();
            });
        });
    },

    back: function() {
        SoundManager.playSE("select");
        MapScreen.show(["dress-screen"]);
    }
};

// ==========================================
//  せってい
// ==========================================
const SettingsScreen = {
    _resetArmed: false,

    show: function(hideIds) {
        this.render();
        TransitionManager.fade(hideIds, "settings-screen", "block");
    },

    render: function() {
        this._setToggle("settings-se", GameState.settings.se);
        this._setToggle("settings-bgm", GameState.settings.bgm);
        this._setToggle("settings-slow", GameState.settings.slow);
        this._resetArmed = false;
        const resetBtn = document.getElementById("settings-reset-btn");
        if (resetBtn) {
            resetBtn.textContent = "データを けす";
            resetBtn.classList.remove("reset-armed");
        }
    },

    _setToggle: function(id, on) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = on ? "ON" : "OFF";
            el.classList.toggle("toggle-on", on);
        }
    },

    toggleSE: function() {
        GameState.settings.se = !GameState.settings.se;
        SoundManager.setSEEnabled(GameState.settings.se);
        SoundManager.playSE("select");
        StorageManager.save();
        this.render();
    },

    toggleBGM: function() {
        GameState.settings.bgm = !GameState.settings.bgm;
        SoundManager.setBGMEnabled(GameState.settings.bgm);
        if (GameState.settings.bgm) SoundManager.playBGM("bgm_home");
        StorageManager.save();
        this.render();
    },

    toggleSlow: function() {
        GameState.settings.slow = !GameState.settings.slow;
        SoundManager.playSE("select");
        StorageManager.save();
        this.render();
    },

    // 2段階確認でリセット
    resetData: function() {
        const btn = document.getElementById("settings-reset-btn");
        if (!this._resetArmed) {
            this._resetArmed = true;
            if (btn) {
                btn.textContent = "ほんとうに けす？（もういちど おすと きえる）";
                btn.classList.add("reset-armed");
            }
            setTimeout(() => {
                this._resetArmed = false;
                if (btn) {
                    btn.textContent = "データを けす";
                    btn.classList.remove("reset-armed");
                }
            }, 4000);
            return;
        }
        StorageManager.clear();
        location.reload();
    },

    back: function() {
        SoundManager.playSE("select");
        MapScreen.show(["settings-screen"]);
    }
};

// ==========================================
//  おうちのひとへ（学習レポート）
// ==========================================
const ReportScreen = {
    show: function(hideIds) {
        this.render();
        TransitionManager.fade(hideIds, "report-screen", "block");
    },

    render: function() {
        // 段別正答率
        const danEl = document.getElementById("report-dans");
        if (danEl) {
            let html = "<table class='report-table'><tr><th>だん</th><th>正答率</th><th>回答数</th></tr>";
            for (let d = 1; d <= 9; d++) {
                const s = GameState.getDanStats(d);
                const total = s.correct + s.wrong;
                let rateText = "—";
                let cls = "";
                if (s.rate !== null) {
                    rateText = s.rate + "%";
                    cls = s.rate >= 80 ? "rate-good" : (s.rate >= 60 ? "rate-mid" : "rate-bad");
                }
                html += "<tr><td>" + d + "の段</td><td class='" + cls + "'>" + rateText + "</td><td>" + total + "</td></tr>";
            }
            html += "</table>";
            danEl.innerHTML = html;
        }

        // 苦手ワースト10
        const weakEl = document.getElementById("report-weak");
        if (weakEl) {
            const weak = GameState.getWeakFacts(10);
            if (weak.length === 0) {
                weakEl.innerHTML = "<p>苦手な問題は ありません！🎉</p>";
            } else {
                let html = "<ul class='report-weak-list'>";
                weak.forEach(w => {
                    const d = GameState.facts[w.key];
                    html += "<li><b>" + w.a + "×" + w.b + "＝" + (w.a * w.b) + "</b>（誤答" + d.w + "回）</li>";
                });
                html += "</ul>";
                weakEl.innerHTML = html;
            }
        }

        // マスター状況
        const sumEl = document.getElementById("report-summary");
        if (sumEl) {
            sumEl.innerHTML = "九九マスター状況: <b>金" + GameState.countGold() + "</b> / 銀以上" +
                GameState.countSilverPlus() + " / 81マス　　合計⭐" + GameState.totalStars();
        }
    },

    back: function() {
        SoundManager.playSE("select");
        SettingsScreen.show(["report-screen"]);
    }
};
