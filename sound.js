// sound.js
// BGM と SE の再生を一元管理（assets/sounds/ の mp3 を使用）

const SoundManager = {

    seVolume: 0.6,
    bgmVolume: 0.30,
    seEnabled: true,
    bgmEnabled: true,

    currentBgm: null,
    currentBgmKey: null,

    sounds: {
        correct:   "assets/sounds/se_correct.mp3",
        wrong:     "assets/sounds/se_wrong.mp3",
        attack:    "assets/sounds/se_attack.mp3",
        damage:    "assets/sounds/se_damage.mp3",
        combo:     "assets/sounds/se_combo.mp3",
        burst:     "assets/sounds/se_burst.mp3",
        levelup:   "assets/sounds/se_levelup.mp3",
        win:       "assets/sounds/se_win.mp3",
        lose:      "assets/sounds/se_lose.mp3",
        trophy:    "assets/sounds/se_trophy.mp3",
        select:    "assets/sounds/se_select.mp3",
        evolution: "assets/sounds/se_evolution.mp3",

        // --- BGM: 本家ポケモン風のwav素材を使用 ---
        bgm_title:        "assets/sounds/～オープニング～.wav",
        bgm_home:         "assets/sounds/ポケモンセンター.wav",
        bgm_battle1:      "assets/sounds/戦い（ＶＳ野生ポケモン）.wav",
        bgm_battle2:      "assets/sounds/戦い（ＶＳトレーナー）.wav",
        bgm_battle_final: "assets/sounds/戦い（ＶＳジムリーダー）.wav",
        bgm_battle_last:  "assets/sounds/ラストバトル（ＶＳライバル）.wav",
        bgm_training:     "assets/sounds/マサキのもとへ－ハナダより.wav",
        bgm_result:       "assets/sounds/勝利（ＶＳ野生ポケモン）.wav"
    },

    init: function() {
        // 軽くプリロード（無くてもエラーにしない）
        for (const key in this.sounds) {
            const audio = new Audio();
            audio.src = this.sounds[key];
            audio.preload = "auto";
            audio.onerror = () => {};
        }
    },

    playSE: function(key) {
        if (!this.seEnabled) return;
        const src = this.sounds[key];
        if (!src) return;
        const audio = new Audio(src);
        audio.volume = this.seVolume;
        audio.onerror = () => {};
        audio.play().catch(() => {});
    },

    playBGM: function(key) {
        if (!this.bgmEnabled) { this.stopBGM(); return; }
        if (this.currentBgmKey === key && this.currentBgm && !this.currentBgm.paused) return;
        this.stopBGM();

        const src = this.sounds[key];
        if (!src) return;

        const audio = new Audio(src);
        audio.volume = this.bgmVolume;
        audio.loop = true;
        audio.onerror = () => {};

        audio.play().catch(() => {
            // 自動再生ブロック対策: 次のクリックで再試行
            const retryPlay = () => {
                if (this.currentBgm === audio && this.bgmEnabled) {
                    audio.play().catch(() => {});
                }
                document.removeEventListener("click", retryPlay);
                document.removeEventListener("touchstart", retryPlay);
            };
            document.addEventListener("click", retryPlay, { once: true });
            document.addEventListener("touchstart", retryPlay, { once: true });
        });

        this.currentBgm = audio;
        this.currentBgmKey = key;
    },

    stopBGM: function() {
        if (this.currentBgm) {
            this.currentBgm.pause();
            this.currentBgm.currentTime = 0;
            this.currentBgm = null;
            this.currentBgmKey = null;
        }
    },

    fadeOutBGM: function(duration) {
        const ms = duration || 800;
        if (!this.currentBgm) return;

        const audio = this.currentBgm;
        this.currentBgm = null;
        this.currentBgmKey = null;

        const startVol = audio.volume;
        const steps = 20;
        const interval = ms / steps;
        const volStep = startVol / steps;
        let step = 0;

        const timer = setInterval(() => {
            step++;
            audio.volume = Math.max(0, startVol - volStep * step);
            if (step >= steps) {
                clearInterval(timer);
                audio.pause();
                audio.currentTime = 0;
            }
        }, interval);
    },

    // ==========================================
    //  コンボ音: ド→レ→ミ…と上がっていく（WebAudio合成）
    // ==========================================
    _audioCtx: null,

    playComboTone: function(combo) {
        if (!this.seEnabled) return;
        try {
            if (!this._audioCtx) {
                this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            const ctx = this._audioCtx;
            if (ctx.state === "suspended") ctx.resume();

            // ドレミファソラシド（C5〜C6）をコンボ数で上昇、上限で往復せずキープ
            const scale = [523.25, 587.33, 659.25, 698.46, 783.99, 880.0, 987.77, 1046.5];
            const freq = scale[Math.min(combo - 1, scale.length - 1)];

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "square";
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.25);
        } catch (e) { /* WebAudio非対応でも無視 */ }
    },

    setSEEnabled: function(on) {
        this.seEnabled = on;
    },

    setBGMEnabled: function(on) {
        this.bgmEnabled = on;
        if (!on) this.stopBGM();
    }
};
