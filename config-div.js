// config-div.js
// 追加コンテンツ（config.js の後に読み込む）
//   1. かけざん ワールド6「メガシンカの とう」… 九九を こえて（10・11・12の だん）
//   2. わりざんモード「わりざんの だいぼうけん」… ガラル・パルデアの ポケモン
//   3. パートナー（パルデアの さんけ。わりざんモードで しんかする）
//   4. イーブイとっくん（わりざんの にがて。きょうの イーブイが でてくる）
//
// ステージの追加フィールド:
//   mode: "wari" … わりざんモードのステージ（省略時はかけざん）
//   enemies[].rageStyle: "rage"(既定) / "dynamax" / "mega" / "evolve"
//   enemies[].rageName / rageKey(図鑑) / rageText(実況) / rageGimmick(変身後に追加されるギミック)
//   enemies[].barrierMs / barrierText … バリアを通す回答時間と実況
//   enemies[].masks … HPが減るたびに姿と出題形式が変わる（オーガポン）
//   enemies[].dexKeys … クリア時に図鑑登録するキー（省略時は key）
//   oboeKind: "rem" … おぼえタイムを「あまりのある わりざん」の説明にする

(function() {
    const C = GameConfig;

    // ==========================================
    //  数字の読み（ふつうの数。九九の唱え方とは別）
    // ==========================================
    C.numToYomi = function(n) {
        const d = ["", "いち", "に", "さん", "よん", "ご", "ろく", "なな", "はち", "きゅう"];
        if (n === 0) return "れい";
        let s = "";
        const h = Math.floor(n / 100), t = Math.floor((n % 100) / 10), o = n % 10;
        if (h === 1) s += "ひゃく";
        else if (h > 1) s += d[h] + "ひゃく";
        if (t === 1) s += "じゅう";
        else if (t > 1) s += d[t] + "じゅう";
        if (o > 0) s += d[o];
        return s;
    };
    // 10〜12 の九九読み（「じゅうに かける なな」用）
    C.numYomi[10] = "じゅう";
    C.numYomi[11] = "じゅういち";
    C.numYomi[12] = "じゅうに";

    const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    // ==========================================
    //  かけざん ワールド6: メガシンカの とう（九九を こえて）
    // ==========================================
    C.stages.push(
        { id: "s61", world: 6, name: "10と11の だん", subName: "九九を こえて①", dans: [10, 11], hearts: 4, timeLimit: 8000, hiddenUntil: "s54", oboeTime: true,
          enemies: [{ key: "タイレーツ", img: "タイレーツ.png", hp: 1200, gimmick: "rage", rageStyle: "mega",
                      rageImg: "メガタイレーツ.png", rageName: "メガタイレーツ", rageKey: "メガタイレーツ", rageText: "タイレーツが メガシンカした！" }] },
        { id: "s62", world: 6, name: "12の だん", subName: "九九を こえて②", dans: [12], hearts: 4, timeLimit: 8000, hiddenUntil: "s54", oboeTime: true,
          enemies: [{ key: "リザードン", img: "リザードン01.gif", hp: 1200, gimmick: "rage", rageStyle: "mega", rageTimeCut: 1000,
                      rageImg: "メガリザードンY.png", rageName: "メガリザードンY", rageKey: "メガリザードンY", rageText: "メガシンカ！ じかんが みじかくなる！" }] },
        { id: "s63", world: 6, name: "10〜12 ミックス", subName: "九九を こえて③", dans: [10, 11, 12], qTypes: ["normal", "normal", "missing"], hearts: 4, timeLimit: 7000, hiddenUntil: "s54",
          intro: "？に はいる かずも でるぞ！",
          enemies: [{ key: "リザードン", img: "リザードン01.gif", hp: 1500, gimmick: "rage", rageStyle: "mega", rageTimeCut: 1000,
                      rageImg: "メガリザードンX.png", rageName: "メガリザードンX", rageKey: "メガリザードンX", rageText: "メガシンカ！ じかんが みじかくなる！" }] },
        { id: "s64", world: 6, name: "メガシンカの ちょうてん", subName: "九九を こえて ぜんぶ", dans: [6, 7, 8, 9, 10, 11, 12], qTypes: ["normal", "missing", "reverse"], hearts: 5, timeLimit: 6000, boss: true, hiddenUntil: "s54", bgm: "bgm_battle_last",
          intro: "ぜんぶの もんだいが ミックスだ！",
          enemies: [{ key: "レックウザ", img: "レックウザ.png", hp: 1800, gimmick: "rage", rageStyle: "mega", rageTimeCut: 1000,
                      rageImg: "メガレックウザ.png", rageName: "メガレックウザ", rageKey: "メガレックウザ", rageText: "レックウザが メガシンカした！ じかんが みじかくなる！" }] }
    );
    C.stageOrder.push("s61", "s62", "s63", "s64");
    C.worlds[6] = { name: "💎 ワールド6 メガシンカの とう（九九を こえて）", bgm: "bgm_battle_final" };

    // ==========================================
    //  わりざんモード
    // ==========================================
    C.divUnlockStage = "s19";          // かけざんの ジムボスを たおすと ひらく

    const W = (o) => Object.assign({ mode: "wari" }, o);

    C.stages.push(
        // --- ワールド1: わけっこの はらっぱ（じかんせいげん なし） ---
        W({ id: "d11", world: 11, name: "2と3の わりざん", subName: "÷2 と ÷3", dans: [2, 3], qTypes: ["div"], hearts: 4, timeLimit: null, oboeTime: true,
            enemies: [{ key: "プラスル", img: "プラスル.png", hp: 500 },
                      { key: "マイナン", img: "マイナン.png", hp: 500 }] }),
        W({ id: "d12", world: 11, name: "4と5の わりざん", subName: "÷4 と ÷5", dans: [4, 5], qTypes: ["div"], hearts: 4, timeLimit: null, oboeTime: true,
            enemies: [{ key: "トゲデマル", img: "トゲデマル.png", hp: 900 }] }),
        W({ id: "d13", world: 11, name: "6と7の わりざん", subName: "÷6 と ÷7", dans: [6, 7], qTypes: ["div"], hearts: 4, timeLimit: null, oboeTime: true,
            enemies: [{ key: "ドオー", img: "ドオー.png", hp: 1000 }] }),
        W({ id: "d14", world: 11, name: "8と9の わりざん", subName: "÷8 と ÷9", dans: [8, 9], qTypes: ["div"], hearts: 4, timeLimit: null, oboeTime: true,
            enemies: [{ key: "ヒバニー", img: "ヒバニー.png", hp: 1000, gimmick: "rage", rageStyle: "evolve",
                        rageImg: "ラビフット.png", rageName: "ラビフット", rageKey: "ラビフット", rageText: "ヒバニーが ラビフットに しんかした！" }] }),
        W({ id: "d15", world: 11, name: "はらっぱの ぬし", subName: "÷1〜÷9 ぜんぶ", dans: ALL, qTypes: ["div"], hearts: 5, timeLimit: null, boss: true,
            enemies: [{ key: "イイネイヌ", img: "イイネイヌ.png", hp: 1300, gimmick: "shuffle",
                        shuffleText: "イイネイヌの いたずら！ こたえの ばしょが かわった！",
                        intro: "ときどき こたえの ばしょが かわるぞ！" }] }),

        // --- ワールド2: キョダイマックス スタジアム（10びょう） ---
        W({ id: "d21", world: 12, name: "ヤクデの ほのお", subName: "÷2〜÷5", dans: [2, 3, 4, 5], qTypes: ["div"], hearts: 4, timeLimit: 10000,
            enemies: [{ key: "ヤクデ", img: "ヤクデ.png", hp: 500 },
                      { key: "マルヤクデ", img: "マルヤクデ.png", hp: 1000, gimmick: "rage", rageStyle: "dynamax",
                        rageImg: "マルヤクデ（キョダイマックスのすがた）.png", rageName: "キョダイマルヤクデ", rageKey: "キョダイマルヤクデ", rageText: "マルヤクデが キョダイマックスした！" }] }),
        W({ id: "d22", world: 12, name: "メルメタルの はがね", subName: "÷6〜÷9", dans: [6, 7, 8, 9], qTypes: ["div"], hearts: 4, timeLimit: 10000,
            enemies: [{ key: "メルタン", img: "メルタン.png", hp: 500 },
                      { key: "メルメタル", img: "メルメタル.png", hp: 1000, gimmick: "rage", rageStyle: "dynamax",
                        rageImg: "メルメタル（キョダイマックスのすがた）.png", rageName: "キョダイメルメタル", rageKey: "キョダイメルメタル", rageText: "メルメタルが キョダイマックスした！" }] }),
        W({ id: "d23", world: 12, name: "エースバーンの キック", subName: "あなうめ わりざん", dans: ALL, qTypes: ["div", "divMissing", "divMissing"], hearts: 4, timeLimit: 10000,
            intro: "？に はいる かずを こたえよう！",
            enemies: [{ key: "エースバーン", img: "エースバーン.png", hp: 1400, gimmick: "rage", rageStyle: "dynamax",
                        rageImg: "エースバーン（キョダイマックスのすがた）.png", rageName: "キョダイエースバーン", rageKey: "キョダイエースバーン", rageText: "エースバーンが キョダイマックスした！" }] }),
        W({ id: "d24", world: 12, name: "キョダイ ジュラルドン", subName: "かけざん・わりざん ミックス", dans: ALL, qTypes: ["div", "divMissing", "normal"], hearts: 5, timeLimit: 9000, boss: true,
            intro: "かけざんと わりざんが まざるぞ！",
            enemies: [{ key: "ジュラルドン", img: "ジュラルドン.png", hp: 1600, gimmick: "rage", rageStyle: "dynamax", rageTimeCut: 2000,
                        rageImg: "ジュラルドン（キョダイマックスのすがた）.png", rageName: "キョダイジュラルドン", rageKey: "キョダイジュラルドン", rageText: "キョダイマックス！ じかんが みじかくなる！" }] }),

        // --- ワールド3: パラドックスの あな（8びょう） ---
        W({ id: "d31", world: 13, name: "こだいの パラドックス", subName: "ぎゃく わりざん", dans: ALL, qTypes: ["div", "divReverse", "divReverse"], hearts: 4, timeLimit: 8000,
            intro: "こたえに なる わりざんを えらぼう！",
            enemies: [{ key: "スナノケガワ", img: "スナノケガワ.png", hp: 500 },
                      { key: "ウガツホムラ", img: "ウガツホムラ.png", hp: 600 },
                      { key: "タケルライコ", img: "タケルライコ.png", hp: 700 }] }),
        W({ id: "d32", world: 13, name: "みらいの パラドックス", subName: "5れんせん ラッシュ", dans: ALL, qTypes: ["div", "divMissing", "divReverse"], hearts: 5, timeLimit: 8000,
            intro: "5たい つづけて くるぞ！",
            enemies: [{ key: "テツノワダチ", img: "テツノワダチ.png", hp: 400 },
                      { key: "テツノカイナ", img: "テツノカイナ.png", hp: 400 },
                      { key: "テツノコウベ", img: "テツノコウベ.png", hp: 400 },
                      { key: "テツノドクガ", img: "テツノドクガ.png", hp: 400 },
                      { key: "テツノイバラ", img: "テツノイバラ.png", hp: 400 }] }),
        W({ id: "d33", world: 13, name: "てつの ぐんだん", subName: "4れんせん", dans: ALL, qTypes: ["div", "divMissing", "divReverse"], hearts: 5, timeLimit: 7000,
            enemies: [{ key: "テツノブジン", img: "テツノブジン.png", hp: 450 },
                      { key: "テツノイサハ", img: "テツノイサハ.png", hp: 450 },
                      { key: "テツノカシラ", img: "テツノカシラ.png", hp: 450 },
                      { key: "テツノイワオ", img: "テツノイワオ.png", hp: 500 }] }),
        W({ id: "d34", world: 13, name: "ほのおと やいば", subName: "グレンアルマ・ソウブレイズ", dans: ALL, qTypes: ["div", "divMissing", "divReverse", "normal"], hearts: 6, timeLimit: 7000, boss: true,
            intro: "かけざんも まざるぞ！",
            enemies: [{ key: "グレンアルマ", img: "グレンアルマ.png", hp: 1000 },
                      { key: "ソウブレイズ", img: "ソウブレイズ.png", hp: 850, gimmick: "counter", intro: "カウンター！ まちがえると ハートが2つ へる！" }] }),

        // --- ワールド4: でんせつの わりざん（6びょう） ---
        W({ id: "d41", world: 14, name: "オーガポンの おめん", subName: "おめんで もんだいが かわる", dans: ALL, qTypes: ["div"], hearts: 5, timeLimit: 7000,
            intro: "おめんが かわると もんだいも かわるぞ！",
            enemies: [{ key: "オーガポン", img: "オーガポン（みどりのめん）.png", hp: 1600,
                        masks: [
                            { name: "オーガポン（みどりのめん）",   img: "オーガポン（みどりのめん）.png",   qTypes: ["div"],               text: "みどりのめん！ わりざんだ！" },
                            { name: "オーガポン（いどのめん）",     img: "オーガポン（いどのめん）.png",     qTypes: ["divMissing"],        text: "いどのめん！ あなうめ わりざんだ！" },
                            { name: "オーガポン（かまどのめん）",   img: "オーガポン（かまどのめん）.png",   qTypes: ["divReverse"],        text: "かまどのめん！ ぎゃく わりざんだ！" },
                            { name: "オーガポン（いしずえのめん）", img: "オーガポン（いしずえのめん）.png", qTypes: ["normal", "missing"], text: "いしずえのめん！ かけざんだ！" }
                        ],
                        dexKeys: ["オーガポン（みどりのめん）", "オーガポン（いどのめん）", "オーガポン（かまどのめん）", "オーガポン（いしずえのめん）"] }] }),
        W({ id: "d42", world: 14, name: "けんの えいゆう", subName: "ザシアン", dans: ALL, qTypes: ["div", "divMissing", "divReverse"], hearts: 5, timeLimit: 6000,
            enemies: [{ key: "ザシアン", img: "ザシアン（れきせんのゆうしゃ）.png", hp: 1500, gimmick: "rage", rageStyle: "mega", rageGimmick: "counter",
                        rageImg: "ザシアン（けんのおう）.png", rageName: "ザシアン（けんのおう）", rageKey: "ザシアン（けんのおう）",
                        rageText: "けんのおうの すがたに なった！ まちがえると ハートが2つ へる！" }] }),
        W({ id: "d43", world: 14, name: "たての えいゆう", subName: "ザマゼンタ", dans: ALL, qTypes: ["div", "divMissing", "divReverse"], hearts: 5, timeLimit: 6000,
            enemies: [{ key: "ザマゼンタ", img: "ザマゼンタ（れきせんのゆうしゃ）.png", hp: 1500, gimmick: "rage", rageStyle: "mega", rageGimmick: "barrier",
                        barrierMs: 4000, barrierText: "たてで ふせがれた！ 4びょういないに こたえよう！",
                        rageImg: "ザマゼンタ（たてのおう）.png", rageName: "ザマゼンタ（たてのおう）", rageKey: "ザマゼンタ（たてのおう）",
                        rageText: "たてのおうの すがたに なった！ 4びょういないに こたえないと こうげきが とおらない！" }] }),
        W({ id: "d44", world: 14, name: "パラドックスの りゅう", subName: "コライドン・ミライドン", dans: ALL, qTypes: ["div", "divMissing", "divReverse", "normal"], hearts: 5, timeLimit: 6000,
            enemies: [{ key: "コライドン", img: "コライドン.png", hp: 1200 },
                      { key: "ミライドン", img: "ミライドン.png", hp: 1200, timeLimit: 5000, gimmick: "shuffle",
                        shuffleText: "ミライドンの でんげき！ こたえの ばしょが かわった！", intro: "でんげきで こたえの ばしょが かわるぞ！" }] }),
        W({ id: "d45", world: 14, name: "わりざんマスター けんてい", subName: "テラパゴス 3れんせん", dans: ALL, qTypes: ["div", "divMissing", "divReverse", "normal"], hearts: 7, timeLimit: 6000, boss: true, bgm: "bgm_battle_last",
            enemies: [{ key: "テラパゴス", img: "テラパゴス（ノーマルフォルム）.png", hp: 1000, intro: "ぜんぶの もんだいが ミックスだ！" },
                      { key: "テラパゴス（テラスタル）", img: "テラパゴス（テラスタルフォルム）.png", hp: 1200, timeLimit: 5000, gimmick: "counter",
                        intro: "テラスタル！ まちがえると ハートが2つ へる！" },
                      { key: "テラパゴス（ステラ）", img: "テラパゴス（ステラフォルム）.png", hp: 1500, timeLimit: 5000, gimmick: "shuffle",
                        shuffleText: "ステラの ひかり！ こたえの ばしょが かわった！", intro: "さいごの すがた！ こたえの ばしょが かわるぞ！" }] }),

        // --- うらワールド: あまりの しれん（わりざんマスター けんてい クリア後） ---
        W({ id: "d51", world: 15, name: "あまりの しれん①", subName: "÷2〜÷5 あまりあり", dans: [2, 3, 4, 5], qTypes: ["rem"], hearts: 5, timeLimit: 15000, hiddenUntil: "d45",
            oboeTime: true, oboeKind: "rem",
            enemies: [{ key: "ブリジュラス", img: "ブリジュラス.png", hp: 1200 }] }),
        W({ id: "d52", world: 15, name: "あまりの しれん②", subName: "÷6〜÷9 あまりあり", dans: [6, 7, 8, 9], qTypes: ["rem"], hearts: 5, timeLimit: 15000, hiddenUntil: "d45",
            enemies: [{ key: "カミツオロチ", img: "カミツオロチ.png", hp: 1300 }] }),
        W({ id: "d53", world: 15, name: "あまりの ぬし", subName: "あまり ミックス", dans: [2, 3, 4, 5, 6, 7, 8, 9], qTypes: ["rem", "rem", "div"], hearts: 6, timeLimit: 12000, boss: true, hiddenUntil: "d45", bgm: "bgm_battle_last",
            enemies: [{ key: "ムゲンダイナ", img: "ムゲンダイナ.png", hp: 1800, gimmick: "accel", accelStep: 400, accelMin: 8000,
                        intro: "せいかいするたび じかんが みじかくなるぞ！" }] })
    );

    C.divStageOrder = ["d11", "d12", "d13", "d14", "d15",
                       "d21", "d22", "d23", "d24",
                       "d31", "d32", "d33", "d34",
                       "d41", "d42", "d43", "d44", "d45",
                       "d51", "d52", "d53"];

    Object.assign(C.worlds, {
        11: { name: "➗ ワールド1 わけっこの はらっぱ", bgm: "bgm_battle1" },
        12: { name: "➗ ワールド2 キョダイマックス スタジアム", bgm: "bgm_battle2" },
        13: { name: "➗ ワールド3 パラドックスの あな", bgm: "bgm_battle_final" },
        14: { name: "➗ ワールド4 でんせつの わりざん", bgm: "bgm_battle_last" },
        15: { name: "👑 うらワールド あまりの しれん", bgm: "bgm_battle_last" }
    });
    Object.assign(C.battle.weakMixRate, { 12: 0.2, 13: 0.3, 14: 0.3 });

    // ==========================================
    //  パートナー（わりざんモード）
    //  partnerEvoStages を クリアするたびに 1だんかい しんか
    // ==========================================
    C.partners = {
        nyaoha:  { type: "くさ",   color: "#43a047", icon: "🌸",
                   line: [{ key: "ニャオハ", img: "ニャオハ.png" }, { key: "ニャローテ", img: "ニャローテ.png" }, { key: "マスカーニャ", img: "マスカーニャ.png" }],
                   moves: ["このは", "マジカルリーフ", "トリックフラワー"] },
        hogeta:  { type: "ほのお", color: "#e53935", icon: "🔥",
                   line: [{ key: "ホゲータ", img: "ホゲータ.png" }, { key: "アチゲータ", img: "アチゲータ.png" }, { key: "ラウドボーン", img: "ラウドボーン.png" }],
                   moves: ["ひのこ", "かえんほうしゃ", "フレアソング"] },
        kuwassu: { type: "みず",   color: "#1e88e5", icon: "💧",
                   line: [{ key: "クワッス", img: "クワッス.png" }, { key: "ウェルカモ", img: "ウェルカモ.png" }, { key: "ウェーニバル", img: "ウェーニバル.png" }],
                   moves: ["みずでっぽう", "アクアジェット", "アクアステップ"] }
    };
    C.partnerOrder = ["nyaoha", "hogeta", "kuwassu"];
    C.partnerEvoStages = ["d15", "d34"];

    // ==========================================
    //  イーブイとっくん（わりざんの にがて）
    // ==========================================
    C.eeveeList = [
        { key: "イーブイ",   img: "イーブイ.png" },
        { key: "シャワーズ", img: "シャワーズ.png" },
        { key: "サンダース", img: "サンダース.png" },
        { key: "ブースター", img: "ブースター.png" },
        { key: "エーフィ",   img: "エーフィ.png" },
        { key: "ブラッキー", img: "ブラッキー.png" },
        { key: "リーフィア", img: "リーフィア.png" },
        { key: "グレイシア", img: "グレイシア.png" },
        { key: "ニンフィア", img: "ニンフィア.png" }
    ];
    C.eeveeGiga = { key: "キョダイイーブイ", img: "イーブイ巨大マックス.png" };
    C.divTraining = { hp: 600, gigaHp: 900, hearts: 4, weakCount: 5, timeLimit: null };

    // ==========================================
    //  図鑑（グループ分け）
    // ==========================================
    C.dexGroups = {
        kake:    "かけざんの たび",
        mega:    "メガシンカの とう",
        wari:    "わりざんの たび",
        partner: "パートナー",
        eevee:   "イーブイの なかま（イーブイとっくんで あえる）"
    };
    C.dexList.forEach(d => { if (!d.group) d.group = "kake"; });
    const dex = (group, list) => list.forEach(e => C.dexList.push(Object.assign({ group: group }, e)));
    dex("mega", [
        { key: "タイレーツ",     img: "タイレーツ.png" },
        { key: "メガタイレーツ", img: "メガタイレーツ.png", boss: true },
        { key: "メガリザードンY", img: "メガリザードンY.png", boss: true },
        { key: "メガリザードンX", img: "メガリザードンX.png", boss: true },
        { key: "メガレックウザ", img: "メガレックウザ.png", boss: true }
    ]);
    dex("wari", [
        { key: "プラスル", img: "プラスル.png" }, { key: "マイナン", img: "マイナン.png" },
        { key: "トゲデマル", img: "トゲデマル.png" }, { key: "ドオー", img: "ドオー.png" },
        { key: "ヒバニー", img: "ヒバニー.png" }, { key: "ラビフット", img: "ラビフット.png" },
        { key: "イイネイヌ", img: "イイネイヌ.png", boss: true },
        { key: "ヤクデ", img: "ヤクデ.png" }, { key: "マルヤクデ", img: "マルヤクデ.png" },
        { key: "キョダイマルヤクデ", img: "マルヤクデ（キョダイマックスのすがた）.png", boss: true },
        { key: "メルタン", img: "メルタン.png" }, { key: "メルメタル", img: "メルメタル.png" },
        { key: "キョダイメルメタル", img: "メルメタル（キョダイマックスのすがた）.png", boss: true },
        { key: "エースバーン", img: "エースバーン.png" },
        { key: "キョダイエースバーン", img: "エースバーン（キョダイマックスのすがた）.png", boss: true },
        { key: "ジュラルドン", img: "ジュラルドン.png" },
        { key: "キョダイジュラルドン", img: "ジュラルドン（キョダイマックスのすがた）.png", boss: true },
        { key: "スナノケガワ", img: "スナノケガワ.png" }, { key: "ウガツホムラ", img: "ウガツホムラ.png" },
        { key: "タケルライコ", img: "タケルライコ.png" },
        { key: "テツノワダチ", img: "テツノワダチ.png" }, { key: "テツノカイナ", img: "テツノカイナ.png" },
        { key: "テツノコウベ", img: "テツノコウベ.png" }, { key: "テツノドクガ", img: "テツノドクガ.png" },
        { key: "テツノイバラ", img: "テツノイバラ.png" }, { key: "テツノブジン", img: "テツノブジン.png" },
        { key: "テツノイサハ", img: "テツノイサハ.png" }, { key: "テツノカシラ", img: "テツノカシラ.png" },
        { key: "テツノイワオ", img: "テツノイワオ.png" },
        { key: "グレンアルマ", img: "グレンアルマ.png" },
        { key: "ソウブレイズ", img: "ソウブレイズ.png", boss: true },
        { key: "オーガポン（みどりのめん）", img: "オーガポン（みどりのめん）.png" },
        { key: "オーガポン（いどのめん）", img: "オーガポン（いどのめん）.png" },
        { key: "オーガポン（かまどのめん）", img: "オーガポン（かまどのめん）.png" },
        { key: "オーガポン（いしずえのめん）", img: "オーガポン（いしずえのめん）.png", boss: true },
        { key: "ザシアン", img: "ザシアン（れきせんのゆうしゃ）.png" },
        { key: "ザシアン（けんのおう）", img: "ザシアン（けんのおう）.png", boss: true },
        { key: "ザマゼンタ", img: "ザマゼンタ（れきせんのゆうしゃ）.png" },
        { key: "ザマゼンタ（たてのおう）", img: "ザマゼンタ（たてのおう）.png", boss: true },
        { key: "コライドン", img: "コライドン.png", boss: true },
        { key: "ミライドン", img: "ミライドン.png", boss: true },
        { key: "テラパゴス", img: "テラパゴス（ノーマルフォルム）.png" },
        { key: "テラパゴス（テラスタル）", img: "テラパゴス（テラスタルフォルム）.png" },
        { key: "テラパゴス（ステラ）", img: "テラパゴス（ステラフォルム）.png", boss: true },
        { key: "ブリジュラス", img: "ブリジュラス.png" },
        { key: "カミツオロチ", img: "カミツオロチ.png" },
        { key: "ムゲンダイナ", img: "ムゲンダイナ.png", boss: true }
    ]);
    dex("partner", [].concat(...C.partnerOrder.map(k => C.partners[k].line.map(f => ({ key: f.key, img: f.img })))));
    dex("eevee", [
        { key: "エーフィ",   img: "エーフィ.png" },
        { key: "ブラッキー", img: "ブラッキー.png" },
        { key: "リーフィア", img: "リーフィア.png" },
        { key: "グレイシア", img: "グレイシア.png" },
        { key: "ニンフィア", img: "ニンフィア.png" },
        { key: "キョダイイーブイ", img: "イーブイ巨大マックス.png", boss: true }
    ]);

    // ==========================================
    //  きせかえ（ピカチュウ）追加: わりざん・メガシンカの ごほうび
    //  unlock: { type: "stage", id, label } / { type: "divtrain", n }
    // ==========================================
    C.costumes.push(
        { key: "tsumiki",  name: "つみき",       img: "ピカチュウ_積み木.gif",      unlock: { type: "stage", id: "d15", label: "はらっぱの ぬし" } },
        { key: "shokuji",  name: "おしょくじ",   img: "ピカチュウ_食事中.gif",      unlock: { type: "divtrain", n: 3 } },
        { key: "pelipper", name: "ペリッパーと", img: "ピカチュウ＆ぺリッパー.gif", unlock: { type: "stage", id: "d24", label: "キョダイ ジュラルドン" } },
        { key: "pair",     name: "なかよしペア", img: "ピカチュウ_ペア_01.gif",     unlock: { type: "stage", id: "s64", label: "メガシンカの ちょうてん" } },
        { key: "pichu",    name: "ピチューと",   img: "ピカチュウ＆ピチュー.gif",   unlock: { type: "stage", id: "d45", label: "わりざんマスター けんてい" } },
        { key: "tamanta",  name: "タマンタと",   img: "ピカチュウ＆タマンタ.gif",   unlock: { type: "stage", id: "d53", label: "あまりの ぬし" } }
    );

    // ==========================================
    //  おいわい演出（はじめて クリアした あと マップへ もどるとき）
    // ==========================================
    C.celebrations = [
        { stage: "s64", seen: "megaSeen", cleared: "megaCleared",
          title: "💎 メガシンカ マスター！ 💎",
          parade: ["メガタイレーツ.png", "メガリザードンY.png", "メガリザードンX.png", "メガレックウザ.png"],
          msg: "九九を こえた かけざんも マスター！<br>10・11・12の だんも へっちゃらだ！<br><br>🎁 きせかえ「なかよしペア」を ゲット！" },
        { stage: "d45", seen: "divMasterSeen", cleared: "divMasterCleared",
          title: "🏆 わりざんマスター にんてい！ 🏆",
          parade: ["テラパゴス（ステラフォルム）.png", "コライドン.png", "ミライドン.png", "ザシアン（けんのおう）.png", "ザマゼンタ（たてのおう）.png", "オーガポン（みどりのめん）.png"],
          partnerImg: true,
          msg: "でんせつの ポケモンたちに ぜんぶ かった！<br>九九を つかって わりざんも かんぺき！<br>きみは ほんものの <b>わりざんマスター</b>だ！！<br><br>🎁 きせかえ「ピチューと」を ゲット！<br>👑 うらワールド「あまりの しれん」が ひらいた…！" },
        { stage: "d53", seen: "remSeen", cleared: "remCleared",
          title: "👑 あまりも かんぺき！ 👑",
          parade: ["ブリジュラス.png", "カミツオロチ.png", "ムゲンダイナ.png"],
          partnerImg: true,
          msg: "あまりの ある わりざんまで できた！<br>これは 3ねんせいで ならう むずかしい けいさんだよ。<br>きみは ほんとうの <b>わりざん最強王</b>だ！！<br><br>🎁 きせかえ「タマンタと」を ゲット！" }
    ];

    // 実況
    C.commentary.divWrong = ["九九を おもいだそう！", "だいじょうぶ、つぎは できる！"];
})();
