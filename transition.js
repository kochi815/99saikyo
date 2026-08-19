// transition.js
// 画面遷移アニメーションを一元管理する
//
// 使い方:
//   TransitionManager.fade(hideIds, showId, showDisplay, callback)
//   TransitionManager.battleWipe(hideIds, showId, callback)

const TransitionManager = {

    _busy: false,

    // ==========================================
    //  1. フェード遷移（暗転 → 画面切替 → 復帰）
    //     一般的な画面遷移に使う
    // ==========================================
    fade: function(hideIds, showId, showDisplay, callback, color) {
        if (this._busy) return;
        this._busy = true;

        const overlay = document.getElementById("transition-overlay");
        showDisplay = showDisplay || "block";
        color = color || "fade-black";

        // フェーズ1: 暗転
        overlay.className = "transition-active " + color + " fade-in";

        setTimeout(() => {
            try {
                // 画面を切り替え
                this._switchScreens(hideIds, showId, showDisplay);
            } catch (e) {
                console.error("[Transition] switchScreens error:", e);
            }

            // フェーズ2: 復帰
            overlay.className = "transition-active " + color + " fade-out";

            setTimeout(() => {
                overlay.className = "";
                overlay.style.opacity = "";
                this._busy = false;
                try {
                    if (callback) callback();
                } catch (e) {
                    console.error("[Transition] callback error:", e);
                }
            }, 380);
        }, 380);
    },

    // ==========================================
    //  2. バトル突入ワイプ（上下ワイプ + VS表示）
    //     大会開始時に使う
    // ==========================================
    battleWipe: function(hideIds, showId, callback) {
        if (this._busy) return;
        this._busy = true;

        const wipeTop = document.getElementById("wipe-top");
        const wipeBottom = document.getElementById("wipe-bottom");
        const wipeVs = document.getElementById("wipe-vs");
        const overlay = document.getElementById("transition-overlay");

        // ワイプ中は透明オーバーレイでクリックを遮断（ワイプ板はpointer-events:none）
        if (overlay) {
            overlay.className = "transition-active";
            overlay.style.opacity = "0";
        }

        // リセット
        wipeTop.className = "battle-wipe-top";
        wipeBottom.className = "battle-wipe-bottom";
        wipeVs.className = "wipe-vs";

        // フェーズ1: ワイプ閉じる
        wipeTop.classList.add("wipe-close");
        wipeBottom.classList.add("wipe-close");

        setTimeout(() => {
            // VS表示
            wipeVs.classList.add("vs-show");

            // 裏で画面を切り替え
            try {
                this._switchScreens(hideIds, showId, "flex");
            } catch (e) {
                console.error("[Transition] battleWipe switchScreens error:", e);
            }
        }, 550);

        setTimeout(() => {
            // VS非表示
            wipeVs.classList.add("vs-hide");

            // フェーズ2: ワイプ開く
            wipeTop.className = "battle-wipe-top wipe-open";
            wipeBottom.className = "battle-wipe-bottom wipe-open";
        }, 1400);

        setTimeout(() => {
            // クリーンアップ
            wipeTop.className = "battle-wipe-top";
            wipeBottom.className = "battle-wipe-bottom";
            wipeVs.className = "wipe-vs";
            if (overlay) {
                overlay.className = "";
                overlay.style.opacity = "";
            }
            this._busy = false;
            try {
                if (callback) callback();
            } catch (e) {
                console.error("[Transition] battleWipe callback error:", e);
            }
        }, 2050);
    },

    // ==========================================
    //  3. 即時遷移（アニメなし、互換用）
    // ==========================================
    instant: function(hideIds, showId, showDisplay) {
        this._switchScreens(hideIds, showId, showDisplay || "block");
    },

    // ==========================================
    //  内部：画面の表示/非表示を切り替え
    // ==========================================
    _switchScreens: function(hideIds, showId, showDisplay) {
        // hideIdsは配列でも単一IDでもOK、nullの場合は空配列
        if (!hideIds) hideIds = [];
        if (typeof hideIds === "string") hideIds = [hideIds];

        hideIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = "none";
                // result-screen等のactiveクラスも除去
                el.classList.remove("active");
            }
        });

        if (showId) {
            const showEl = document.getElementById(showId);
            if (showEl) {
                // インラインstyleをクリアしてからdisplayをセット
                showEl.style.display = "";
                showEl.style.display = showDisplay || "block";
                // 登場アニメーション
                showEl.classList.remove("screen-enter");
                void showEl.offsetWidth; // リフロー強制
                showEl.classList.add("screen-enter");
            }
        }
    }
};
