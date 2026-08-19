// config.js
// 九九最強王 全設定データ
// ステージ定義・九九の唱え読み・図鑑・きせかえ

const GameConfig = {

    // ==========================================
    //  九九の唱え読み（kukuYomi[a][b] a,bは1〜9）
    // ==========================================
    kukuYomi: {
        1: ["いんいちが いち", "いんにが に", "いんさんが さん", "いんしが し", "いんごが ご", "いんろくが ろく", "いんしちが しち", "いんはちが はち", "いんくが く"],
        2: ["にいちが に", "ににんが し", "にさんが ろく", "にしが はち", "にご じゅう", "にろく じゅうに", "にしち じゅうし", "にはち じゅうろく", "にく じゅうはち"],
        3: ["さんいちが さん", "さんにが ろく", "さざんが く", "さんし じゅうに", "さんご じゅうご", "さぶろく じゅうはち", "さんしち にじゅういち", "さんぱ にじゅうし", "さんく にじゅうしち"],
        4: ["しいちが し", "しにが はち", "しさん じゅうに", "しし じゅうろく", "しご にじゅう", "しろく にじゅうし", "ししち にじゅうはち", "しは さんじゅうに", "しく さんじゅうろく"],
        5: ["ごいちが ご", "ごに じゅう", "ごさん じゅうご", "ごし にじゅう", "ごご にじゅうご", "ごろく さんじゅう", "ごしち さんじゅうご", "ごは しじゅう", "ごっく しじゅうご"],
        6: ["ろくいちが ろく", "ろくに じゅうに", "ろくさん じゅうはち", "ろくし にじゅうし", "ろくご さんじゅう", "ろくろく さんじゅうろく", "ろくしち しじゅうに", "ろくは しじゅうはち", "ろっく ごじゅうし"],
        7: ["しちいちが しち", "しちに じゅうし", "しちさん にじゅういち", "しちし にじゅうはち", "しちご さんじゅうご", "しちろく しじゅうに", "しちしち しじゅうく", "しちは ごじゅうろく", "しちく ろくじゅうさん"],
        8: ["はちいちが はち", "はちに じゅうろく", "はちさん にじゅうし", "はちし さんじゅうに", "はちご しじゅう", "はちろく しじゅうはち", "はちしち ごじゅうろく", "はっぱ ろくじゅうし", "はっく しちじゅうに"],
        9: ["くいちが く", "くに じゅうはち", "くさん にじゅうしち", "くし さんじゅうろく", "くご しじゅうご", "くろく ごじゅうし", "くしち ろくじゅうさん", "くは しちじゅうに", "くく はちじゅういち"]
    },

    // 数字のよみ（問題のふりがな用）
    numYomi: ["", "いち", "に", "さん", "し", "ご", "ろく", "しち", "はち", "く"],

    // 唱え読みを取得
    getYomi: function(a, b) {
        return (this.kukuYomi[a] && this.kukuYomi[a][b - 1]) || "";
    },

    // ==========================================
    //  バトル数値
    // ==========================================
    battle: {
        normalDamage: 100,        // 通常正解ダメージ
        criticalDamage: 150,      // クリティカル（3秒以内）
        voltDamage: 300,          // 10まんボルト
        criticalTime: 3000,       // クリティカル判定ms
        voltGaugeMax: 5,          // ゲージMAXに必要な正解数
        inputLockMs: 400,         // 出題直後の入力ロック
        weakMixRate: { 2: 0.2, 3: 0.3 }  // ワールド別 苦手混入率
    },

    // ==========================================
    //  ステージ定義
    //  dans: 出題する段 / enemies: 連戦対応
    //  gimmick: shuffle(選択肢入替) / counter(誤答2ダメージ) /
    //           rage(HP半分で2形態) / barrier(クリティカルのみ有効)
    //  timeLimit: 1問の制限時間ms（nullなら無制限）
    // ==========================================
    stages: [
        // --- ワールド1: だんバッジロード ---
        { id: "s10", world: 1, name: "はじまりのもり",  subName: "1のだん",   dans: [1], badge: 1, hearts: 4, timeLimit: null, oboeTime: true,
          enemies: [{ key: "ピチュー", img: "ピチュー01.gif", hp: 500 }] },
        { id: "s11", world: 1, name: "5のだんジム",     subName: "5のだん",   dans: [5], badge: 5, hearts: 4, timeLimit: null, oboeTime: true,
          enemies: [{ key: "コイキング", img: "コイキング01.gif", hp: 800 }] },
        { id: "s12", world: 1, name: "2のだんジム",     subName: "2のだん",   dans: [2], badge: 2, hearts: 4, timeLimit: null, oboeTime: true,
          enemies: [{ key: "ヤドン", img: "ヤドン01.gif", hp: 800 }] },
        { id: "s13", world: 1, name: "3のだんジム",     subName: "3のだん",   dans: [3], badge: 3, hearts: 4, timeLimit: null, oboeTime: true,
          enemies: [{ key: "コダック", img: "コダック01.gif", hp: 800 }] },
        { id: "s14", world: 1, name: "4のだんジム",     subName: "4のだん",   dans: [4], badge: 4, hearts: 4, timeLimit: null, oboeTime: true,
          enemies: [{ key: "ニャース", img: "ニャース01.gif", hp: 900 }] },
        { id: "s15", world: 1, name: "6のだんジム",     subName: "6のだん",   dans: [6], badge: 6, hearts: 4, timeLimit: null, oboeTime: true,
          enemies: [{ key: "プリン", img: "プリン01.gif", hp: 900 }] },
        { id: "s16", world: 1, name: "7のだんジム",     subName: "7のだん",   dans: [7], badge: 7, hearts: 4, timeLimit: null, oboeTime: true,
          enemies: [{ key: "ピッピ", img: "ピッピ01.gif", hp: 1000 }] },
        { id: "s17", world: 1, name: "8のだんジム",     subName: "8のだん",   dans: [8], badge: 8, hearts: 4, timeLimit: null, oboeTime: true,
          enemies: [{ key: "ロコン", img: "ロコン01.gif", hp: 1000 }] },
        { id: "s18", world: 1, name: "9のだんジム",     subName: "9のだん",   dans: [9], badge: 9, hearts: 4, timeLimit: null, oboeTime: true,
          enemies: [{ key: "イーブイ", img: "イーブイ01.gif", hp: 1000 }] },
        { id: "s19", world: 1, name: "ジムボス",        subName: "ぜんぶミックス", dans: [1,2,3,4,5,6,7,8,9], hearts: 5, timeLimit: null, boss: true,
          enemies: [{ key: "ゲンガー", img: "ゲンガー01.gif", hp: 1300, gimmick: "shuffle" }] },

        // --- ワールド2: ミックスコロシアム ---
        { id: "s21", world: 2, name: "みずべのたたかい", subName: "2と5のだん", dans: [2,5], hearts: 4, timeLimit: 10000,
          enemies: [{ key: "ゼニガメ", img: "ゼニガメ01.gif", hp: 900 }] },
        { id: "s22", world: 2, name: "もりのたたかい",   subName: "3と4のだん", dans: [3,4], hearts: 4, timeLimit: 10000,
          enemies: [{ key: "フシギダネ", img: "フシギダネ01.gif", hp: 900 }] },
        { id: "s23", world: 2, name: "ほのおのしれん",   subName: "2〜5のだん", dans: [2,3,4,5], hearts: 4, timeLimit: 10000,
          enemies: [{ key: "ヒトカゲ", img: "ヒトカゲ01.gif", hp: 1000, gimmick: "rage", rageImg: "ヒトカゲ02.gif" }] },
        { id: "s24", world: 2, name: "いなずま連戦",     subName: "6と7のだん", dans: [6,7], hearts: 4, timeLimit: 10000,
          enemies: [{ key: "シャワーズ", img: "シャワーズ01.gif", hp: 600 },
                    { key: "サンダース", img: "サンダース01.gif", hp: 600 }] },
        { id: "s25", world: 2, name: "カウンターのわな", subName: "7と8のだん", dans: [7,8], hearts: 5, timeLimit: 10000,
          enemies: [{ key: "ソーナンス", img: "ソーナンス01.gif", hp: 500, gimmick: "counter" },
                    { key: "ブースター", img: "ブースター01.gif", hp: 1000 }] },
        { id: "s26", world: 2, name: "あらぶる大ボス",   subName: "8と9のだん", dans: [8,9], hearts: 5, timeLimit: 10000, boss: true,
          enemies: [{ key: "ギャラドス", img: "ギャラドス01.gif", hp: 1500, gimmick: "rage", rageTimeCut: 2000 }] },

        // --- ワールド3: でんせつロード ---
        { id: "s31", world: 3, name: "ほのおのやま",     subName: "1〜5ミックス", dans: [1,2,3,4,5], hearts: 4, timeLimit: 8000,
          enemies: [{ key: "ファイヤー", img: "ファイヤー01.gif", hp: 1200 }] },
        { id: "s32", world: 3, name: "あらしのそら",     subName: "6〜9ミックス", dans: [6,7,8,9], hearts: 4, timeLimit: 8000,
          enemies: [{ key: "サンダー", img: "サンダー01.gif", hp: 700 },
                    { key: "フリーザー", img: "フリーザー01.gif", hp: 700 }] },
        { id: "s33", world: 3, name: "にがてリベンジ",   subName: "きみのにがて", dans: [7,8,9], hearts: 4, timeLimit: 8000, weakStage: true,
          enemies: [{ key: "カビゴン", img: "カビゴン01.gif", hp: 1200 }] },
        { id: "s34", world: 3, name: "チャンピオンせん", subName: "ぜんぶランダム", dans: [1,2,3,4,5,6,7,8,9], hearts: 5, timeLimit: 8000, boss: true, bgm: "bgm_battle_last",
          enemies: [{ key: "リザードン", img: "リザードン01.gif", hp: 900 },
                    { key: "カイリュー", img: "カイリュー01.gif", hp: 900, timeLimit: 7000 },
                    { key: "ミュウツー", img: "ミュウツー01.gif", hp: 1400, timeLimit: 5000, gimmick: "barrier" }] },

        // --- 裏面 ---
        { id: "ex1", world: 4, name: "まぼろしの島",     subName: "3びょうしょうぶ！", dans: [1,2,3,4,5,6,7,8,9], hearts: 3, timeLimit: 3000, boss: true, secret: true,
          enemies: [{ key: "ミュウ", img: "ミュウ01.gif", hp: 1400 }] }
    ],

    // ステージをIDで取得
    getStage: function(id) {
        return this.stages.find(s => s.id === id) || null;
    },

    // 進行順リスト（解禁チェック用）
    stageOrder: ["s10","s11","s12","s13","s14","s15","s16","s17","s18","s19",
                 "s21","s22","s23","s24","s25","s26",
                 "s31","s32","s33","s34","ex1"],

    // 裏面解禁条件: s34クリア + くくマップ銀以上60マス
    exUnlockSilver: 60,

    // ==========================================
    //  メタモンとっくん（苦手ミニバトル）
    // ==========================================
    metamon: {
        hp: 600,
        hearts: 4,
        weakCount: 5,     // 苦手TOP5を出題
        timeLimit: null
    },

    // ==========================================
    //  ワールド情報
    // ==========================================
    worlds: {
        1: { name: "ワールド1 だんバッジロード", bgm: "bgm_battle1" },
        2: { name: "ワールド2 ミックスコロシアム", bgm: "bgm_battle2" },
        3: { name: "ワールド3 でんせつロード", bgm: "bgm_battle_final" },
        4: { name: "うらワールド まぼろしの島", bgm: "bgm_battle_last" }
    },

    // ==========================================
    //  図鑑（登場順）
    // ==========================================
    dexList: [
        { key: "ピチュー",     img: "ピチュー01.gif" },
        { key: "コイキング",   img: "コイキング01.gif" },
        { key: "ヤドン",       img: "ヤドン01.gif" },
        { key: "コダック",     img: "コダック01.gif" },
        { key: "ニャース",     img: "ニャース01.gif" },
        { key: "プリン",       img: "プリン01.gif" },
        { key: "ピッピ",       img: "ピッピ01.gif" },
        { key: "ロコン",       img: "ロコン01.gif" },
        { key: "イーブイ",     img: "イーブイ01.gif" },
        { key: "ゲンガー",     img: "ゲンガー01.gif", boss: true },
        { key: "ゼニガメ",     img: "ゼニガメ01.gif" },
        { key: "フシギダネ",   img: "フシギダネ01.gif" },
        { key: "ヒトカゲ",     img: "ヒトカゲ01.gif" },
        { key: "シャワーズ",   img: "シャワーズ01.gif" },
        { key: "サンダース",   img: "サンダース01.gif" },
        { key: "ソーナンス",   img: "ソーナンス01.gif" },
        { key: "ブースター",   img: "ブースター01.gif" },
        { key: "ギャラドス",   img: "ギャラドス01.gif", boss: true },
        { key: "ファイヤー",   img: "ファイヤー01.gif" },
        { key: "サンダー",     img: "サンダー01.gif" },
        { key: "フリーザー",   img: "フリーザー01.gif" },
        { key: "カビゴン",     img: "カビゴン01.gif" },
        { key: "リザードン",   img: "リザードン01.gif", boss: true },
        { key: "カイリュー",   img: "カイリュー01.gif", boss: true },
        { key: "ミュウツー",   img: "ミュウツー01.gif", boss: true },
        { key: "ミュウ",       img: "ミュウ01.gif", boss: true },
        { key: "メタモン",     img: "メタモン01.gif" }
    ],

    // ==========================================
    //  きせかえ（パートナーの見た目）
    //  unlock: { type: "star", n: 星数 } / { type: "metamon", n: 回数 } /
    //          { type: "default" } / { type: "ex" }
    // ==========================================
    costumes: [
        { key: "pika",       name: "ピカチュウ",        img: "ピカチュウ01.gif",            unlock: { type: "default" } },
        { key: "soccer",     name: "サッカー",          img: "ピカチュウ_サッカー.gif",      unlock: { type: "star", n: 5 } },
        { key: "cook",       name: "コックさん",        img: "ピカチュウ_コックさん.gif",    unlock: { type: "star", n: 10 } },
        { key: "naminori",   name: "なみのり",          img: "ピカチュウ_なみのり.gif",      unlock: { type: "star", n: 15 } },
        { key: "dance",      name: "ダンス",            img: "ピカチュウ_ダンス.gif",        unlock: { type: "star", n: 20 } },
        { key: "halloween",  name: "ハロウィン",        img: "ピカチュウ_ハロウィン.gif",    unlock: { type: "star", n: 25 } },
        { key: "hakama",     name: "はかま",            img: "ピカチュウ_はかま.gif",        unlock: { type: "star", n: 30 } },
        { key: "shishimai",  name: "ししまい",          img: "ピカチュウ_獅子舞.gif",        unlock: { type: "star", n: 35 } },
        { key: "santa",      name: "サンタ",            img: "ピカチュウサンタ.gif",         unlock: { type: "star", n: 40 } },
        { key: "oshogatsu",  name: "おしょうがつ",      img: "ピカチュウ_お正月.gif",        unlock: { type: "star", n: 45 } },
        { key: "taisou",     name: "たいそう",          img: "ピカチュウ_体操.gif",          unlock: { type: "metamon", n: 1 } },
        { key: "uta",        name: "うた",              img: "ピカチュウ_歌.gif",            unlock: { type: "metamon", n: 2 } },
        { key: "valentine",  name: "バレンタイン",      img: "ピカチュウ_バレンタイン.gif",  unlock: { type: "metamon", n: 3 } },
        { key: "yukidaruma", name: "ゆきだるま",        img: "ピカチュウ_雪だるま.gif",      unlock: { type: "metamon", n: 5 } },
        { key: "koinobori",  name: "こいのぼり",        img: "ピカチュウ_鯉のぼり.gif",      unlock: { type: "metamon", n: 7 } },
        { key: "ohinasama",  name: "おひなさま",        img: "ピカチュウ_お雛様.gif",        unlock: { type: "metamon", n: 10 } },
        { key: "raichu",     name: "ライチュウ",        img: "ライチュウ01.gif",             unlock: { type: "ex" } }
    ],

    // タイトル画面の月替わりピカチュウ
    monthlyPika: {
        1: "ピカチュウ_お正月.gif",
        2: "ピカチュウ_バレンタイン.gif",
        3: "ピカチュウ_お雛様.gif",
        4: "ピカチュウ_サッカー.gif",
        5: "ピカチュウ_鯉のぼり.gif",
        6: "ピカチュウ_ダンス.gif",
        7: "ピカチュウ_なみのり.gif",
        8: "ピカチュウ_なみのり.gif",
        9: "ピカチュウ_歌.gif",
        10: "ピカチュウ_ハロウィン.gif",
        11: "ピカチュウ_食事中.gif",
        12: "ピカチュウサンタ.gif"
    },

    // 正誤リアクション用フェイス
    faces: {
        correct: ["ピカチュウフェイス01.gif", "ピカチュウフェイス02.gif", "ピカチュウフェイス04.gif", "ピカチュウフェイス09.gif"],
        wrong:   ["ピカチュウフェイス07.gif", "ピカチュウフェイス03.gif"]
    },

    // 実況テキスト
    commentary: {
        critical: ["はやい！ すごいスピードだ！", "でんこうせっか！", "クリティカル！！"],
        volt:     ["10まんボルト！！ ひっさつだ！"],
        revenge:  ["リベンジせいこう！ おぼえたね！"],
        combo:    ["コンボが つながってる！", "そのちょうし！", "れんぞくせいかい！"],
        wrong:    ["だいじょうぶ、つぎはできる！", "まちがえても へいき！"],
        barrier:  ["バリアだ！ 3びょういないに こたえよう！"]
    }
};
