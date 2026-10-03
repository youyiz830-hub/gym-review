// ========================================================
// GYM脈 Firebase Firestore サービス
// Firebase compat SDK（CDN読み込み版）使用
// ========================================================

const FIREBASE_SERVICE = (() => {

  let db            = null;
  let isInitialized = false;
  let initFailed    = false;

  // ======================================================
  // 初期化
  // ======================================================
  async function init() {
    if (isInitialized) return true;
    if (initFailed)    return false;

    if (!CONFIG.isFirebaseConfigured) {
      console.warn('[GYM脈] Firebase未設定。ローカルのみで動作します。');
      initFailed = true;
      return false;
    }

    try {
      // Firebase compat SDK はグローバルの firebase オブジェクトを使用
      if (typeof firebase === 'undefined' || !firebase.initializeApp) {
        throw new Error('Firebase SDK が読み込まれていません');
      }

      // 初期化済みでなければ初期化
      if (firebase.apps.length === 0) {
        firebase.initializeApp(CONFIG.FIREBASE);
      }
      db = firebase.firestore();
      isInitialized = true;
      console.log('[GYM脈] Firebase 接続OK');
      return true;
    } catch (err) {
      console.error('[GYM脈] Firebase初期化失敗:', err.message);
      initFailed = true;
      return false;
    }
  }

  // ======================================================
  // Firestoreから全ハッシュ取得
  // ======================================================
  async function fetchAllHashes() {
    if (!isInitialized) {
      const ok = await init();
      if (!ok) return null;
    }
    try {
      const snap = await db.collection('review_hashes').get();
      const docs = [];
      snap.forEach(doc => docs.push(doc.data()));
      return docs;
    } catch (err) {
      console.error('[GYM脈] Firestore取得エラー:', err.message);
      return null;
    }
  }

  // ======================================================
  // ハッシュ保存（コピーボタン押下時）
  // ======================================================
  async function saveHash(docData) {
    if (!isInitialized) {
      const ok = await init();
      if (!ok) return false;
    }
    try {
      await db.collection('review_hashes').add({
        ...docData,
        serverTs: firebase.firestore.FieldValue.serverTimestamp(),
      });
      return true;
    } catch (err) {
      console.error('[GYM脈] Firestore保存エラー:', err.message);
      return false;
    }
  }

  // ======================================================
  // セッション開始時にキャッシュを同期
  // ======================================================
  async function syncCache() {
    // sessionStorage キャッシュ確認
    try {
      const raw      = sessionStorage.getItem('gym_review_cache');
      const cachedAt = parseInt(sessionStorage.getItem('gym_review_cache_at') || '0', 10);
      if (raw && (Date.now() - cachedAt < CONFIG.CACHE_TTL_MS)) {
        DUPLICATE_CHECKER.loadCache(JSON.parse(raw));
        console.log(`[GYM脈] sessionStorage キャッシュ読込: ${JSON.parse(raw).length}件`);
        return;
      }
    } catch (_) {}

    // Firestore から取得
    const docs = await fetchAllHashes();
    if (docs !== null) {
      DUPLICATE_CHECKER.loadCache(docs);
      try {
        sessionStorage.setItem('gym_review_cache',    JSON.stringify(docs));
        sessionStorage.setItem('gym_review_cache_at', String(Date.now()));
      } catch (_) {}
      console.log(`[GYM脈] Firestore キャッシュ読込: ${docs.length}件`);
    } else {
      console.warn('[GYM脈] Firestore取得失敗。ローカルキャッシュのみで重複チェックします。');
    }
  }

  // ======================================================
  // コピー後にsessionStorageキャッシュへ追記
  // ======================================================
  function addToSessionCache(docData) {
    try {
      const raw  = sessionStorage.getItem('gym_review_cache');
      const docs = raw ? JSON.parse(raw) : [];
      docs.push(docData);
      sessionStorage.setItem('gym_review_cache', JSON.stringify(docs));
    } catch (_) {}
  }

  // ======================================================
  // 公開インターフェース
  // ======================================================
  return {
    init,
    syncCache,
    fetchAllHashes,
    saveHash,
    addToSessionCache,
    get isReady()  { return isInitialized; },
    get isFailed() { return initFailed; },
  };

})();
