// storage.js
// セーブ・ロード管理（localStorage）

const StorageManager = {
    saveKey: "kuku_saikyoou_save_v1",

    save: function() {
        const data = {
            version: 1,
            facts: GameState.facts,
            clearedStages: GameState.clearedStages,
            badges: GameState.badges,
            dex: GameState.dex,
            costumes: GameState.costumes,
            metamon: GameState.metamon,
            settings: GameState.settings,
            flags: GameState.flags
        };
        try {
            localStorage.setItem(this.saveKey, JSON.stringify(data));
        } catch (e) {
            console.error("セーブに失敗しました", e);
        }
    },

    load: function() {
        let dataStr = null;
        try {
            dataStr = localStorage.getItem(this.saveKey);
        } catch (e) {
            console.error("ロードに失敗しました", e);
            return false;
        }
        if (!dataStr) return false;

        try {
            const data = JSON.parse(dataStr);
            GameState.facts         = data.facts || {};
            GameState.clearedStages = data.clearedStages || {};
            GameState.badges        = data.badges || [];
            GameState.dex           = data.dex || {};
            GameState.costumes      = data.costumes || { unlocked: ["pika"], selected: "pika" };
            if (!GameState.costumes.unlocked || GameState.costumes.unlocked.length === 0) {
                GameState.costumes.unlocked = ["pika"];
            }
            if (!GameState.costumes.selected) GameState.costumes.selected = "pika";
            GameState.metamon       = data.metamon || { lastClearDate: null, clearCount: 0 };
            GameState.settings      = Object.assign({ se: true, bgm: true, slow: false }, data.settings || {});
            GameState.flags         = Object.assign({ endingSeen: false, exCleared: false, saikyoouSeen: false }, data.flags || {});
            return true;
        } catch (e) {
            console.error("セーブデータの読み込みに失敗しました", e);
            return false;
        }
    },

    hasSave: function() {
        try {
            return !!localStorage.getItem(this.saveKey);
        } catch (e) {
            return false;
        }
    },

    clear: function() {
        try {
            localStorage.removeItem(this.saveKey);
        } catch (e) {
            console.error("データ削除に失敗しました", e);
        }
    }
};
