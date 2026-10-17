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

        // しょうごう: 裏面クリアで王冠、九九マスター・わりざんマスターで トロフィー
        const f = GameState.flags;
        let crownText = "", tag = "ポケモンと 九九マスターへの たび";
        if (f.masterCleared && f.divMasterCleared) { crownText = "👑🏆👑"; tag = "〜かけざん・わりざん 最強王〜"; }
        else if (f.divMasterCleared)               { crownText = "🏆";     tag = "〜わりざん マスター〜"; }
        else if (f.masterCleared)                  { crownText = "🏆👑🏆"; tag = "〜でんせつの 九九マスター〜"; }
        else if (f.exCleared)                      { crownText = "👑";     tag = "〜きみこそ 九九最強王！〜"; }
        const crown = document.getElementById("title-crown");
        if (crown) {
            crown.style.display = crownText ? "block" : "none";
            crown.textContent = crownText;
        }
        const titleTag = document.getElementById("title-tag");
        if (titleTag) titleTag.textContent = tag;

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
        // まだ見ていないお祝い演出があれば先にそちらへ（達成順）。
        // 勝利画面から以外（敗北・にげる・タイトル）でマップに戻った場合も取りこぼさない。
        // Ending.close() / EvolveScreen.close() が再び MapScreen.show を呼ぶので、複数たまっていても順番に流れる
        const f = GameState.flags;
        if (GameState.isStageCleared("s34") && !f.endingSeen) {
            f.endingSeen = true; StorageManager.save();
            Ending.show(hideIds); return;
        }
        if (GameState.isStageCleared("ex1") && !f.saikyoouSeen) {
            f.exCleared = true; f.saikyoouSeen = true; StorageManager.save();
            Ending.showSaikyoou(hideIds); return;
        }
        if (GameState.isStageCleared(GameConfig.masterStageId) && !f.masterSeen) {
            f.masterCleared = true; f.masterSeen = true; StorageManager.save();
            Ending.showMaster(hideIds); return;
        }
        // パートナーの しんか
        if (GameState.div.partner && GameState.partnerEvoLevel() > GameState.div.evoSeen) {
            EvolveScreen.show(hideIds); return;
        }
        // 追加コンテンツの おいわい
        for (const c of GameConfig.celebrations) {
            if (GameState.isStageCleared(c.stage) && !f[c.seen]) {
                f[c.seen] = true;
                if (c.cleared) f[c.cleared] = true;
                StorageManager.save();
                Ending.showGeneric(hideIds, c);
                return;
            }
        }
        this.render();
        TransitionManager.fade(hideIds, "map-screen", "block", () => {
            SoundManager.playBGM("bgm_home");
        });
    },

    // いま表示するモード（わりざんは ひらいていて パートナーが いるときだけ）
    currentMode: function() {
        return (GameState.settings.mode === "wari" && GameState.isDivUnlocked() && GameState.div.partner) ? "wari" : "kake";
    },

    // タブで モードを きりかえる
    setMode: function(mode) {
        if (TransitionManager._busy) return;
        if (mode === "wari") {
            if (!GameState.isDivUnlocked()) {
                SoundManager.playSE("wrong");
                this.toast("🔒 かけざんの「ジムボス」を たおすと わりざんが ひらくよ！");
                return;
            }
            SoundManager.playSE("select");
            GameState.settings.mode = "wari";
            StorageManager.save();
            if (!GameState.div.introSeen) { DivIntroScreen.show(["map-screen"]); return; }
            if (!GameState.div.partner) { PartnerScreen.show(["map-screen"], true); return; }
        } else {
            SoundManager.playSE("select");
            GameState.settings.mode = "kake";
            StorageManager.save();
        }
        this.render();
        const scr = document.getElementById("map-screen");
        if (scr) scr.scrollTop = 0;
    },

    _toastTimer: null,
    toast: function(text) {
        const el = document.getElementById("map-toast");
        if (!el) return;
        el.textContent = text;
        el.classList.remove("toast-show");
        void el.offsetWidth;
        el.classList.add("toast-show");
        if (this._toastTimer) clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => el.classList.remove("toast-show"), 2600);
    },

    render: function() {
        const mode = this.currentMode();
        const isWari = mode === "wari";
        const scr = document.getElementById("map-screen");
        if (scr) scr.classList.toggle("mode-wari", isWari);

        // モードのタブ
        const tabK = document.getElementById("map-tab-kake");
        const tabW = document.getElementById("map-tab-wari");
        if (tabK) tabK.classList.toggle("tab-active", !isWari);
        if (tabW) {
            tabW.classList.toggle("tab-active", isWari);
            tabW.classList.toggle("tab-locked", !GameState.isDivUnlocked());
            const isNew = GameState.isDivUnlocked() && !GameState.div.partner;
            tabW.innerHTML = (GameState.isDivUnlocked() ? "➗ わりざん" : "🔒 わりざん") +
                             (isNew ? ' <span class="tab-new">NEW</span>' : "");
        }

        // ヘッダー: かけざん=だんバッジ / わりざん=パートナー
        const badgeWrap = document.getElementById("map-badges");
        const partnerWrap = document.getElementById("map-partner");
        if (badgeWrap) {
            badgeWrap.style.display = isWari ? "none" : "";
            let html = "";
            for (let d = 1; d <= 9; d++) {
                const owned = GameState.badges.includes(d);
                html += '<span class="badge-chip' + (owned ? " badge-owned" : "") + '">' + d + "</span>";
            }
            badgeWrap.innerHTML = html;
        }
        if (partnerWrap) {
            partnerWrap.style.display = isWari ? "" : "none";
            if (isWari) partnerWrap.innerHTML = this._partnerHeaderHtml();
        }
        const statEl = document.getElementById("map-stats");
        if (statEl) {
            const dexText = "📖" + GameState.countDex() + "/" + GameConfig.dexList.length;
            statEl.innerHTML = isWari
                ? "⭐" + GameState.starsOf(GameConfig.divStageOrder) + "　" + dexText + "　🏅わりざん きんマス " + GameState.countGold("d") + "/81"
                : "⭐" + GameState.starsOf(GameConfig.stageOrder) + "　" + dexText + "　🏅きんマス " + GameState.countGold() + "/81";
        }

        // メニュー（モードで なかみが かわる）
        const setBtn = (id, html, show) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (html !== null) el.innerHTML = html;
            el.style.display = show === false ? "none" : "";
        };
        setBtn("map-kuku-btn", isWari ? "🗺️ わりざんマップ" : "🗺️ くくマップ");
        setBtn("map-dress-btn", isWari ? "🤝 パートナー" : "🎀 きせかえ");
        setBtn("map-help-btn", null, isWari);
        if (isWari) {
            const e = GameState.todaysEevee();
            setBtn("map-metamon-btn", '<img src="img/' + e.img + '" alt="" class="menu-icon-img">とっくん' +
                (GameState.isDivTrainingDoneToday() ? ' <span class="metamon-done">きょうはクリアずみ✓</span>' : ' <span class="metamon-new">!</span>'));
        } else {
            setBtn("map-metamon-btn", '<img src="img/メタモン01.gif" alt="" class="menu-icon-img">とっくん' +
                (GameState.isMetamonDoneToday() ? ' <span class="metamon-done">きょうはクリアずみ✓</span>' : ' <span class="metamon-new">!</span>'));
        }

        // ステージノード
        const wrap = document.getElementById("map-stages");
        if (!wrap) return;
        let html = "";
        let currentWorld = 0;
        const order = isWari ? GameConfig.divStageOrder : GameConfig.stageOrder;

        order.forEach(id => {
            const stage = GameConfig.getStage(id);
            if (!stage) return;

            // 指定ステージをクリアするまで非表示（裏面・でんせつワールド・メガシンカ・あまり）
            if (stage.hiddenUntil && !GameState.isStageCleared(stage.hiddenUntil)) return;

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
            // パートナーが しんかする ステージの しるし
            let evoHtml = "";
            if (isWari && GameConfig.partnerEvoStages.indexOf(id) >= 0 && !cleared) {
                evoHtml = '<span class="node-evo">✨ クリアで パートナーが しんか！</span>';
            }

            html += '<div class="' + cls + '" data-stage="' + id + '">' +
                    '<img class="node-img" src="img/' + stage.enemies[0].img + '" alt="">' +
                    '<div class="node-info">' +
                    '<div class="node-name">' + stage.name + "</div>" +
                    '<div class="node-sub">' + stage.subName + "</div>" +
                    starHtml + lockHtml + evoHtml +
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
    },

    // わりざんモードの ヘッダー（パートナーと つぎの しんか）
    _partnerHeaderHtml: function() {
        const p = GameState.partnerDef();
        const form = GameState.partnerForm();
        const lv = GameState.partnerLevel();
        let next = "";
        if (lv < GameConfig.partnerEvoStages.length) {
            const st = GameConfig.getStage(GameConfig.partnerEvoStages[lv]);
            next = "つぎの しんか: 「" + st.name + "」を たおそう";
        } else {
            next = "さいごの すがたに しんかした！";
        }
        return '<div class="partner-head" style="--pc:' + p.color + '">' +
               '<img src="img/' + form.img + '" alt="">' +
               '<div><div class="partner-head-name">' + form.key + ' <span class="partner-type">' + p.type + "</span></div>" +
               '<div class="partner-head-next">' + next + "</div></div></div>";
    },

    // とっくん（かけざん=メタモン / わりざん=イーブイ）
    startTraining: function() {
        if (TransitionManager._busy) return;
        SoundManager.playSE("select");
        if (this.currentMode() === "wari") BattleManager.startDivTraining();
        else BattleManager.startMetamon();
    },

    startMetamon: function() {
        this.startTraining();
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
                const wari = result.stage.mode === "wari";
                costumeEl.innerHTML = result.newCostumes.map(c =>
                    '<div class="new-costume">🎁 ' + (wari ? "ピカチュウの " : "") + "きせかえ「" + c.name + "」を ゲット！" +
                    (wari ? '<br><small>（かけざんの マップで きがえられるよ）</small>' : "") + "</div>").join("");
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
                    const last = result.stage.enemies[result.stage.enemies.length - 1];
                    if (result.trainingKind === "metamon") capText.textContent = "メタモンと なかよくなった！";
                    else if (result.trainingKind === "eevee") capText.textContent = last.key + "と なかよくなった！" + (result.newDex ? " ずかんに とうろく！" : "");
                    else capText.textContent = result.newDex ? "ずかんに とうろく！" : "つかまえた！";
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
            const d = QuestionGenerator.describe(missedFacts[k]);
            html += '<div class="review-row"><b>' + d.shiki + "</b>" +
                    '<span class="review-yomi">' + d.note + "</span></div>";
        });
        el.innerHTML = html;
    },

    // 「マップへ」
    backToMap: function() {
        if (TransitionManager._busy) return;
        SoundManager.playSE("select");
        this._token++;
        // 初クリアのお祝い演出（チャンピオン／最強王／九九マスター）は MapScreen.show が振り分ける
        MapScreen.show(["victory-screen"]);
    },

    // 「もういちど」— リザルト画面から直接バトルワイプで再戦
    retry: function() {
        if (TransitionManager._busy) return;
        SoundManager.playSE("select");
        this._token++;
        const r = this._lastResult;
        this._restart(r, ["victory-screen"]);
    },

    _restart: function(r, fromIds) {
        if (!r) return;
        if (r.trainingKind === "eevee") BattleManager.startDivTraining(fromIds);
        else if (r.isMetamon) BattleManager.startMetamon(fromIds);
        else BattleManager.startStage(r.stage.id, fromIds);
    },

    // --- 敗北 ---
    showDefeat: function(result) {
        this._lastResult = { stage: result.stage, isMetamon: result.isMetamon, trainingKind: result.trainingKind };
        this._renderReviewList("defeat-review", result.missedFacts);
        // わりざんモードは パートナーが つかれる
        const isWari = result.stage.mode === "wari";
        const t = document.getElementById("defeat-title");
        const im = document.getElementById("defeat-pika");
        if (t) t.textContent = (isWari ? GameState.partnerForm().key : "ピカチュウ") + "は つかれた…";
        if (im) {
            im.src = isWari ? GameState.getPartnerImg("wari") : "img/ピカチュウフェイス07.gif";
            im.classList.toggle("defeat-partner", isWari);
        }
        TransitionManager.fade(["battle-screen"], "defeat-screen", "flex", null, "fade-black");
    },

    defeatRetry: function() {
        if (TransitionManager._busy) return;
        SoundManager.playSE("select");
        this._restart(this._lastResult, ["defeat-screen"]);
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
        this._setPika(null);
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
        this._setPika(null);
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

    // 九九マスター認定
    showMaster: function(hideIds) {
        const parade = document.getElementById("ending-parade");
        if (parade) {
            const legends = ["ルギア.png", "レックウザ.png", "ディアルガ.png", "ミュウツー.png", "メガミュウツーX.png", "メガミュウツーY.png"];
            const html = legends.map(f => '<img class="parade-img parade-legend" src="img/' + f + '" alt="">').join("");
            parade.innerHTML = html + html;
        }
        this._setPika(null);
        const title = document.getElementById("ending-title");
        if (title) title.textContent = "🏆 九九マスター にんてい！ 🏆";
        const msg = document.getElementById("ending-msg");
        if (msg) {
            msg.innerHTML = "でんせつの ポケモンたちに ぜんぶ かった！<br>" +
                "はやさも、あなうめも、ぎゃくびきも かんぺき。<br>" +
                "きみは ほんものの <b>九九マスター</b>だ！！<br><br>" +
                "🎁 きせかえ「おいわい」も ゲット！";
        }
        TransitionManager.fade(hideIds, "ending-screen", "flex", () => {
            SoundManager.playBGM("bgm_result");
            SoundManager.playSE("trophy");
        });
    },

    // 追加コンテンツ用（config-div.js の celebrations）
    showGeneric: function(hideIds, c) {
        const parade = document.getElementById("ending-parade");
        if (parade) {
            const html = (c.parade || []).map(f => '<img class="parade-img parade-legend" src="img/' + f + '" alt="">').join("");
            parade.innerHTML = html + html;
        }
        this._setPika(c.partnerImg ? GameState.getPartnerImg("wari") : null);
        const title = document.getElementById("ending-title");
        if (title) title.textContent = c.title;
        const msg = document.getElementById("ending-msg");
        if (msg) msg.innerHTML = c.msg;
        TransitionManager.fade(hideIds, "ending-screen", "flex", () => {
            SoundManager.playBGM("bgm_result");
            SoundManager.playSE("trophy");
        });
    },

    // エンディングの おいわいキャラ（null で ピカチュウ）
    _setPika: function(src) {
        const img = document.getElementById("ending-pika");
        if (img) img.src = src || "img/ピカチュウ_お祝い.gif";
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
    mode: "kake",

    show: function(hideIds) {
        this.mode = MapScreen.currentMode();
        this.render();
        TransitionManager.fade(hideIds, "kuku-screen", "block");
    },

    render: function() {
        const grid = document.getElementById("kuku-grid");
        if (!grid) return;
        const isWari = this.mode === "wari";
        const prefix = isWari ? "d" : "";

        const title = document.getElementById("kuku-title");
        if (title) title.textContent = isWari ? "🗺️ わりざんマップ" : "🗺️ くくマップ";

        let html = '<div class="kuku-cell kuku-header">' + (isWari ? "÷" : "×") + "</div>";
        for (let b = 1; b <= 9; b++) {
            html += '<div class="kuku-cell kuku-header">' + (isWari ? "=" + b : b) + "</div>";
        }
        for (let a = 1; a <= 9; a++) {
            html += '<div class="kuku-cell kuku-header">' + a + "</div>";
            for (let b = 1; b <= 9; b++) {
                const level = GameState.getFactLevel(prefix + a + "x" + b);
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
            const gold = GameState.countGold(prefix);
            let silver = 0;
            for (let a = 1; a <= 9; a++)
                for (let b = 1; b <= 9; b++)
                    if (GameState.getFactLevel(prefix + a + "x" + b) === 2) silver++;
            stat.innerHTML = "🥇きん " + gold + "マス　🥈ぎん " + silver + "マス　" +
                "<span class='kuku-hint-text'>" +
                (isWari ? "マスの かずを たての かずで わると、よこの かずに なるよ（42 ÷ 6 = 7）<br>" : "") +
                "3かい せいかいで ぎん、3びょういないに 3かい せいかいで きん！</span>";
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
        const isWari = this.mode === "wari";
        const q = QuestionGenerator.makeQuestion(a, b, 4, isWari ? "div" : "normal");
        this._practiceQ = q;
        this._practiceAnswered = false;

        const qEl = document.getElementById("kuku-practice-q");
        if (qEl) {
            qEl.innerHTML = isWari
                ? q.c + " ÷ " + a + " = <span class='q-mark'>?</span>"
                : a + " × " + b + " = <span class='q-mark'>?</span>";
        }
        const yomiEl = document.getElementById("kuku-practice-yomi");
        if (yomiEl) yomiEl.textContent = q.yomiQ;
        const fb = document.getElementById("kuku-practice-feedback");
        if (fb) fb.innerHTML = "";

        const optWrap = document.getElementById("kuku-practice-options");
        if (optWrap) {
            optWrap.innerHTML = "";
            const startTime = Date.now();
            q.options.forEach(v => {
                const btn = document.createElement("button");
                btn.className = "option-btn option-small";
                btn.innerHTML = '<span class="ball-icon"></span><span class="option-num">' + QuestionGenerator.optionLabel(q, v) + "</span>";
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

        const d = QuestionGenerator.describe(q);
        const fb = document.getElementById("kuku-practice-feedback");
        if (isCorrect) {
            SoundManager.playSE("correct");
            btn.classList.add("option-answered-correct");
            if (fb) fb.innerHTML = '<div class="practice-ok">⭕ せいかい！ ' + d.note + "</div>";
        } else {
            SoundManager.playSE("wrong");
            btn.classList.add("option-answered-wrong");
            if (fb) fb.innerHTML = '<div class="practice-ng">❌ ' + d.shiki + "<br>" + d.note + "</div>";
        }

        this._closeTimer = setTimeout(() => {
            this._closeTimer = null;
            this.closePractice();
        }, 2000);
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
        let group = null;
        GameConfig.dexList.forEach((d, i) => {
            const owned = !!GameState.dex[d.key];
            if (d.group !== group) {
                group = d.group;
                const inGroup = GameConfig.dexList.filter(x => x.group === group);
                const got = inGroup.filter(x => GameState.dex[x.key]).length;
                html += '<div class="dex-group-title">' + (GameConfig.dexGroups[group] || "") +
                        ' <span class="dex-group-count">' + got + "/" + inGroup.length + "</span></div>";
            }
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
                else if (c.unlock.type === "metamon") condText = "メタモンとっくん" + c.unlock.n + "かいで かいほう";
                else if (c.unlock.type === "ex") condText = "まぼろしの島クリアで かいほう";
                else if (c.unlock.type === "master") condText = "九九マスターけんてい クリアで かいほう";
                else if (c.unlock.type === "stage") condText = "「" + c.unlock.label + "」クリアで かいほう";
                else if (c.unlock.type === "divtrain") condText = "イーブイとっくん" + c.unlock.n + "かいで かいほう";
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

        // わり算: わる数別の正答率・苦手
        const divEl = document.getElementById("report-div-dans");
        if (divEl) {
            let html = "<table class='report-table'><tr><th>わる数</th><th>正答率</th><th>回答数</th></tr>";
            for (let d = 1; d <= 9; d++) {
                const s = GameState.getDanStats(d, "d");
                const total = s.correct + s.wrong;
                let rateText = "—", cls = "";
                if (s.rate !== null) {
                    rateText = s.rate + "%";
                    cls = s.rate >= 80 ? "rate-good" : (s.rate >= 60 ? "rate-mid" : "rate-bad");
                }
                html += "<tr><td>÷" + d + "</td><td class='" + cls + "'>" + rateText + "</td><td>" + total + "</td></tr>";
            }
            divEl.innerHTML = html + "</table>";
        }
        const divWeakEl = document.getElementById("report-div-weak");
        if (divWeakEl) {
            const weak = GameState.getWeakFacts(10, "d");
            if (weak.length === 0) {
                divWeakEl.innerHTML = "<p>苦手な問題は ありません！🎉</p>";
            } else {
                divWeakEl.innerHTML = "<ul class='report-weak-list'>" + weak.map(w =>
                    "<li><b>" + (w.a * w.b) + "÷" + w.a + "＝" + w.b + "</b>（誤答" + GameState.facts[w.key].w + "回）</li>").join("") + "</ul>";
            }
        }

        // マスター状況
        const sumEl = document.getElementById("report-summary");
        if (sumEl) {
            // あまりの ある わり算（キー r*）と 10〜12の段（10以上を ふくむ かけざん）の まとめ
            const agg = (test) => {
                let c = 0, w = 0;
                Object.keys(GameState.facts).forEach(k => { if (test(k)) { c += GameState.facts[k].c; w += GameState.facts[k].w; } });
                return (c + w) > 0 ? Math.round(c / (c + w) * 100) + "%（" + (c + w) + "問）" : "—";
            };
            const isBig = (k) => { const m = k.match(/^(\d+)x(\d+)$/); return !!m && (+m[1] > 9 || +m[2] > 9); };
            sumEl.innerHTML = "九九マスター状況: <b>金" + GameState.countGold() + "</b> / 銀以上" +
                GameState.countSilverPlus() + " / 81マス<br>" +
                "わり算マスター状況: <b>金" + GameState.countGold("d") + "</b> / 銀以上" +
                GameState.countSilverPlus("d") + " / 81マス<br>" +
                "10〜12の段の正答率: " + agg(isBig) + "　あまりのあるわり算: " + agg(k => k.charAt(0) === "r") +
                "<br>合計⭐" + GameState.totalStars();
        }
    },

    back: function() {
        SoundManager.playSE("select");
        SettingsScreen.show(["report-screen"]);
    }
};
