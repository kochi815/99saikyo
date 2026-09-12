// questions.js
// 九九の問題と4択の選択肢を作るエンジン
//
// 問題オブジェクト:
//   { a, b, key:"3x4", type:"normal", answer:12, options:[12,9,16,15],
//     yomiQ:"さん し", yomi:"さんし じゅうに" }
// 出題形式(type):
//   normal  … a × b = ?        answer=積、options=数
//   missing … a × ? = c / ? × b = c   answer=抜けた数(1〜9)、options=数、missing="a"|"b"
//   reverse … c = ? × ?        answer=a*10+b（式のコード）、options=式コード（表示は optionLabel）

const QuestionGenerator = {

    // 直前に出した問題キー（同じ問題の連続出題を防ぐ）
    _recentKeys: [],
    _recentLimit: 3,

    // ==========================================
    //  メイン: 出題範囲（段の配列）から1問生成
    //  opts.fixedA / fixedB : 問題を固定（おぼえタイム順出題・くくマップ練習用）
    //  opts.optionCount     : 選択肢の数（デフォルト4、ヒントモードは2）
    // ==========================================
    generate: function(dans, opts) {
        opts = opts || {};
        let a, b;

        if (opts.fixedA !== undefined && opts.fixedB !== undefined) {
            a = opts.fixedA;
            b = opts.fixedB;
        } else {
            const pick = this._pickFact(dans);
            a = pick[0];
            b = pick[1];
        }

        return this.makeQuestion(a, b, opts.optionCount || 4, opts.type);
    },

    // a×b から問題オブジェクトを組み立て（type省略時は normal）
    //   missing … "a"|"b" を渡すと あなうめ の穴の位置を固定（リベンジ再出題用）
    makeQuestion: function(a, b, optionCount, type, missing) {
        const key = a + "x" + b;
        if (this._recentKeys[this._recentKeys.length - 1] !== key) {
            this._recentKeys.push(key);
            if (this._recentKeys.length > this._recentLimit) this._recentKeys.shift();
        }
        type = type || "normal";
        optionCount = optionCount || 4;

        const q = {
            a: a,
            b: b,
            key: key,
            type: type,
            yomiQ: GameConfig.numYomi[a] + " " + GameConfig.numYomi[b],
            yomi: GameConfig.getYomi(a, b)
        };

        if (type === "missing") {
            q.missing = (missing === "a" || missing === "b") ? missing : (Math.random() < 0.5 ? "a" : "b");
            q.answer = (q.missing === "a") ? a : b;
            q.options = this.makeMissingOptions(a, b, q.missing, optionCount);
        } else if (type === "reverse") {
            q.answer = a * 10 + b;
            q.options = this.makeReverseOptions(a, b, optionCount);
        } else {
            q.answer = a * b;
            q.options = this.makeOptions(a, b, optionCount);
        }
        return q;
    },

    // 選択肢の表示ラベル（reverse は式コード→「6 × 7」）
    optionLabel: function(q, v) {
        if (q.type === "reverse") return Math.floor(v / 10) + " × " + (v % 10);
        return String(v);
    },

    // ==========================================
    //  あなうめ: a × ? = c の「?」の選択肢（1〜9の数）
    //  誤答は「もう片方の数」「±1」「±2」を優先
    // ==========================================
    makeMissingOptions: function(a, b, missing, count) {
        const answer = (missing === "a") ? a : b;
        const other  = (missing === "a") ? b : a;
        const wrongs = [];
        const tryAdd = (v) => {
            if (v >= 1 && v <= 9 && v !== answer && !wrongs.includes(v) && wrongs.length < count - 1) wrongs.push(v);
        };
        const near = [other, answer + 1, answer - 1, answer + 2, answer - 2];
        this._shuffle(near);
        near.forEach(tryAdd);
        while (wrongs.length < count - 1) tryAdd(Math.floor(Math.random() * 9) + 1);
        const options = [answer].concat(wrongs);
        this._shuffle(options);
        return options;
    },

    // ==========================================
    //  ぎゃくびき: c になる式の選択肢（式コード a*10+b）
    //  誤答は積が c と異なる式のみ（6×7 と 7×6 のような同じ積の式は出さない）
    //  隣の九九 → 答えの近い九九 の順で選ぶ
    // ==========================================
    makeReverseOptions: function(a, b, count) {
        const c = a * b;
        const enc = (x, y) => x * 10 + y;
        const answer = enc(a, b);
        const wrongs = [];
        const ok = (x, y) => x >= 1 && x <= 9 && y >= 1 && y <= 9 && x * y !== c && !wrongs.includes(enc(x, y));

        const tier1 = [[a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]].filter(p => ok(p[0], p[1]));
        this._shuffle(tier1);
        tier1.slice(0, 2).forEach(p => { if (ok(p[0], p[1])) wrongs.push(enc(p[0], p[1])); });

        const range = Math.max(12, Math.round(c * 0.3));
        const tier2 = [];
        for (let x = 1; x <= 9; x++) {
            for (let y = 1; y <= 9; y++) {
                if (ok(x, y) && Math.abs(x * y - c) <= range) tier2.push([x, y]);
            }
        }
        this._shuffle(tier2);
        for (const p of tier2) { if (wrongs.length >= count - 1) break; if (ok(p[0], p[1])) wrongs.push(enc(p[0], p[1])); }
        for (const p of tier1) { if (wrongs.length >= count - 1) break; if (ok(p[0], p[1])) wrongs.push(enc(p[0], p[1])); }
        while (wrongs.length < count - 1) {
            const x = Math.floor(Math.random() * 9) + 1, y = Math.floor(Math.random() * 9) + 1;
            if (ok(x, y)) wrongs.push(enc(x, y));
        }
        const options = [answer].concat(wrongs.slice(0, count - 1));
        this._shuffle(options);
        return options;
    },

    // ==========================================
    //  苦手重み付きでファクトを1つ選ぶ
    //  重み: 苦手なほど・出題が少ないほど高い
    // ==========================================
    _pickFact: function(dans) {
        let pool = [];
        dans.forEach(d => {
            for (let i = 1; i <= 9; i++) pool.push([d, i]);
        });

        // 直近に出した問題は除外（プールが小さい場合はそのまま）
        const filtered = pool.filter(p => !this._recentKeys.includes(p[0] + "x" + p[1]));
        if (filtered.length >= 3) pool = filtered;

        const weights = pool.map(p => 1 + GameState.getWeakness(p[0] + "x" + p[1]) * 3);
        const total = weights.reduce((s, w) => s + w, 0);
        let r = Math.random() * total;
        for (let i = 0; i < pool.length; i++) {
            r -= weights[i];
            if (r <= 0) return pool[i];
        }
        return pool[pool.length - 1];
    },

    // ==========================================
    //  選択肢を作る（正解 + 誤答N個）
    //  誤答は「子どもが実際にやりがちなミス」:
    //    ・a×(b±1), (a±1)×b … 隣の九九と混同
    //    ・a×b±a … 数え間違い
    // ==========================================
    makeOptions: function(a, b, count) {
        count = count || 4;
        const answer = a * b;
        const wrongs = [];
        const used = (v) => v === answer || wrongs.includes(v);

        // 第1候補: 隣の九九（a×(b±1), (a±1)×b）— 最も混同しやすい
        const tier1 = [];
        [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b].forEach(v => {
            if (v > 0 && v !== answer && !tier1.includes(v)) tier1.push(v);
        });
        this._shuffle(tier1);

        // 第2候補: 答えの近くにある「他の九九の答え」（例: 42に対して 48, 45, 40, 36）
        // 答えが大きいほど九九の答えはまばらになるので探索範囲を広げる
        const range = Math.max(12, Math.round(answer * 0.3));
        const tier2 = [];
        for (let x = 1; x <= 9; x++) {
            for (let y = 1; y <= 9; y++) {
                const v = x * y;
                if (v !== answer && Math.abs(v - answer) <= range &&
                    !tier1.includes(v) && !tier2.includes(v)) tier2.push(v);
            }
        }
        this._shuffle(tier2);

        // 隣の九九から2つ、近くの九九の答えから1つ（足りなければ順に補充）
        tier1.slice(0, 2).forEach(v => { if (!used(v)) wrongs.push(v); });
        for (const v of tier2) { if (wrongs.length >= count - 1) break; if (!used(v)) wrongs.push(v); }
        for (const v of tier1) { if (wrongs.length >= count - 1) break; if (!used(v)) wrongs.push(v); }

        // 最終フォールバック: ±1, ±10, ランダム
        [answer + 1, answer - 1, answer + 10, answer - 10].forEach(v => {
            if (wrongs.length < count - 1 && v > 0 && !used(v)) wrongs.push(v);
        });
        while (wrongs.length < count - 1) {
            const v = Math.floor(Math.random() * 81) + 1;
            if (!used(v)) wrongs.push(v);
        }

        const options = [answer].concat(wrongs.slice(0, count - 1));
        this._shuffle(options);
        return options;
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
