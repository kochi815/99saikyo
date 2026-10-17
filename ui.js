// ui.js
// バトル画面の表示更新（HPバー・ハート・コンボ・ゲージ・タイマー・実況）

const UIManager = {

    // ひっさつわざ（かけざん=10まんボルト / わりざん=パートナーのわざ）と フェイス表示
    specialMove: { icon: "⚡", name: "10まんボルト" },
    hideFace: false,

    setBattleMode: function(mode) {
        this.specialMove = GameState.specialMove(mode);
        this.hideFace = (mode === "wari");
        const face = document.getElementById("battle-face");
        if (face) face.style.display = this.hideFace ? "none" : "";
    },

    // ==========================================
    //  敵HPバー
    // ==========================================
    updateEnemyHp: function(current, max) {
        const fill = document.getElementById("enemy-hp-fill");
        const text = document.getElementById("enemy-hp-text");
        if (!fill || max <= 0) return;

        const pct = Math.max(0, Math.min(100, current / max * 100));
        fill.style.width = pct + "%";
        fill.classList.remove("hp-warning", "hp-danger");
        if (pct <= 25) fill.classList.add("hp-danger");
        else if (pct <= 50) fill.classList.add("hp-warning");

        if (text) text.textContent = current + "/" + max;
    },

    // ==========================================
    //  プレイヤーのハート
    // ==========================================
    renderHearts: function(current, max) {
        const wrap = document.getElementById("battle-hearts");
        if (!wrap) return;
        let html = "";
        for (let i = 0; i < max; i++) {
            html += '<span class="heart' + (i < current ? "" : " heart-empty") + '">' +
                    (i < current ? "❤" : "🖤") + "</span>";
        }
        wrap.innerHTML = html;
    },

    // ハートが減る演出（最後の生きハートを揺らす）
    shakeHeart: function() {
        const wrap = document.getElementById("battle-hearts");
        if (!wrap) return;
        wrap.classList.remove("hearts-shake");
        void wrap.offsetWidth;
        wrap.classList.add("hearts-shake");
    },

    // ==========================================
    //  コンボ表示
    // ==========================================
    updateCombo: function(n) {
        const el = document.getElementById("battle-combo");
        if (!el) return;
        if (n >= 2) {
            el.style.display = "block";
            el.innerHTML = '<span class="combo-num">' + n + '</span> コンボ！';
            el.classList.remove("combo-pop");
            void el.offsetWidth;
            el.classList.add("combo-pop");
        } else {
            el.style.display = "none";
        }
    },

    // ==========================================
    //  10まんボルトゲージ
    // ==========================================
    updateVoltGauge: function(n, max) {
        const fill = document.getElementById("battle-volt-fill");
        const label = document.getElementById("battle-volt-label");
        if (!fill) return;
        const pct = Math.min(100, n / max * 100);
        fill.style.width = pct + "%";
        const mv = this.specialMove;
        if (n >= max) {
            fill.classList.add("volt-max");
            if (label) label.textContent = mv.icon + mv.name + " じゅんびOK！";
        } else {
            fill.classList.remove("volt-max");
            if (label) label.textContent = mv.icon + "ゲージ " + n + "/" + max;
        }
    },

    // ==========================================
    //  タイマーバー（制限時間の残り）
    // ==========================================
    showTimer: function(show) {
        const wrap = document.getElementById("battle-timer-wrap");
        if (wrap) wrap.style.display = show ? "block" : "none";
    },

    setTimerRatio: function(ratio) {
        const fill = document.getElementById("battle-timer-fill");
        if (!fill) return;
        const pct = Math.max(0, Math.min(100, ratio * 100));
        fill.style.width = pct + "%";
        fill.classList.remove("timer-warning", "timer-danger");
        if (pct <= 30) fill.classList.add("timer-danger");
        else if (pct <= 60) fill.classList.add("timer-warning");
    },

    // ==========================================
    //  実況メッセージ（上部に一時表示）
    // ==========================================
    _commentaryTimer: null,

    showCommentary: function(text, ms) {
        const el = document.getElementById("battle-commentary");
        if (!el) return;
        el.textContent = text;
        el.classList.remove("commentary-show");
        void el.offsetWidth;
        el.classList.add("commentary-show");

        if (this._commentaryTimer) clearTimeout(this._commentaryTimer);
        this._commentaryTimer = setTimeout(() => {
            el.classList.remove("commentary-show");
        }, ms || 1800);
    },

    // ランダム実況
    showRandomCommentary: function(listKey) {
        const list = GameConfig.commentary[listKey];
        if (!list || list.length === 0) return;
        this.showCommentary(list[Math.floor(Math.random() * list.length)]);
    },

    // ==========================================
    //  正誤フェイス（ピカチュウの表情ポップ）
    // ==========================================
    showFace: function(type) {
        const el = document.getElementById("battle-face");
        if (!el || this.hideFace) return;
        const list = GameConfig.faces[type];
        if (!list || list.length === 0) return;
        el.src = "img/" + list[Math.floor(Math.random() * list.length)];
        el.classList.remove("face-pop");
        void el.offsetWidth;
        el.classList.add("face-pop");
    },

    // ==========================================
    //  画面シェイク
    // ==========================================
    triggerShake: function() {
        const scene = document.getElementById("battle-screen");
        if (!scene) return;
        // 遷移時に付く screen-enter の animation が後読みCSSで勝ってしまうため外す
        scene.classList.remove("screen-enter");
        scene.classList.remove("screen-shake");
        void scene.offsetWidth;
        scene.classList.add("screen-shake");
        setTimeout(() => scene.classList.remove("screen-shake"), 400);
    },

    // ==========================================
    //  問題と選択肢の表示
    // ==========================================
    // 問題カードを初期状態に戻す（バトル開始時）
    clearQuestion: function() {
        const qEl = document.getElementById("battle-question");
        const yomiEl = document.getElementById("battle-question-yomi");
        const hintEl = document.getElementById("battle-hint");
        const wrap = document.getElementById("battle-options");
        if (qEl) { qEl.innerHTML = "&nbsp;"; qEl.classList.remove("q-long", "q-xlong"); }
        if (yomiEl) yomiEl.textContent = "";
        if (hintEl) hintEl.style.display = "none";
        if (wrap) { wrap.innerHTML = ""; wrap.classList.remove("options-two"); }
    },

    renderQuestion: function(q, hintText) {
        const qEl = document.getElementById("battle-question");
        const yomiEl = document.getElementById("battle-question-yomi");
        const c = q.c;
        const M = "<span class='q-mark'>?</span>";
        let html, caption, cls = "";
        switch (q.type) {
            case "missing":
                html = (q.missing === "a") ? M + " × " + q.b + " = " + c : q.a + " × " + M + " = " + c;
                caption = "？に はいる かずは？"; cls = "q-long"; break;
            case "reverse":
                html = c + " = " + M + " × " + M;
                caption = "こたえが " + c + " に なる しきは？"; cls = "q-long"; break;
            case "div":
                html = c + " ÷ " + q.a + " = " + M;
                caption = q.yomiQ; break;
            case "divMissing":
                html = (q.missing === "a") ? c + " ÷ " + M + " = " + q.b : M + " ÷ " + q.a + " = " + q.b;
                caption = "？に はいる かずは？"; cls = "q-long"; break;
            case "divReverse":
                html = M + " ÷ " + M + " = " + q.b;
                caption = "こたえが " + q.b + " に なる わりざんは？"; cls = "q-long"; break;
            case "rem":
                html = c + " ÷ " + q.a + " = " + M + " あまり " + M;
                caption = q.yomiQ + "（あまりも こたえよう）"; cls = "q-xlong"; break;
            default:
                html = q.a + " × " + q.b + " = " + M;
                caption = q.yomiQ;
                if (q.big) cls = "q-long";
        }
        if (qEl) {
            qEl.innerHTML = html;
            qEl.classList.remove("q-long", "q-xlong");
            if (cls) qEl.classList.add(cls);
        }
        if (yomiEl) yomiEl.textContent = caption;

        const hintEl = document.getElementById("battle-hint");
        if (hintEl) {
            if (hintText) {
                hintEl.style.display = "block";
                hintEl.innerHTML = hintText;
            } else {
                hintEl.style.display = "none";
            }
        }

        const wrap = document.getElementById("battle-options");
        if (!wrap) return;
        wrap.innerHTML = "";
        q.options.forEach((v, i) => {
            const btn = document.createElement("button");
            btn.className = "option-btn";
            btn.dataset.value = v;
            btn.innerHTML = '<span class="ball-icon"></span><span class="option-num' +
                            QuestionGenerator.optionClass(q) + '">' +
                            QuestionGenerator.optionLabel(q, v) + "</span>";
            btn.addEventListener("click", () => BattleManager.onAnswer(i, v, btn));
            wrap.appendChild(btn);
        });
        // 2択（ヒントモード）のときは大きく
        wrap.classList.toggle("options-two", q.options.length === 2);
    },

    // 選択肢ボタンの有効/無効
    setOptionsEnabled: function(enabled) {
        document.querySelectorAll("#battle-options .option-btn").forEach(btn => {
            btn.disabled = !enabled;
            btn.classList.toggle("option-locked", !enabled);
        });
    },

    // 誤答後: 正解ボタンを光らせて、それ以外を暗くする
    highlightCorrect: function(answer) {
        document.querySelectorAll("#battle-options .option-btn").forEach(btn => {
            const v = parseInt(btn.dataset.value, 10);
            if (v === answer) {
                btn.disabled = false;
                btn.classList.remove("option-locked");
                btn.classList.add("option-correct-glow");
            } else {
                btn.disabled = true;
                btn.classList.add("option-dimmed");
            }
        });
    },

    // 唱え読みテロップ
    showYomiTelop: function(q, show, extra) {
        const el = document.getElementById("battle-yomi-telop");
        if (!el) return;
        if (show) {
            const d = QuestionGenerator.describe(q);
            el.innerHTML = (extra ? '<div class="yomi-extra">' + extra + "</div>" : "") +
                           '<div class="yomi-answer">' + d.shiki + "</div>" +
                           (d.note ? '<div class="yomi-text">' + d.note + "</div>" : "") +
                           '<div class="yomi-guide">ひかっている こたえを タップ！</div>';
            el.style.display = "block";
        } else {
            el.style.display = "none";
        }
    },

    // ==========================================
    //  敵の見た目
    // ==========================================
    setEnemy: function(enemy) {
        const img = document.getElementById("enemy-img");
        const name = document.getElementById("enemy-name");
        if (img) {
            img.src = "img/" + enemy.img;
            // 前のバトルの演出クラス（撃破で透明化 等）を必ずリセット
            img.classList.remove("enemy-rage", "enemy-dynamax", "enemy-mega", "enemy-defeated", "enemy-hit", "enemy-attack", "enemy-transform");
        }
        if (name) name.textContent = enemy.key;
    },

    // 変身（おこる / キョダイマックス / メガシンカ / しんか / おめんチェンジ）
    //   style: "rage"(既定) / "dynamax" / "mega" / "evolve" / "mask"
    setEnemyRage: function(rageImg, style, newName) {
        const img = document.getElementById("enemy-img");
        if (!img) return;
        if (rageImg) img.src = "img/" + rageImg;
        const cls = { rage: "enemy-rage", dynamax: "enemy-dynamax", mega: "enemy-mega" }[style || "rage"];
        if (cls) img.classList.add(cls);
        img.classList.remove("enemy-transform");
        void img.offsetWidth;
        img.classList.add("enemy-transform");
        const onEnd = (e) => {
            if (e.animationName !== "enemyTransform") return;
            img.classList.remove("enemy-transform");
            img.removeEventListener("animationend", onEnd);
        };
        img.addEventListener("animationend", onEnd);
        // animationend が こない場合（画面が かくれている 等）の ほけん
        BattleManager._later(900, () => {
            img.classList.remove("enemy-transform");
            img.removeEventListener("animationend", onEnd);
        });
        if (newName) {
            const name = document.getElementById("enemy-name");
            if (name) name.textContent = newName;
        }
    },

    // パートナーの見た目（かけざん=ピカチュウ / わりざん=パルデアの パートナー）
    setPartner: function(mode) {
        const img = document.getElementById("player-img");
        if (!img) return;
        img.src = GameState.getPartnerImg(mode);
        img.classList.remove("partner-evo-0", "partner-evo-1", "partner-evo-2");
        if (mode === "wari") img.classList.add("partner-evo-" + GameState.partnerLevel());
    }
};
