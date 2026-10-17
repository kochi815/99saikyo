// state.js
// ゲーム状態の一元管理
//
// セーブ対象フィールド一覧（storage.jsのsave/load両方に必ず入れること）:
//   facts, clearedStages, badges, dex, costumes, metamon, settings, flags, div

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

    // 設定（mode: マップの表示モード "kake"=かけざん / "wari"=わりざん）
    settings: { se: true, bgm: true, slow: false, mode: "kake" },

    // 各種フラグ: endingSeen(チャンピオン演出済) / exCleared・saikyoouSeen(裏面) / masterCleared・masterSeen(九九マスター)
    //   megaCleared・megaSeen(メガシンカの とう) / divMasterCleared・divMasterSeen(わりざんマスター) / remCleared・remSeen(あまり)
    flags: { endingSeen: false, exCleared: false, saikyoouSeen: false, masterCleared: false, masterSeen: false,
             megaCleared: false, megaSeen: false, divMasterCleared: false, divMasterSeen: false, remCleared: false, remSeen: false },

    // わりざんモード
    //   partner: "nyaoha"|"hogeta"|"kuwassu"  introSeen: せつめいを みた  evoSeen: みせた しんか段階(0〜2)
    //   training: イーブイとっくん { lastClearDate, clearCount, todayDate, todayKey }
    div: { partner: null, introSeen: false, evoSeen: 0,
           training: { lastClearDate: null, clearCount: 0, todayDate: null, todayKey: null } },

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

    // 銀以上のマス数（裏面解禁判定）。prefix "d" で わりざんマップ
    countSilverPlus: function(prefix) {
        prefix = prefix || "";
        let n = 0;
        for (let a = 1; a <= 9; a++)
            for (let b = 1; b <= 9; b++)
                if (this.getFactLevel(prefix + a + "x" + b) >= 2) n++;
        return n;
    },

    // 金のマス数。prefix "d" で わりざんマップ
    countGold: function(prefix) {
        prefix = prefix || "";
        let n = 0;
        for (let a = 1; a <= 9; a++)
            for (let b = 1; b <= 9; b++)
                if (this.getFactLevel(prefix + a + "x" + b) >= 3) n++;
        return n;
    },

    // 苦手TOPn（誤答があり克服していないファクト、苦手度降順）。prefix "d" で わりざん
    getWeakFacts: function(count, prefix) {
        prefix = prefix || "";
        const list = [];
        for (let a = 1; a <= 9; a++) {
            for (let b = 1; b <= 9; b++) {
                const key = prefix + a + "x" + b;
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

    // わりざんモードが ひらいているか（かけざんの ジムボスを たおす）
    isDivUnlocked: function() {
        return this.isStageCleared(GameConfig.divUnlockStage);
    },

    // ステージが解禁されているか（かけざん / わりざん それぞれの進行順で 1つまえを クリア）
    isStageUnlocked: function(stageId) {
        const divOrder = GameConfig.divStageOrder || [];
        const order = divOrder.indexOf(stageId) >= 0 ? divOrder : GameConfig.stageOrder;
        const idx = order.indexOf(stageId);
        if (idx < 0) return false;
        if (idx === 0) return order === divOrder ? this.isDivUnlocked() : true;

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
            stage.enemies.forEach(e => {
                (e.dexKeys || [e.key]).forEach(k => { this.dex[k] = true; });
                if (e.rageKey) this.dex[e.rageKey] = true;
            });
            if (stageId === "ex1") this.flags.exCleared = true;
            if (stageId === GameConfig.masterStageId) this.flags.masterCleared = true;
            (GameConfig.celebrations || []).forEach(c => {
                if (c.stage === stageId && c.cleared) this.flags[c.cleared] = true;
            });
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
            if (c.unlock.type === "master" && this.flags.masterCleared) ok = true;
            if (c.unlock.type === "stage" && this.isStageCleared(c.unlock.id)) ok = true;
            if (c.unlock.type === "divtrain" && this.div.training.clearCount >= c.unlock.n) ok = true;
            if (ok) {
                this.costumes.unlocked.push(c.key);
                newly.push(c);
            }
        });
        return newly;
    },

    // バトルの 見方の画像（かけざん=きせかえピカチュウ / わりざん=パートナー）
    getPartnerImg: function(mode) {
        if (mode === "wari") return "img/" + this.partnerForm().img;
        const c = GameConfig.costumes.find(x => x.key === this.costumes.selected);
        return "img/" + (c ? c.img : "ピカチュウ01.gif");
    },

    // ==========================================
    //  わりざんパートナー
    // ==========================================
    partnerDef: function(key) {
        return GameConfig.partners[key || this.div.partner] || GameConfig.partners.nyaoha;
    },

    // いま みせている しんか段階（しんか演出を みた段階）
    partnerLevel: function() {
        return Math.max(0, Math.min(2, this.div.evoSeen || 0));
    },

    partnerForm: function(key, level) {
        const lv = (level === undefined) ? this.partnerLevel() : level;
        return this.partnerDef(key).line[lv];
    },

    // しんかの じょうけん（partnerEvoStages）を いくつ クリアしたか
    partnerEvoLevel: function() {
        return GameConfig.partnerEvoStages.filter(id => this.isStageCleared(id)).length;
    },

    // パートナーの いまの すがたまでを 図鑑に登録
    registerPartnerForms: function(key) {
        const line = this.partnerDef(key).line;
        for (let i = 0; i <= this.partnerLevel(); i++) this.dex[line[i].key] = true;
    },

    // ひっさつわざ（ゲージMAXの 攻撃）
    specialMove: function(mode) {
        if (mode === "wari") {
            const p = this.partnerDef();
            return { icon: p.icon, name: p.moves[this.partnerLevel()] };
        }
        return { icon: "⚡", name: "10まんボルト" };
    },

    // ==========================================
    //  イーブイとっくん
    // ==========================================
    isDivTrainingDoneToday: function() {
        return this.div.training.lastClearDate === this._today();
    },

    // きょうの イーブイ（1日 1しゅるい。まだ 図鑑に いない すがたを ゆうせん → ぜんぶ そろうと キョダイ）
    todaysEevee: function() {
        const t = this.div.training;
        const all = GameConfig.eeveeList.concat([GameConfig.eeveeGiga]);
        const today = this._today();
        if (t.todayDate === today && t.todayKey) {
            const e = all.find(x => x.key === t.todayKey);
            if (e) return e;
        }
        const d = new Date();
        const seed = d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate();
        const unseen = GameConfig.eeveeList.filter(e => !this.dex[e.key]);
        let pick;
        if (unseen.length > 0) pick = unseen[seed % unseen.length];
        else if (!this.dex[GameConfig.eeveeGiga.key]) pick = GameConfig.eeveeGiga;
        else pick = all[seed % all.length];
        t.todayDate = today;
        t.todayKey = pick.key;
        return pick;
    },

    registerDivTrainingClear: function(key) {
        if (!this.isDivTrainingDoneToday()) {
            this.div.training.lastClearDate = this._today();
            this.div.training.clearCount++;
        }
        if (key) this.dex[key] = true;
        return this.checkCostumeUnlocks();
    },

    // 星の合計（ステージIDの配列を渡すと その中だけ）
    starsOf: function(ids) {
        return ids.reduce((s, id) => s + this.getStars(id), 0);
    },

    // ==========================================
    //  図鑑API
    // ==========================================
    countDex: function() {
        return GameConfig.dexList.filter(d => this.dex[d.key]).length;
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

    // 段ごとの正答率（おうちのひとレポート用）。prefix "d" で わる数ごと
    getDanStats: function(dan, prefix) {
        prefix = prefix || "";
        let c = 0, w = 0;
        for (let b = 1; b <= 9; b++) {
            const d = this.facts[prefix + dan + "x" + b];
            if (d) { c += d.c; w += d.w; }
        }
        const total = c + w;
        return { correct: c, wrong: w, rate: total > 0 ? Math.round(c / total * 100) : null };
    }
};
