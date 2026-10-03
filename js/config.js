// ========================================================
// GYM脈 口コミ作成サポートツール - 設定ファイル
// ここの値を変更するだけで動作変更できます
// ========================================================

const CONFIG = {
  // --- 店舗情報 ---
  GYM_NAME: 'セミパーソナルジム GYM脈',
  APP_TITLE: 'GYM脈 口コミ作成サポート',

  // --- Google口コミ投稿URL ---
  // Google ビジネスプロフィール管理画面から取得したURL
  GOOGLE_REVIEW_URL: 'https://g.page/r/CZrebzZGh-TgEAE/review',

  // --- アプリ公開URL（QRコード生成に使用）---
  // GitHub Pages等で公開後に更新してください
  APP_URL: 'https://youyiz830-hub.github.io/gym-review/',

  // --- 重複防止設定 ---
  SIMILARITY_THRESHOLD: 0.40,          // Jaccard類似度閾値（これ以上で類似判定）
  SIMILARITY_FALLBACK_THRESHOLD: 0.30, // 再生成上限後の緩和閾値
  MAX_REGEN_ATTEMPTS: 10,              // 最大再生成試行回数
  STRUCT_KEY_MAX_USES: 5,              // 同一構造IDの最大使用回数

  // --- キャッシュ設定 ---
  CACHE_TTL_MS: 60 * 60 * 1000,       // 重複DBキャッシュ有効期限 (1時間)

  // --- Firebase設定 ---
  // Firebase Console > プロジェクト設定 > アプリ から取得してください
  // 未設定の場合はローカルキャッシュのみで動作します（クロスデバイス重複防止なし）
  FIREBASE: {
    apiKey: 'REPLACE_WITH_YOUR_API_KEY',
    authDomain: 'REPLACE_WITH_YOUR_AUTH_DOMAIN',
    projectId: 'REPLACE_WITH_YOUR_PROJECT_ID',
    storageBucket: 'REPLACE_WITH_YOUR_STORAGE_BUCKET',
    messagingSenderId: 'REPLACE_WITH_YOUR_MESSAGING_SENDER_ID',
    appId: 'REPLACE_WITH_YOUR_APP_ID',
  },

  // Firebase未設定かどうかを判定
  get isFirebaseConfigured() {
    return this.FIREBASE.apiKey !== 'REPLACE_WITH_YOUR_API_KEY';
  },
};
