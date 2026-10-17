// questions.js
// 九九・わりざんの問題と選択肢を作るエンジン
//
// 問題オブジェクト:
//   { a, b, c, key, type, answer, options, yomiQ, yomi, missing?, r?, big? }
// 出題形式(type):
//   normal     … a × b = ?          answer=積
//   missing    … a × ? = c / ? × b = c   answer=抜けた数、missing="a"|"b"
//   reverse    … c = ? × ?          answer=a*100+b（式のコード。表示は optionLabel）
//   div        … c ÷ a = ?          answer=b（a=わる数、b=商）
//   divMissing … c ÷ ? = b / ? ÷ a = b   answer=a または c、missing="a"|"c"
//   divReverse … ? ÷ ? = b          answer=c*10+a（式のコード）
//   rem        … c ÷ a = ? あまり ?  answer=b*100+r（c = a×b + r）
// かけざんは 10〜12 の だんにも対応（big=true。唱え読みの代わりに分解の説明を出す）
//
// 苦手管理のキー: かけざん "7x6"、わりざん "d6x7"（42÷6=7）、あまり "r6x7"

const QuestionGenerator = {

    // 直前に出した問題キー（同じ問題の連続出題を防ぐ）
    _recentKeys: [],
    _recentLimit: 3,

    DIV_TYPES: ["div", "divMissing", "divReverse"],

    isDivType: function(type) {
        return this.DIV_TYPES.indexOf(type) >= 0;
    },

    // わりざん系（あまり含む）か
    isDivFamily: function(type) {
        return this.isDivType(type) || type === "rem";
    },

    keyPrefix: function(type) {
        if (this.isDivType(type)) return "d";
        if (type === "rem") return "r";
        return "";
    },

    keyOf: function(a, b, type) {
        return this.keyPrefix(type) + a + "x" + b;
    },

    // ==========================================
    //  メイン: 出題範囲（段 / わる数の配列）から1問生成
    //  opts.type        : 出題形式（省略時 normal）
    //  opts.optionCount : 選択肢の数（デフォルト4、ヒントモードは2）
    // ==========================================
    generate: function(dans, opts) {
        opts = opts || {};
        const type = opts.type || "normal";
        let a, b;
        if (opts.fixedA !== undefined && opts.fixedB !== undefined) {
            a = opts.fixedA;
            b = opts.fixedB;
        } else {
            const pick = this._pickFact(dans, type);
            a = pick[0];
            b = pick[1];
        }
        return this.makeQuestion(a, b, opts.optionCount || 4, type);
    },

    // a, b から問題オブジェクトを組み立て
    //   extra: { missing: "a"|"b"|"c", r: あまり }（リベンジ再出題で同じ問題を再現する用）
    //          文字列を渡した場合は missing として扱う（互換）
    makeQuestion: function(a, b, optionCount, type, extra) {
        type = type || "normal";
        optionCount = optionCount || 4;
        if (typeof extra === "string") extra = { missing: extra };
        extra = extra || {};

        const key = this.keyOf(a, b, type);
        if (this._recentKeys[this._recentKeys.length - 1] !== key) {
            this._recentKeys.push(key);
            if (this._recentKeys.length > this._recentLimit) this._recentKeys.shift();
        }

        const q = { a: a, b: b, key: key, type: type, big: (a > 9 || b > 9) };

        if (this.isDivFamily(type)) {
            // a=わる数、b=商、c=わられる数
            q.r = 0;
            if (type === "rem" && a >= 2) {
                q.r = (extra.r >= 1 && extra.r <= a - 1) ? extra.r : 1 + Math.floor(Math.random() * (a - 1));
            }
            q.c = a * b + q.r;
            q.yomi = GameConfig.getYomi(a, b);
            q.yomiQ = GameConfig.numToYomi(q.c) + " わる " + GameConfig.numToYomi(a);
        } else {
            q.c = a * b;
            if (q.big) {
                q.yomiQ = GameConfig.numToYomi(a) + " かける " + GameConfig.numToYomi(b);
                q.yomi = "";
            } else {
                q.yomiQ = GameConfig.numYomi[a] + " " + GameConfig.numYomi[b];
                q.yomi = GameConfig.getYomi(a, b);
            }
        }

        switch (type) {
            case "missing":
                q.missing = (extra.missing === "a" || extra.missing === "b") ? extra.missing : (Math.random() < 0.5 ? "a" : "b");
                q.answer = (q.missing === "a") ? a : b;
                q.options = this.makeMissingOptions(a, b, q.missing, optionCount);
                break;
            case "reverse":
                q.answer = a * 100 + b;
                q.options = this.makeReverseOptions(a, b, optionCount);
                break;
            case "div":
                q.answer = b;
                q.options = this.makeDivOptions(a, b, optionCount);
                break;
            case "divMissing":
                q.missing = (extra.missing === "a" || extra.missing === "c") ? extra.missing : (Math.random() < 0.5 ? "a" : "c");
                if (q.missing === "a") {
                    q.answer = a;
                    q.options = this.makeDivisorOptions(a, b, optionCount);
                } else {
                    q.answer = q.c;
                    q.options = this.makeOptions(a, b, optionCount);
                }
                break;
            case "divReverse":
                q.answer = q.c * 10 + a;
                q.options = this.makeDivReverseOptions(a, b, optionCount);
                break;
            case "rem":
                if (q.r === 0) {          // わる数1など、あまりが作れない場合は ふつうの わりざん
                    q.type = "div";
                    q.key = this.keyOf(a, b, "div");
                    q.answer = b;
                    q.options = this.makeDivOptions(a, b, optionCount);
                } else {
                    q.answer = b * 100 + q.r;
                    q.options = this.makeRemOptions(a, b, q.r, optionCount);
                }
                break;
            default:
                q.answer = q.c;
                q.options = this.makeOptions(a, b, optionCount);
        }
        return q;
    },

    // 選択肢の表示ラベル
    optionLabel: function(q, v) {
        if (q.type === "reverse")    return Math.floor(v / 100) + " × " + (v % 100);
        if (q.type === "divReverse") return Math.floor(v / 10) + " ÷ " + (v % 10);
        if (q.type === "rem")        return Math.floor(v / 100) + " あまり " + (v % 100);
        return String(v);
    },

    // 選択肢の文字が長い形式（ボタンの文字を小さくする）
    optionClass: function(q) {
        if (q.type === "reverse" || q.type === "divReverse") return " option-shiki";
        if (q.type === "rem") return " option-rem";
        return "";
    },

    // ==========================================
    //  説明文（まちがえた時のテロップ・ふくしゅう・練習の答え合わせ）
    //  shiki … 答えの入った完全な式（HTML）  note … 九九の唱え or 考え方
    // ==========================================
    describe: function(q) {
        const a = q.a, b = q.b, p = a * b;
        const kuku = a + " × " + b + " = " + p + (q.yomi ? "「" + q.yomi + "」" : "");
        if (q.type === "divMissing") {
            if (q.missing === "a") {
                return { shiki: q.c + " ÷ <b>" + a + "</b> = " + b, note: kuku + " だから " + a };
            }
            return { shiki: "<b>" + q.c + "</b> ÷ " + a + " = " + b, note: kuku + " だから " + q.c };
        }
        if (q.type === "divReverse") {
            return { shiki: "<b>" + q.c + " ÷ " + a + "</b> = " + b, note: kuku + " だから " + q.c + " ÷ " + a + " = " + b };
        }
        if (this.isDivType(q.type)) {
            return { shiki: q.c + " ÷ " + a + " = <b>" + b + "</b>", note: kuku + " だから " + b };
        }
        if (q.type === "rem") {
            return {
                shiki: q.c + " ÷ " + a + " = <b>" + b + " あまり " + q.r + "</b>",
                note: a + " × " + b + " = " + p + "、 " + q.c + " − " + p + " = " + q.r
            };
        }
        const note = q.big ? this._bigNote(a, b) : "「" + q.yomi + "」";
        if (q.type === "missing") {
            const shiki = (q.missing === "a") ? "<b>" + a + "</b> × " + b + " = " + p : a + " × <b>" + b + "</b> = " + p;
            return { shiki: shiki, note: note };
        }
        if (q.type === "reverse") {
            return { shiki: p + " = <b>" + a + " × " + b + "</b>", note: note };
        }
        return { shiki: a + " × " + b + " = <b>" + p + "</b>", note: note };
    },

    // 10〜12の だんの 考え方（10 と のこり に わける）
    _bigNote: function(a, b) {
        const split = (big, small, bigFirst) => {
            if (big === 10) return small + "が 10こで " + (big * small);
            const r = big - 10;
            const s1 = bigFirst ? ("10×" + small) : (small + "×10");
            const s2 = bigFirst ? (r + "×" + small) : (small + "×" + r);
            return s1 + "=" + (10 * small) + " と " + s2 + "=" + (r * small) + " で " + (big * small);
        };
        if (a >= 10 && b >= 10) return "";
        return a >= 10 ? split(a, b, true) : split(b, a, false);
    },

    // ==========================================
    //  かけざん: 選択肢（正解 + 誤答N個）
    //  誤答は「子どもが実際にやりがちなミス」:
    //    ・a×(b±1), (a±1)×b … 隣の九九と混同
    //    ・答えの近くにある 他の九九の答え
    // ==========================================
    makeOptions: function(a, b, count) {
        count = count || 4;
        const answer = a * b;
        const M = Math.max(9, a, b);
        const wrongs = [];
        const used = (v) => v === answer || wrongs.includes(v);

        // 第1候補: 隣の九九
        const tier1 = [];
        [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b].forEach(v => {
            if (v > 0 && v !== answer && !tier1.includes(v)) tier1.push(v);
        });
        this._shuffle(tier1);

        // 第2候補: 答えの近くにある「他の九九の答え」
        const range = Math.max(12, Math.round(answer * 0.3));
        const tier2 = [];
        for (let x = 1; x <= M; x++) {
            for (let y = 1; y <= 9; y++) {
                const v = x * y;
                if (v !== answer && Math.abs(v - answer) <= range &&
                    !tier1.includes(v) && !tier2.includes(v)) tier2.push(v);
            }
        }
        this._shuffle(tier2);

        tier1.slice(0, 2).forEach(v => { if (!used(v)) wrongs.push(v); });
        for (const v of tier2) { if (wrongs.length >= count - 1) break; if (!used(v)) wrongs.push(v); }
        for (const v of tier1) { if (wrongs.length >= count - 1) break; if (!used(v)) wrongs.push(v); }

        [answer + 1, answer - 1, answer + 10, answer - 10].forEach(v => {
            if (wrongs.length < count - 1 && v > 0 && !used(v)) wrongs.push(v);
        });
        const maxR = Math.max(81, answer + 20);
        while (wrongs.length < count - 1) {
            const v = Math.floor(Math.random() * maxR) + 1;
            if (!used(v)) wrongs.push(v);
        }

        const options = [answer].concat(wrongs.slice(0, count - 1));
        this._shuffle(options);
        return options;
    },

    // ==========================================
    //  あなうめ: a × ? = c の「?」の選択肢
    //  誤答は「もう片方の数」「±1」「±2」を優先
    // ==========================================
    makeMissingOptions: function(a, b, missing, count) {
        const answer = (missing === "a") ? a : b;
        const other  = (missing === "a") ? b : a;
        const M = (a > 9 || b > 9) ? 12 : 9;   // 10〜12の だんの 問題は 12まで
        const wrongs = [];
        const tryAdd = (v) => {
            if (v >= 1 && v <= M && v !== answer && !wrongs.includes(v) && wrongs.length < count - 1) wrongs.push(v);
        };
        if (answer >= 10) {
            const bigs = [];
            for (let v = 10; v <= M; v++) if (v !== answer) bigs.push(v);
            this._shuffle(bigs);
            if (bigs.length) tryAdd(bigs[0]);
        }
        const near = [other, answer + 1, answer - 1, answer + 2, answer - 2];
        this._shuffle(near);
        near.forEach(tryAdd);
        while (wrongs.length < count - 1) tryAdd(Math.floor(Math.random() * M) + 1);
        const options = [answer].concat(wrongs);
        this._shuffle(options);
        return options;
    },

    // ==========================================
    //  ぎゃくびき: c になる式の選択肢（式コード a*100+b）
    //  誤答は積が c と異なる式のみ（6×7 と 7×6 のような同じ積の式は出さない）
    // ==========================================
    makeReverseOptions: function(a, b, count) {
        const c = a * b;
        const M = Math.max(9, a, b);
        const enc = (x, y) => x * 100 + y;
        const answer = enc(a, b);
        const wrongs = [];
        const ok = (x, y) => x >= 1 && x <= M && y >= 1 && y <= M && x * y !== c &&
                             !wrongs.some(w => Math.floor(w / 100) * (w % 100) === x * y);

        const tier1 = [[a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]].filter(p => ok(p[0], p[1]));
        this._shuffle(tier1);
        tier1.slice(0, 2).forEach(p => { if (ok(p[0], p[1])) wrongs.push(enc(p[0], p[1])); });

        const range = Math.max(12, Math.round(c * 0.3));
        const tier2 = [];
        for (let x = 1; x <= M; x++) {
            for (let y = 1; y <= 9; y++) {
                if (ok(x, y) && Math.abs(x * y - c) <= range) tier2.push([x, y]);
            }
        }
        this._shuffle(tier2);
        for (const p of tier2) { if (wrongs.length >= count - 1) break; if (ok(p[0], p[1])) wrongs.push(enc(p[0], p[1])); }
        for (const p of tier1) { if (wrongs.length >= count - 1) break; if (ok(p[0], p[1])) wrongs.push(enc(p[0], p[1])); }
        let guard = 0;
        while (wrongs.length < count - 1 && guard++ < 2000) {
            const x = Math.floor(Math.random() * M) + 1, y = Math.floor(Math.random() * 9) + 1;
            if (ok(x, y)) wrongs.push(enc(x, y));
        }
        const options = [answer].concat(wrongs.slice(0, count - 1));
        this._shuffle(options);
        return options;
    },

    // ==========================================
    //  わりざん: c ÷ a = ? の選択肢（商 b）
    //  誤答: 商±1（九九の となり）、わる数と まちがえる、商±2
    // ==========================================
    makeDivOptions: function(a, b, count) {
        const answer = b;
        const wrongs = [];
        const ok = (v) => v >= 1 && v <= 10 && v !== answer && !wrongs.includes(v);
        const tier1 = this._shuffle([b + 1, b - 1].filter(ok));
        tier1.slice(0, 2).forEach(v => { if (ok(v) && wrongs.length < count - 1) wrongs.push(v); });
        const tier2 = [a].concat(this._shuffle([b + 2, b - 2]));
        tier2.forEach(v => { if (ok(v) && wrongs.length < count - 1) wrongs.push(v); });
        while (wrongs.length < count - 1) {
            const v = Math.floor(Math.random() * 9) + 1;
            if (ok(v)) wrongs.push(v);
        }
        const options = [answer].concat(wrongs);
        this._shuffle(options);
        return options;
    },

    // あなうめ わりざん: c ÷ ? = b の「?」（わる数 a）
    // 誤答: 商と まちがえる、わる数±1、±2
    makeDivisorOptions: function(a, b, count) {
        const answer = a;
        const wrongs = [];
        const ok = (v) => v >= 1 && v <= 9 && v !== answer && !wrongs.includes(v);
        const cand = [b].concat(this._shuffle([a + 1, a - 1]), this._shuffle([a + 2, a - 2]));
        cand.forEach(v => { if (ok(v) && wrongs.length < count - 1) wrongs.push(v); });
        while (wrongs.length < count - 1) {
            const v = Math.floor(Math.random() * 9) + 1;
            if (ok(v)) wrongs.push(v);
        }
        const options = [answer].concat(wrongs);
        this._shuffle(options);
        return options;
    },

    // ==========================================
    //  ぎゃく わりざん: こたえが b に なる わりざんは？（式コード c*10+a）
    //  誤答は わりきれて 商が b でない式のみ。
    //  「c ÷ b（商が a）」と「となりの九九（商 b±1）」を優先
    // ==========================================
    makeDivReverseOptions: function(a, b, count) {
        const c = a * b;
        const enc = (dividend, divisor) => dividend * 10 + divisor;
        const answer = enc(c, a);
        const wrongs = [];
        const ok = (dividend, divisor) => {
            if (divisor < 1 || divisor > 9 || dividend < 1 || dividend % divisor !== 0) return false;
            const qt = dividend / divisor;
            return qt >= 1 && qt <= 9 && qt !== b && !wrongs.includes(enc(dividend, divisor));
        };
        const tier1 = [];
        if (a !== b) tier1.push([c, b]);                 // 42÷7=6 と 42÷6=7 の とりちがえ
        tier1.push([a * (b + 1), a], [a * (b - 1), a]);  // となりの九九
        const t1 = this._shuffle(tier1.filter(p => ok(p[0], p[1])));
        t1.slice(0, 2).forEach(p => { if (ok(p[0], p[1])) wrongs.push(enc(p[0], p[1])); });

        const tier2 = [];
        for (let x = Math.max(1, a - 2); x <= Math.min(9, a + 2); x++) {
            for (let y = 1; y <= 9; y++) {
                if (y !== b && ok(x * y, x)) tier2.push([x * y, x]);
            }
        }
        this._shuffle(tier2);
        for (const p of tier2) { if (wrongs.length >= count - 1) break; if (ok(p[0], p[1])) wrongs.push(enc(p[0], p[1])); }
        for (const p of t1) { if (wrongs.length >= count - 1) break; if (ok(p[0], p[1])) wrongs.push(enc(p[0], p[1])); }
        while (wrongs.length < count - 1) {
            const x = Math.floor(Math.random() * 9) + 1, y = Math.floor(Math.random() * 9) + 1;
            if (ok(x * y, x)) wrongs.push(enc(x * y, x));
        }
        const options = [answer].concat(wrongs.slice(0, count - 1));
        this._shuffle(options);
        return options;
    },

    // ==========================================
    //  あまりの ある わりざん: c ÷ a = b あまり r（コード b*100+r）
    //  誤答: あまりが わる数より 大きい（b-1 あまり r+a）、商が1大きい、あまり±1
    // ==========================================
    makeRemOptions: function(a, b, r, count) {
        const enc = (qq, rr) => qq * 100 + rr;
        const answer = enc(b, r);
        const wrongs = [];
        const ok = (qq, rr) => qq >= 1 && rr >= 0 && rr <= 99 && enc(qq, rr) !== answer && !wrongs.includes(enc(qq, rr));
        const add = (p) => { if (p && wrongs.length < count - 1 && ok(p[0], p[1])) wrongs.push(enc(p[0], p[1])); };
        // 商が同じで あまりが ちがう（あまりの けいさんミス）
        const sameQ = this._shuffle([[b, r + 1], [b, r - 1]].filter(p => ok(p[0], p[1])));
        // よくある まちがい: あまりが わる数より 大きい（1つ すくない商）/ 商が1つ おおい
        const tier1 = this._shuffle([[b - 1, r + a], [b + 1, r]].filter(p => ok(p[0], p[1])));
        const rest = this._shuffle([[b - 1, r], [b + 1, r > 0 ? r - 1 : r + 1]].filter(p => ok(p[0], p[1])));
        add(sameQ[0]);
        add(tier1[0]);
        sameQ.slice(1).concat(tier1.slice(1), rest).forEach(add);
        // たりなければ 近くの商 × あまり0〜わる数 から補充（÷2 は あまりが 1しか ないため）
        let guard = 0;
        while (wrongs.length < count - 1 && guard++ < 500) {
            const qq = Math.max(1, b + Math.floor(Math.random() * 6) - 2);
            const rr = Math.floor(Math.random() * (a + 1));
            if (ok(qq, rr)) wrongs.push(enc(qq, rr));
        }
        const options = [answer].concat(wrongs);
        this._shuffle(options);
        return options;
    },

    // ==========================================
    //  苦手重み付きでファクトを1つ選ぶ
    //  重み: 苦手なほど・出題が少ないほど高い
    //  かけざんの 10〜12の だんは 12×3 と 3×12 の りょうほうを候補にする
    // ==========================================
    _pickFact: function(dans, type) {
        const prefix = this.keyPrefix(type);
        let pool = [];
        dans.forEach(d => {
            for (let i = 1; i <= 9; i++) {
                pool.push([d, i]);
                if (d > 9 && !this.isDivFamily(type)) pool.push([i, d]);
            }
        });

        // 直近に出した問題は除外（プールが小さい場合はそのまま）
        const filtered = pool.filter(p => !this._recentKeys.includes(prefix + p[0] + "x" + p[1]));
        if (filtered.length >= 3) pool = filtered;

        const weights = pool.map(p => 1 + GameState.getWeakness(prefix + p[0] + "x" + p[1]) * 3);
        const total = weights.reduce((s, w) => s + w, 0);
        let r = Math.random() * total;
        for (let i = 0; i < pool.length; i++) {
            r -= weights[i];
            if (r <= 0) return pool[i];
        }
        return pool[pool.length - 1];
    },

    // Fisher-Yatesシャッフル
    _shuffle: function(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    },

    // ステージ開始時などに履歴リセット
    resetRecent: function() {
        this._recentKeys = [];
    }
};
