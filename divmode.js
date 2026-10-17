// divmode.js
// わりざんモード専用の画面
//   DivIntroScreen … 「わりざんって なに？」（ミュウが きのみの わけっこで せつめい）
//   PartnerScreen  … パートナーえらび（ニャオハ / ホゲータ / クワッス）
//   EvolveScreen   … パートナーの しんか演出

// ==========================================
//  わりざんの せつめい
// ==========================================
const DivIntroScreen = {
    show: function(hideIds) {
        this.render();
        TransitionManager.fade(hideIds, "divintro-screen", "flex", () => {
            SoundManager.playBGM("bgm_training");
        });
    },

    // 12この きのみが 1こずつ 3びきに くばられていく（CSSアニメ。表示されるたびに最初から）
    render: function() {
        const pile = document.getElementById("divintro-pile");
        const groups = document.getElementById("divintro-groups");
        if (!pile || !groups) return;
        const delay = (k) => (0.9 + k * 0.3).toFixed(2) + "s";

        let pileHtml = "";
        for (let k = 0; k < 12; k++) {
            pileHtml += '<span class="berry berry-out" style="animation-delay:' + delay(k) + '">🍎</span>';
        }
        pile.innerHTML = pileHtml;

        let gh = "";
        GameConfig.partnerOrder.forEach((key, i) => {
            const s = GameConfig.partners[key].line[0];
            let berries = "";
            for (let k = i; k < 12; k += 3) {
                berries += '<span class="berry berry-in" style="animation-delay:' + delay(k) + '">🍎</span>';
            }
            gh += '<div class="divintro-group"><img src="img/' + s.img + '" alt="">' +
                  '<div class="divintro-basket">' + berries + "</div></div>";
        });
        groups.innerHTML = gh;
    },

    next: function() {
        if (TransitionManager._busy) return;
        SoundManager.playSE("select");
        GameState.div.introSeen = true;
        StorageManager.save();
        if (!GameState.div.partner) PartnerScreen.show(["divintro-screen"], true);
        else MapScreen.show(["divintro-screen"]);
    }
};

// ==========================================
//  パートナーえらび
// ==========================================
const PartnerScreen = {
    first: false,     // はじめての えらび（もどるボタンなし → えらぶと マップへ）
    _busy: false,

    show: function(hideIds, first) {
        this.first = !!first;
        this._busy = false;
        const msg = document.getElementById("partner-msg");
        if (msg) msg.textContent = "";
        this.render();
        TransitionManager.fade(hideIds, "partner-screen", "block");
    },

    render: function() {
        const lead = document.getElementById("partner-lead");
        if (lead) {
            lead.innerHTML = this.first
                ? "わりざんの たびの <b>パートナー</b>を えらんでね！<br><small>（あとで かえることも できるよ）</small>"
                : "いっしょに たたかう パートナーを えらぼう！<br><small>しんかは 3びき いっしょに すすむよ</small>";
        }
        const back = document.getElementById("partner-back-btn");
        if (back) back.style.display = this.first ? "none" : "";

        const grid = document.getElementById("partner-grid");
        if (!grid) return;
        const lv = GameState.partnerLevel();
        let html = "";
        GameConfig.partnerOrder.forEach(key => {
            const p = GameConfig.partners[key];
            const form = p.line[lv];
            const selected = GameState.div.partner === key;
            let line = "";
            p.line.forEach((f, i) => {
                line += (i > 0 ? '<span class="evo-arrow">▶</span>' : "") +
                        '<span class="evo-slot"><img class="evo-mini' + (i > lv ? " evo-unknown" : "") + '" src="img/' + f.img + '" alt=""></span>';
            });
            html += '<div class="partner-card' + (selected ? " partner-selected" : "") + '" data-key="' + key + '" style="--pc:' + p.color + '">' +
                    (selected ? '<div class="partner-badge">パートナー</div>' : "") +
                    '<img class="partner-img" src="img/' + form.img + '" alt="">' +
                    '<div class="partner-info">' +
                    '<div class="partner-name">' + form.key + ' <span class="partner-type">' + p.type + "</span></div>" +
                    '<div class="partner-move">' + p.icon + " ひっさつわざ「" + p.moves[lv] + "」</div>" +
                    '<div class="partner-line">' + line + "</div>" +
                    "</div></div>";
        });
        grid.innerHTML = html;
        grid.querySelectorAll(".partner-card").forEach(card => {
            card.addEventListener("click", () => this.choose(card.dataset.key));
        });
    },

    choose: function(key) {
        if (this._busy || TransitionManager._busy) return;
        GameState.div.partner = key;
        GameConfig.partnerOrder.forEach(k => GameState.registerPartnerForms(k));
        StorageManager.save();
        SoundManager.playSE("levelup");
        const form = GameState.partnerForm();
        this.render();
        const msg = document.getElementById("partner-msg");
        if (this.first) {
            this._busy = true;
            if (msg) msg.textContent = "🎉 " + form.key + "が なかまに なった！";
            setTimeout(() => {
                this._busy = false;
                this.first = false;
                MapScreen.show(["partner-screen"]);
            }, 1500);
        } else if (msg) {
            msg.textContent = form.key + "と いっしょに いこう！";
        }
    },

    back: function() {
        if (this._busy || TransitionManager._busy) return;
        SoundManager.playSE("select");
        MapScreen.show(["partner-screen"]);
    }
};

// ==========================================
//  パートナーの しんか
// ==========================================
const EvolveScreen = {
    _token: 0,

    show: function(hideIds) {
        const p = GameState.partnerDef();
        const from = GameState.partnerLevel();
        const to = Math.min(2, from + 1);
        const oldF = p.line[from], newF = p.line[to];

        // 先に しんかを 記録（演出の とちゅうで とじても 二重に でない）
        GameState.div.evoSeen = to;
        GameConfig.partnerOrder.forEach(k => GameState.registerPartnerForms(k));
        StorageManager.save();

        this._token++;
        const t = this._token;
        const img = document.getElementById("evolve-img");
        const text = document.getElementById("evolve-text");
        const sub = document.getElementById("evolve-sub");
        const btn = document.getElementById("evolve-close-btn");
        if (img) { img.src = "img/" + oldF.img; img.className = ""; }
        if (text) text.textContent = "おや…？ " + oldF.key + "の ようすが…！";
        if (sub) sub.textContent = "";
        if (btn) btn.style.visibility = "hidden";

        TransitionManager.fade(hideIds, "evolve-screen", "flex", () => {
            if (t !== this._token) return;
            SoundManager.playSE("evolution");
            if (img) img.classList.add("evo-glow");
            setTimeout(() => {
                if (t !== this._token) return;
                if (img) {
                    img.src = "img/" + newF.img;
                    img.classList.remove("evo-glow");
                    img.classList.add("evo-pop");
                }
                if (text) text.innerHTML = "おめでとう！<br>" + oldF.key + "は <b>" + newF.key + "</b>に しんかした！";
                if (sub) sub.textContent = p.icon + " ひっさつわざ「" + p.moves[to] + "」を おぼえた！";
                SoundManager.playSE("trophy");
                if (btn) btn.style.visibility = "visible";
            }, 3000);
        });
    },

    close: function() {
        if (TransitionManager._busy) return;
        this._token++;
        SoundManager.playSE("select");
        MapScreen.show(["evolve-screen"]);
    }
};
