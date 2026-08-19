// main.js
// 起動処理とイベント登録
// 前作の教訓: onclick属性は使わず、ここで addEventListener を集中登録する

document.addEventListener("DOMContentLoaded", () => {

    // --- 初期化 ---
    SoundManager.init();
    StorageManager.load();
    SoundManager.setSEEnabled(GameState.settings.se);
    SoundManager.setBGMEnabled(GameState.settings.bgm);

    // --- イベント集中登録 ---
    const bind = (id, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("click", fn);
        else console.warn("[main] 要素が見つかりません: #" + id);
    };

    // タイトル
    bind("title-start-btn", () => TitleScreen.start());

    // マップのメニュー
    bind("map-kuku-btn",    () => KukuScreen.show(["map-screen"]));
    bind("map-dex-btn",     () => DexScreen.show(["map-screen"]));
    bind("map-dress-btn",   () => DressScreen.show(["map-screen"]));
    bind("map-settings-btn",() => SettingsScreen.show(["map-screen"]));
    bind("map-metamon-btn", () => MapScreen.startMetamon());

    // バトル
    bind("battle-quit-btn", () => BattleManager.quitBattle());

    // リザルト
    bind("victory-map-btn",   () => ResultScreen.backToMap());
    bind("victory-retry-btn", () => ResultScreen.retry());
    bind("defeat-retry-btn",  () => ResultScreen.defeatRetry());
    bind("defeat-map-btn",    () => ResultScreen.defeatToMap());

    // エンディング
    bind("ending-close-btn", () => Ending.close());

    // くくマップ
    bind("kuku-back-btn",           () => KukuScreen.back());
    bind("kuku-practice-close-btn", () => KukuScreen.closePractice());

    // ずかん
    bind("dex-back-btn",  () => DexScreen.back());
    bind("dex-big",       () => DexScreen.closeBig());

    // きせかえ
    bind("dress-back-btn", () => DressScreen.back());

    // せってい
    bind("settings-se",        () => SettingsScreen.toggleSE());
    bind("settings-bgm",       () => SettingsScreen.toggleBGM());
    bind("settings-slow",      () => SettingsScreen.toggleSlow());
    bind("settings-reset-btn", () => SettingsScreen.resetData());
    bind("settings-report-btn",() => ReportScreen.show(["settings-screen"]));
    bind("settings-back-btn",  () => SettingsScreen.back());

    // レポート
    bind("report-back-btn", () => ReportScreen.back());

    // --- タイトル表示 ---
    TitleScreen.show(null);
    SoundManager.playBGM("bgm_title");
});
