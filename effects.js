// effects.js
// バトルエフェクトの表示を管理する
// 純CSSアニメーション方式 — 画像素材不要

const EffectManager = {

    // エフェクトレイヤーを取得
    _getLayer: function() {
        return document.getElementById("effect-layer");
    },

    // ==========================================
    //  汎用：エフェクト要素を表示して自動削除
    // ==========================================
    _playEffect: function(elementId, duration) {
        const el = document.getElementById(elementId);
        if (!el) return;

        // リセットして再発火
        el.classList.remove("fx-active");
        void el.offsetWidth;
        el.classList.add("fx-active");

        setTimeout(() => {
            el.classList.remove("fx-active");
        }, duration);
    },

    // ==========================================
    //  1. 炎エフェクト（味方の通常攻撃）
    // ==========================================
    playFire: function() {
        this._playEffect("fx-fire", 700);
    },

    // ==========================================
    //  2. 雷エフェクト（スピードボーナス攻撃）
    // ==========================================
    playThunder: function() {
        this._playEffect("fx-thunder", 500);
    },

    // ==========================================
    //  3. 敵攻撃エフェクト（不正解時）
    // ==========================================
    playEnemyAttack: function() {
        this._playEffect("fx-enemy-attack", 600);
    },

    // ==========================================
    //  4. バーストエフェクト（5コンボ+）
    // ==========================================
    playBurst: function() {
        this._playEffect("fx-burst", 800);
    },

    // ==========================================
    //  5. ダメージ数値ポップアップ
    // ==========================================
    showDamageNumber: function(damage, type) {
        // type: "enemy"(敵へのダメージ) or "player"(味方へのダメージ)
        const layer = this._getLayer();
        if (!layer) return;

        const el = document.createElement("div");
        el.className = "fx-damage-number fx-dmg-" + type;
        el.textContent = (type === "enemy") ? `-${damage}` : `-${damage}`;

        // 少しランダムに横位置をずらす
        const offset = Math.floor(Math.random() * 40) - 20;
        el.style.marginLeft = offset + "px";

        layer.appendChild(el);

        // アニメーション終了後に削除
        setTimeout(() => {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 900);
    },

    // ==========================================
    //  6. 正解エフェクト（◎ + キラキラ + 緑フラッシュ）
    // ==========================================
    playCorrect: function() {
        this._playEffect("fx-correct-flash", 500);
        this._playEffect("fx-correct-circle", 600);
        // キラキラ星を散らす
        this._spawnSparkles(6);
    },

    // ==========================================
    //  7. 不正解エフェクト（✕ + 赤フラッシュ）
    // ==========================================
    playWrong: function() {
        this._playEffect("fx-wrong-flash", 400);
        this._playEffect("fx-wrong-x", 500);
    },

    // ==========================================
    //  キラキラ星を生成（一時要素）
    // ==========================================
    _spawnSparkles: function(count) {
        const layer = this._getLayer();
        if (!layer) return;
        for (let i = 0; i < count; i++) {
            const spark = document.createElement("div");
            spark.className = "fx-sparkle";
            spark.style.top = (20 + Math.random() * 50) + "%";
            spark.style.left = (10 + Math.random() * 80) + "%";
            spark.style.animation = `fxSparkle ${0.4 + Math.random() * 0.3}s ${i * 0.05}s ease-out forwards`;
            layer.appendChild(spark);
            setTimeout(() => { if (spark.parentNode) spark.parentNode.removeChild(spark); }, 800);
        }
    },

    // ==========================================
    //  8. 複合エフェクト：味方攻撃（スピードボーナス判定付き）
    // ==========================================
    playPlayerAttack: function(damage, hasSpeedBonus) {
        if (hasSpeedBonus) {
            this.playThunder();
        } else {
            this.playFire();
        }
        // 敵の被弾リアクション
        this._triggerEnemyHit();
        // 少し遅らせてダメージ数値を表示
        setTimeout(() => {
            this.showDamageNumber(damage, "enemy");
        }, 150);
    },

    // ==========================================
    //  9. 複合エフェクト：敵攻撃
    // ==========================================
    playEnemyDamage: function(damage) {
        // 敵の突進アニメーション
        this._triggerEnemyAttackAnim();
        this.playEnemyAttack();
        // 味方の被弾リアクション
        setTimeout(() => {
            this._triggerPlayerHit();
            this.showDamageNumber(damage, "player");
        }, 200);
    },

    // ==========================================
    //  10. キャラクターリアクション補助
    // ==========================================
    _triggerEnemyHit: function() {
        const img = document.getElementById("enemy-img");
        if (!img) return;
        img.classList.remove("enemy-hit");
        void img.offsetWidth;
        img.classList.add("enemy-hit");
        setTimeout(() => img.classList.remove("enemy-hit"), 600);
    },

    _triggerEnemyAttackAnim: function() {
        const img = document.getElementById("enemy-img");
        if (!img) return;
        img.classList.remove("enemy-attack");
        void img.offsetWidth;
        img.classList.add("enemy-attack");
        setTimeout(() => img.classList.remove("enemy-attack"), 500);
    },

    // ==========================================
    //  11. レベルアップ演出（画面フラッシュ＋テキスト）
    // ==========================================
    playLevelUp: function() {
        // フラッシュ
        const flash = document.getElementById("fx-levelup-flash");
        if (flash) {
            flash.classList.remove("fx-active");
            void flash.offsetWidth;
            flash.classList.add("fx-active");
            setTimeout(() => flash.classList.remove("fx-active"), 900);
        }
        // テキスト
        const text = document.getElementById("fx-levelup-text");
        if (text) {
            text.classList.remove("fx-active");
            void text.offsetWidth;
            text.classList.add("fx-active");
            setTimeout(() => text.classList.remove("fx-active"), 1300);
        }
        // キラキラも一緒に
        this._spawnSparkles(10);
    },

    _triggerPlayerHit: function() {
        const img = document.getElementById("player-img");
        if (!img) return;
        img.classList.remove("player-hit");
        void img.offsetWidth;
        img.classList.add("player-hit");
        setTimeout(() => img.classList.remove("player-hit"), 500);
    }
};
