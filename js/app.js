// ========================================================
// GYM脈 口コミ作成サポートツール - メインアプリ
// ========================================================

// ======================================================
// アンケート質問定義
// ======================================================
const QUESTIONS = {
  q1: {
    key: 'purposes',
    label: 'ジムに来た目的は？',
    hint: '当てはまるものをすべて選んでください',
    multi: true,
    required: true,
    options: [
      { value: 'diet',       label: 'ダイエット・体を引き締めたい' },
      { value: 'health',     label: '運動不足の解消・健康のため' },
      { value: 'stress',     label: 'ストレスを発散したかった' },
      { value: 'kickboxing', label: 'キックボクシングに興味があった' },
      { value: 'withFriend', label: '友達と一緒に来た' },
    ],
  },
  q2: {
    key: 'prevSituation',
    label: '来る前はどんな状況でしたか？',
    hint: '当てはまれば選んでください（スキップOK）',
    multi: true,
    required: false,
    allowSkip: true,
    skipLabel: 'スキップ',
    options: [
      { value: 'neverExercised', label: 'ほとんど運動していなかった' },
      { value: 'gym24fail',      label: '24時間ジムが続かなかった経験がある' },
      { value: 'aloneNoGood',    label: '一人だと続かないタイプ' },
      { value: 'longAbsence',    label: '運動がかなり久しぶりだった' },
    ],
  },
  q3: {
    key: 'services',
    label: '今日体験して楽しかったトレーニングは？',
    hint: '複数選択できます',
    multi: true,
    required: true,
    options: [
      { value: 'kickboxing',   label: 'キックボクシング' },
      { value: 'hiit',         label: 'HIIT（脂肪燃焼トレーニング）' },
      { value: 'strength',     label: '筋力トレーニング' },
      { value: 'semiPersonal', label: 'セミパーソナルトレーニング' },
    ],
  },
  q4: {
    key: 'howItWas',
    label: 'やってみてどうでしたか？',
    hint: '当てはまるものを選んでください（スキップOK）',
    multi: true,
    required: false,
    allowSkip: true,
    skipLabel: 'スキップ',
    options: [
      { value: 'moreFunThanExpected', label: '思った以上に楽しかった' },
      { value: 'bigSweat',            label: 'かなり汗をかけた' },
      { value: 'timeFlew',            label: '時間があっという間だった' },
      { value: 'toughButFun',         label: 'キツいけど楽しかった' },
      { value: 'couldKeepUp',         label: '初心者でもついていけた' },
    ],
  },
  q5: {
    key: 'afterFeel',
    label: '運動後どう感じましたか？',
    hint: '当てはまるものを選んでください（スキップOK）',
    multi: true,
    required: false,
    allowSkip: true,
    skipLabel: 'スキップ',
    options: [
      { value: 'refresh',      label: 'スッキリした' },
      { value: 'achievement',  label: '達成感があった' },
      { value: 'stressRelief', label: 'ストレスが発散できた' },
      { value: 'wantReturn',   label: 'また来たいと思った' },
      { value: 'canContinue',  label: 'これなら続けられそう' },
    ],
  },
};

// ======================================================
// アプリ状態管理
// ======================================================
const APP = (() => {

  const STEPS = [
    { id: 'welcome', title: '',          qs: [] },
    { id: 'step1',   title: '目的・背景', qs: ['q1', 'q2'] },
    { id: 'step2',   title: '体験',      qs: ['q3', 'q4'] },
    { id: 'step3',   title: '感想',      qs: ['q5'] },
    { id: 'result',  title: '口コミ確認', qs: [] },
  ];

  const TOTAL_SURVEY_STEPS = 3;

  let state = {
    currentStep: 0,
    answers: {
      purposes:      [],
      prevSituation: [],
      services:      [],
      howItWas:      [],
      afterFeel:     [],
    },
    generatedText: '',
    generatedStructKey: '',
    isGenerating: false,
    regenCount: 0,
    hasCopied: false,
  };

  // ======================================================
  // DOM初期化
  // ======================================================
  function init() {
    renderCurrentStep();
    FIREBASE_SERVICE.syncCache().catch(err => {
      console.warn('[GYM脈] キャッシュ同期失敗:', err);
    });
  }

  // ======================================================
  // ステップ描画
  // ======================================================
  function renderCurrentStep() {
    const step = STEPS[state.currentStep];
    const app  = document.getElementById('app');

    // プログレスバー更新
    updateProgress();

    switch (step.id) {
      case 'welcome': renderWelcome(app); break;
      case 'step1':   renderSurveyStep(app, step, 1); break;
      case 'step2':   renderSurveyStep(app, step, 2); break;
      case 'step3':   renderSurveyStep(app, step, 3); break;
      case 'result':  renderResult(app); break;
    }
  }

  function updateProgress() {
    const bar     = document.getElementById('progress-bar');
    const label   = document.getElementById('progress-label');
    const wrapper = document.getElementById('progress-wrapper');
    if (!bar || !label || !wrapper) return;

    const step = STEPS[state.currentStep];
    if (step.id === 'welcome' || step.id === 'result') {
      wrapper.style.display = 'none';
      return;
    }
    wrapper.style.display = 'block';
    const idx     = state.currentStep; // 1-4
    const pct     = Math.round((idx / TOTAL_SURVEY_STEPS) * 100);
    bar.style.width = pct + '%';
    label.textContent = `STEP ${idx} / ${TOTAL_SURVEY_STEPS}`;
  }

  // ======================================================
  // ウェルカム画面
  // ======================================================
  function renderWelcome(app) {
    app.innerHTML = `
      <div class="screen screen--welcome">
        <div class="welcome-icon">💪</div>
        <h1 class="welcome-title">ご来店ありがとうございました！</h1>
        <p class="welcome-subtitle">
          <strong>${CONFIG.GYM_NAME}</strong><br>
          実際に体験した内容を選ぶだけで<br>口コミの下書きを作成できます。
        </p>
        <p class="welcome-time">約30〜60秒で完了します</p>
        <button class="btn btn--primary btn--large" id="btn-start">
          はじめる
        </button>
        <p class="welcome-note">
          生成された文章はご自身で確認・編集できます。<br>
          投稿は任意です。
        </p>
      </div>
    `;
    document.getElementById('btn-start').addEventListener('click', () => nextStep());
  }

  // ======================================================
  // アンケートステップ描画（共通）
  // ======================================================
  function renderSurveyStep(app, step, stepNum) {
    const isLastStep = stepNum === TOTAL_SURVEY_STEPS;
    const html = step.qs.map(qKey => renderQuestion(qKey)).join('');
    app.innerHTML = `
      <div class="screen screen--survey">
        <div class="questions-container">${html}</div>
        <div class="nav-row">
          <button class="btn btn--ghost" id="btn-back">← 戻る</button>
          <button class="btn btn--primary" id="btn-next">
            ${isLastStep ? '口コミを作成する' : '次へ →'}
          </button>
        </div>
      </div>
    `;
    setupQuestionHandlers();
    document.getElementById('btn-next').addEventListener('click', () => {
      if (validateStep(step.qs)) {
        if (isLastStep) generateAndShowResult();
        else nextStep();
      }
    });
    document.getElementById('btn-back').addEventListener('click', () => prevStep());
  }

  // ======================================================
  // 任意入力ステップ
  // ======================================================
  function renderOptionalStep(app, stepNum) {
    const areaQ = renderQuestion('qArea');
    app.innerHTML = `
      <div class="screen screen--survey">
        <div class="questions-container">
          ${areaQ}
          <div class="question-block">
            <p class="question-label">一番印象に残ったことを一言だけ（任意）</p>
            <p class="question-hint">任意・10〜50文字ほどで入力できます</p>
            <textarea
              id="q-freetext"
              class="free-textarea"
              placeholder="例：声がけが丁寧でした、雰囲気がよかったです"
              rows="3"
              maxlength="60"
            >${escapeHtml(state.answers.freeText || '')}</textarea>
            <p class="char-count" id="free-char-count">${(state.answers.freeText || '').length} / 60</p>
          </div>
        </div>
        <div class="nav-row">
          <button class="btn btn--ghost" id="btn-back">← 戻る</button>
          <button class="btn btn--primary" id="btn-generate">口コミを作成する</button>
        </div>
      </div>
    `;
    setupQuestionHandlers();

    const textarea   = document.getElementById('q-freetext');
    const charCount  = document.getElementById('free-char-count');
    textarea.addEventListener('input', () => {
      state.answers.freeText = textarea.value;
      charCount.textContent  = textarea.value.length + ' / 60';
    });

    document.getElementById('btn-generate').addEventListener('click', () => generateAndShowResult());
    document.getElementById('btn-back').addEventListener('click', () => prevStep());
  }

  // ======================================================
  // 質問1問分のHTML生成
  // ======================================================
  function renderQuestion(qKey) {
    const q = QUESTIONS[qKey];
    if (!q) return '';
    const currentVal = state.answers[q.key];

    const opts = q.options.map(opt => {
      const isSelected = q.multi
        ? (Array.isArray(currentVal) && currentVal.includes(opt.value))
        : currentVal === opt.value;
      return `
        <button
          type="button"
          class="option-card${isSelected ? ' option-card--selected' : ''}"
          data-q="${qKey}"
          data-value="${opt.value}"
          aria-pressed="${isSelected}"
          aria-label="${opt.label}"
        >
          ${escapeHtml(opt.label)}
        </button>
      `;
    }).join('');

    return `
      <div class="question-block" id="qblock-${qKey}">
        <p class="question-label">${escapeHtml(q.label)}</p>
        ${q.hint ? `<p class="question-hint">${escapeHtml(q.hint)}</p>` : ''}
        <div class="options-grid">${opts}</div>
        ${q.allowSkip ? `<button class="btn btn--text" data-skip="${qKey}">スキップ</button>` : ''}
        <p class="error-msg" id="err-${qKey}" style="display:none;">選択してください</p>
      </div>
    `;
  }

  // ======================================================
  // 選択イベント設定
  // ======================================================
  function setupQuestionHandlers() {
    document.querySelectorAll('.option-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const qKey = btn.dataset.q;
        const val  = btn.dataset.value;
        const q    = QUESTIONS[qKey];
        if (!q) return;

        if (q.multi) {
          if (!Array.isArray(state.answers[q.key])) state.answers[q.key] = [];
          const idx = state.answers[q.key].indexOf(val);
          if (idx >= 0) {
            state.answers[q.key].splice(idx, 1);
          } else {
            state.answers[q.key].push(val);
          }
        } else {
          state.answers[q.key] = val;
          // 単一選択は同グループの他を非選択に
          document.querySelectorAll(`.option-card[data-q="${qKey}"]`).forEach(b => {
            b.classList.remove('option-card--selected');
            b.setAttribute('aria-pressed', 'false');
          });
        }

        btn.classList.toggle('option-card--selected', q.multi
          ? state.answers[q.key].includes(val)
          : state.answers[q.key] === val
        );
        btn.setAttribute('aria-pressed', String(btn.classList.contains('option-card--selected')));

        // エラーメッセージ消去
        const errEl = document.getElementById(`err-${qKey}`);
        if (errEl) errEl.style.display = 'none';
      });
    });

    document.querySelectorAll('[data-skip]').forEach(btn => {
      btn.addEventListener('click', () => {
        const qKey = btn.dataset.skip;
        const q    = QUESTIONS[qKey];
        if (!q) return;
        state.answers[q.key] = q.multi ? [] : null;
        document.querySelectorAll(`.option-card[data-q="${qKey}"]`).forEach(b => {
          b.classList.remove('option-card--selected');
          b.setAttribute('aria-pressed', 'false');
        });
      });
    });
  }

  // ======================================================
  // バリデーション
  // ======================================================
  function validateStep(qKeys) {
    let valid = true;
    for (const qKey of qKeys) {
      const q   = QUESTIONS[qKey];
      if (!q || !q.required) continue;
      const val = state.answers[q.key];
      const empty = q.multi ? (!Array.isArray(val) || val.length === 0) : !val;
      const errEl = document.getElementById(`err-${qKey}`);
      if (empty) {
        valid = false;
        if (errEl) { errEl.style.display = 'block'; }
        document.getElementById(`qblock-${qKey}`)?.scrollIntoView({ behavior: 'smooth' });
      }
    }
    return valid;
  }

  // ======================================================
  // ナビゲーション
  // ======================================================
  function nextStep() {
    if (state.currentStep < STEPS.length - 1) {
      state.currentStep++;
      scrollToTop();
      renderCurrentStep();
    }
  }

  function prevStep() {
    if (state.currentStep > 0) {
      state.currentStep--;
      scrollToTop();
      renderCurrentStep();
    }
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ======================================================
  // 口コミ生成
  // ======================================================
  async function generateAndShowResult() {
    state.currentStep = STEPS.findIndex(s => s.id === 'result');
    scrollToTop();
    renderGenerating();

    try {
      const result = await generateWithDuplicateCheck();
      state.generatedText      = result.text;
      state.generatedStructKey = result.structKey;
      state.regenCount         = result.regenCount;
      renderResult(document.getElementById('app'));
    } catch (err) {
      console.error('[GYM脈] 生成エラー:', err);
      renderError();
    }
  }

  async function generateWithDuplicateCheck() {
    let threshold = CONFIG.SIMILARITY_THRESHOLD;
    let regenCount = 0;

    for (let attempt = 0; attempt <= CONFIG.MAX_REGEN_ATTEMPTS; attempt++) {
      if (attempt >= CONFIG.MAX_REGEN_ATTEMPTS - 2) {
        threshold = CONFIG.SIMILARITY_FALLBACK_THRESHOLD;
      }

      const seed   = (Date.now() + attempt * 99991 + Math.random() * 1e6) | 0;
      const result = REVIEW_GENERATOR.generate(state.answers, seed);
      const dup    = await DUPLICATE_CHECKER.check(result.text, result.structKey, threshold);
      regenCount   = attempt;

      if (!dup.isDuplicate) {
        return { ...result, regenCount };
      }

      await new Promise(r => setTimeout(r, 30)); // 非同期待機
    }

    // 上限超過：最後の結果を返す（閾値最大緩和）
    const fallbackSeed = (Date.now() + 777777) | 0;
    const fallback     = REVIEW_GENERATOR.generate(state.answers, fallbackSeed);
    return { ...fallback, regenCount: CONFIG.MAX_REGEN_ATTEMPTS };
  }

  // ======================================================
  // 生成中画面
  // ======================================================
  function renderGenerating() {
    document.getElementById('app').innerHTML = `
      <div class="screen screen--generating">
        <div class="generating-spinner" aria-hidden="true"></div>
        <p class="generating-text">口コミを作成中...</p>
        <p class="generating-sub">あなたの体験だけから文章を生成しています</p>
      </div>
    `;
  }

  // ======================================================
  // 結果画面
  // ======================================================
  function renderResult(app) {
    app.innerHTML = `
      <div class="screen screen--result">
        <h2 class="result-title">口コミの下書きができました</h2>
        <p class="result-notice">
          ⚠ 内容をご自身の体験と合っているか確認してください。<br>
          自由に編集できます。
        </p>
        <div class="textarea-wrapper">
          <textarea
            id="review-text"
            class="review-textarea"
            rows="7"
            aria-label="生成された口コミ（編集可能）"
          >${escapeHtml(state.generatedText)}</textarea>
          <p class="review-char-count" id="review-char-count">${state.generatedText.length}文字</p>
        </div>

        <button class="btn btn--ghost btn--regen" id="btn-regen">
          🔄 別の文章にする
        </button>

        <div class="result-actions">
          <button class="btn btn--primary btn--copy" id="btn-copy">
            📋 口コミをコピー
          </button>
          <p class="copy-msg" id="copy-msg" style="display:none;">
            コピーしました！内容を確認してGoogle口コミ画面に貼り付けてください。
          </p>
          <a
            href="${CONFIG.GOOGLE_REVIEW_URL}"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn--google${state.hasCopied ? '' : ' btn--google--dim'}"
            id="btn-google"
            aria-label="Googleで口コミを書く（別タブで開きます）"
          >
            <span aria-hidden="true" style="font-weight:900; font-size:1.1em; letter-spacing:-.02em;">G</span>
            Googleで口コミを書く
          </a>
          <p class="google-hint">先にコピーしてから開くとスムーズです</p>
        </div>

        <button class="btn btn--text btn--restart" id="btn-restart">最初からやり直す</button>
      </div>
    `;

    // テキストエリア文字数
    const textarea    = document.getElementById('review-text');
    const charCount   = document.getElementById('review-char-count');
    textarea.addEventListener('input', () => {
      state.generatedText = textarea.value;
      charCount.textContent = textarea.value.length + '文字';
    });

    // 再生成ボタン
    document.getElementById('btn-regen').addEventListener('click', async () => {
      const regenBtn = document.getElementById('btn-regen');
      regenBtn.disabled = true;
      regenBtn.textContent = '🔄 生成中...';
      try {
        const result = await generateWithDuplicateCheck();
        state.generatedText      = result.text;
        state.generatedStructKey = result.structKey;
        textarea.value           = result.text;
        charCount.textContent    = result.text.length + '文字';
      } catch (err) {
        console.error('[GYM脈] 再生成エラー:', err);
      } finally {
        regenBtn.disabled    = false;
        regenBtn.textContent = '🔄 別の文章にする';
      }
    });

    // コピーボタン
    document.getElementById('btn-copy').addEventListener('click', async () => {
      const textToCopy = document.getElementById('review-text').value;
      try {
        await navigator.clipboard.writeText(textToCopy);
      } catch (_) {
        // フォールバック
        const ta = document.createElement('textarea');
        ta.value = textToCopy;
        ta.style.position = 'fixed';
        ta.style.opacity  = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }

      const copyMsg = document.getElementById('copy-msg');
      const googleBtn = document.getElementById('btn-google');
      copyMsg.style.display = 'block';
      googleBtn.classList.remove('btn--google--dim');
      state.hasCopied = true;

      // Firestoreへ保存（コピー時のみ）
      try {
        const record = await DUPLICATE_CHECKER.register(
          state.generatedText,
          state.generatedStructKey
        );
        const saved = await FIREBASE_SERVICE.saveHash(DUPLICATE_CHECKER.toFirestoreDoc(record));
        if (saved) FIREBASE_SERVICE.addToSessionCache(DUPLICATE_CHECKER.toFirestoreDoc(record));
      } catch (err) {
        console.warn('[GYM脈] ハッシュ保存エラー（重複防止継続）:', err);
      }
    });

    // 最初からやり直す
    document.getElementById('btn-restart').addEventListener('click', () => {
      state = {
        currentStep: 0,
        answers: {
          purposes:[], prevSituation:[], services:[],
          howItWas:[], afterFeel:[],
        },
        generatedText: '', generatedStructKey: '',
        isGenerating: false, regenCount: 0, hasCopied: false,
      };
      scrollToTop();
      renderCurrentStep();
    });
  }

  // ======================================================
  // エラー画面
  // ======================================================
  function renderError() {
    document.getElementById('app').innerHTML = `
      <div class="screen screen--error">
        <p class="error-icon">😢</p>
        <p class="error-title">口コミの生成に失敗しました</p>
        <p class="error-body">恐れ入りますが、もう一度お試しください。</p>
        <button class="btn btn--primary" id="btn-retry">もう一度試す</button>
      </div>
    `;
    document.getElementById('btn-retry').addEventListener('click', () => {
      state.currentStep = STEPS.findIndex(s => s.id === 'step3');
      renderCurrentStep();
    });
  }

  // ======================================================
  // ユーティリティ
  // ======================================================
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ======================================================
  // 公開
  // ======================================================
  return { init };

})();

// DOMContentLoaded後に起動
document.addEventListener('DOMContentLoaded', () => APP.init());
