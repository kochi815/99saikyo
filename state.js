// state.js
// ゲーム状態の一元管理
//
// セーブ対象フィールド一覧（storage.jsのsave/load両方に必ず入れること）:
//   facts, clearedStages, badges, dex, costumes, metamon, settings, flags

const GameState = {

    // ==========================================
    //  81ファクト統計
    //  facts["3x4"] = { n:出題, c:正解, w:誤答, f:3秒以内正解, s:連続正解, cw:連続誤答 }
    // ==========================================
    facts: {},

    // クリア済みステージ { stageId: 星数(1〜3) }
    clearedStages: {},

    // 段バッジ [1,5,2,...]
    badges: [],

    // 図鑑 { "ピチュー": true }
    dex: {},

    // きせかえ { unlocked: ["pika"], selected: "pika" }
    costumes: { unlocked: ["pika"], selected: "pika" },

    // メタモンとっくん { lastClearDate: "2026-08-15", clearCount: 0 }
    metamon: { lastClearDate: null, clearCount: 0 },

    // 設定
    settings: { se: true, bgm: true, slow: false },

    // 各種フラグ { endingSeen: false, exCleared: false }
    flags: { endingSeen: false, exCleared: false, saikyoouSeen: false },

    // ==========================================
    //  ファクト統計API
    // ==========================================
    getFact: function(key) {
        if (!this.facts[key]) {
            this.facts[key] = { n: 0, c: 0, w: 0, f: 0, s: 0, cw: 0 };
        }
        return this.facts[key];
    },

    // 回答を記録（elapsedMs: 回答までの時間）
    recordAnswer: function(key, isCorrect, elapsedMs) {
        const d = this.getFact(key);
        d.n++;
        if (isCorrect) {
            d.c++;
            d.s++;
            d.cw = 0;
            if (elapsedMs !== null && elapsedMs <= GameConfig.battle.criticalTime) d.f++;
        } else {
            d.w++;
            d.s = 0;
            d.cw++;
        }
    },

    // 苦手度: 0(得意)〜2(苦手)。出題エンジンの重み付けに使う
    getWeakness: function(key) {
        const d = this.facts[key];
        if (!d || d.n === 0) return 0.6;       // 未出題はやや出やすく
        if (d.s >= 3) return 0;                // 3連続正解=克服
        if (d.w === 0) return 0;
        return Math.min(2, d.w / Math.max(1, d.c));
    },

    // くくマップ用レベル: 0=未挑戦 1=練習中 2=銀(正解3回) 3=金(3秒以内正解3回)
    getFactLevel: function(key) {
        const d = this.facts[key];
        if (!d || d.n === 0) return 0;
        if (d.f >= 3) return 3;
        if (d.c >= 3) return 2;
        return 1;
    },

    // 銀以上のマス数（裏面解禁判定）
    countSilverPlus: function() {
        let n = 0;
        for (let a = 1; a <= 9; a++)
            for (let b = 1; b <= 9; b++)
                if (this.getFactLevel(a + "x" + b) >= 2) n++;
        return n;
    },

    // 金のマス数
    countGold: function() {
        let n = 0;
        for (let a = 1; a <= 9; a++)
            for (let b = 1; b <= 9; b++)
                if (this.getFactLevel(a + "x" + b) >= 3) n++;
        return n;
    },

    // 苦手TOPn（誤答があり克服していないファクト、苦手度降順）
    getWeakFacts: function(count) {
        const list = [];
        for (let a = 1; a <= 9; a++) {
            for (let b = 1; b <= 9; b++) {
                const key = a + "x" + b;
                const weight = this.getWeakness(key);
                const d = this.facts[key];
                if (d && d.w > 0 && d.s < 3) {
                    list.push({ key: key, a: a, b: b, weight: weight, wrong: d.w });
                }
            }
        }
        list.sort((x, y) => (y.weight - x.weight) || (y.wrong - x.wrong));
        return list.slice(0, count);
    },

    // ==========================================
    //  進行API
    // ==========================================
    isStageCleared: function(stageId) {
        return !!this.clearedStages[stageId];
    },

    getStars: function(stageId) {
        return this.clearedStages[stageId] || 0;
    },

    // 星の合計
    totalStars: function() {
        let n = 0;
        for (const id in this.clearedStages) n += this.clearedStages[id];
        return n;
    },

    // ステージが解禁されているか
    isStageUnlocked: function(stageId) {
        const order = GameConfig.stageOrder;
        const idx = order.indexOf(stageId);
        if (idx < 0) return false;
        if (idx === 0) return true;

        // 裏面は特別条件
        if (stageId === "ex1") {
            return this.isStageCleared("s34") &&
                   this.countSilverPlus() >= GameConfig.exUnlockSilver;
        }
        return this.isStageCleared(order[idx - 1]);
    },

    // クリア登録。stars更新は良い方を残す。図鑑・バッジも登録
    registerClear: function(stageId, stars) {
        const prev = this.clearedStages[stageId] || 0;
        this.clearedStages[stageId] = Math.max(prev, stars);

        const stage = GameConfig.getStage(stageId);
        if (stage) {
            if (stage.badge && !this.badges.includes(stage.badge)) {
                this.badges.push(stage.badge);
            }
            stage.enemies.forEach(e => { this.dex[e.key] = true; });
            if (stageId === "ex1") this.flags.exCleared = true;
        }
        return this.checkCostumeUnlocks();
    },

    // ==========================================
    //  きせかえAPI
    // ==========================================
    checkCostumeUnlocks: function() {
        const stars = this.totalStars();
        const newly = [];
        GameConfig.costumes.forEach(c => {
            if (this.costumes.unlocked.includes(c.key)) return;
            let ok = false;
            if (c.unlock.type === "star" && stars >= c.unlock.n) ok = true;
            if (c.unlock.type === "metamon" && this.metamon.clearCount >= c.unlock.n) ok = true;
            if (c.unlock.type === "ex" && this.flags.exCleared) ok = true;
            if (ok) {
                this.costumes.unlocked.push(c.key);
                newly.push(c);
            }
        });
        return newly;
    },

    // 選択中コスチュームの画像パス
    getPartnerImg: function() {
        const c = GameConfig.costumes.find(x => x.key === this.costumes.selected);
        return "img/" + (c ? c.img : "ピカチュウ01.gif");
    },

    // ==========================================
    //  図鑑API
    // ==========================================
    countDex: function() {
        return Object.keys(this.dex).filter(k => this.dex[k]).length;
    },

    // ==========================================
    //  メタモンとっくん: 今日クリア済みか
    // ==========================================
    isMetamonDoneToday: function() {
        return this.metamon.lastClearDate === this._today();
    },

    registerMetamonClear: function() {
        if (!this.isMetamonDoneToday()) {
            this.metamon.lastClearDate = this._today();
            this.metamon.clearCount++;
        }
        return this.checkCostumeUnlocks();
    },

    _today: function() {
        const d = new Date();
        return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
    },

    // 段ごとの正答率（おうちのひとレポート用）
    getDanStats: function(dan) {
        let c = 0, w = 0;
        for (let b = 1; b <= 9; b++) {
            const d = this.facts[dan + "x" + b];
            if (d) { c += d.c; w += d.w; }
        }
        const total = c + w;
        return { correct: c, wrong: w, rate: total > 0 ? Math.round(c / total * 100) : null };
    }
};
