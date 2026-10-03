// ========================================================
// GYM脈 重複防止エンジン
// 完全一致・正規化一致・Jaccard類似度による多段階チェック
// ========================================================

const DUPLICATE_CHECKER = (() => {

  // ======================================================
  // テキスト正規化
  // ======================================================
  function normalizeText(text) {
    return text
      .replace(/\s+/g, '')           // 空白除去
      .replace(/[、。！？\n]/g, '')    // 句読点・改行除去
      .replace(/ー/g, 'ア')           // 長音簡略化（カタカナ統一の近似）
      .toLowerCase();
  }

  // ======================================================
  // SHA-256ハッシュ（Web Crypto API）
  // ======================================================
  async function sha256(text) {
    const encoder = new TextEncoder();
    const data    = encoder.encode(text);
    const buffer  = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // ======================================================
  // 文字3-gram抽出
  // ======================================================
  function extractTrigrams(text) {
    const norm = normalizeText(text);
    const set  = new Set();
    for (let i = 0; i <= norm.length - 3; i++) {
      set.add(norm.substring(i, i + 3));
    }
    return set;
  }

  // ======================================================
  // Jaccard類似度
  // ======================================================
  function jaccardSimilarity(setA, setB) {
    if (setA.size === 0 && setB.size === 0) return 1;
    const intersection = [...setA].filter(x => setB.has(x)).length;
    const union        = new Set([...setA, ...setB]).size;
    return intersection / union;
  }

  // ======================================================
  // トリグラム署名（ハッシュ化済み文字列）
  // セット比較用にソートして結合
  // ======================================================
  function trigramSignature(trigrams) {
    return [...trigrams].sort().join('|');
  }

  // ======================================================
  // ローカルキャッシュ（セッション中の高速比較用）
  // ======================================================
  const localCache = {
    records: [],    // { hashFull, hashNorm, trigrams, structKey }
    lastUpdated: 0,
  };

  function addToLocalCache(record) {
    localCache.records.push(record);
  }

  function isLocalCacheStale() {
    return Date.now() - localCache.lastUpdated > CONFIG.CACHE_TTL_MS;
  }

  function setLocalCacheUpdated() {
    localCache.lastUpdated = Date.now();
  }

  // ======================================================
  // メインチェック関数
  // ======================================================
  async function check(text, structKey, threshold) {
    const hashFull   = await sha256(text);
    const hashNorm   = await sha256(normalizeText(text));
    const trigrams   = extractTrigrams(text);

    // Level 1: 完全一致ハッシュ
    if (localCache.records.some(r => r.hashFull === hashFull)) {
      return { isDuplicate: true, level: 1, reason: '完全一致' };
    }

    // Level 2: 正規化後一致ハッシュ
    if (localCache.records.some(r => r.hashNorm === hashNorm)) {
      return { isDuplicate: true, level: 2, reason: '正規化一致' };
    }

    // Level 3: Jaccard類似度
    for (const r of localCache.records) {
      const sim = jaccardSimilarity(trigrams, r.trigrams);
      if (sim >= threshold) {
        return { isDuplicate: true, level: 3, reason: `類似度 ${(sim * 100).toFixed(1)}%` };
      }
    }

    // Level 4: 構造キー過多チェック
    const structCount = localCache.records.filter(r => r.structKey === structKey).length;
    if (structCount >= CONFIG.STRUCT_KEY_MAX_USES) {
      return { isDuplicate: true, level: 4, reason: '同一構造使用上限' };
    }

    return { isDuplicate: false };
  }

  // ======================================================
  // 口コミを重複DBに登録（コピーボタン押下時のみ呼ぶ）
  // ======================================================
  async function register(text, structKey) {
    const hashFull = await sha256(text);
    const hashNorm = await sha256(normalizeText(text));
    const trigrams = extractTrigrams(text);

    const record = {
      hashFull,
      hashNorm,
      trigrams,
      trigramSig: trigramSignature(trigrams),
      structKey,
      createdAt: Date.now(),
    };

    addToLocalCache(record);
    return record;
  }

  // ======================================================
  // Firebase用に変換（trigrams Set → 保存可能な形式）
  // ======================================================
  function toFirestoreDoc(record) {
    return {
      hashFull:    record.hashFull,
      hashNorm:    record.hashNorm,
      trigramSig:  record.trigramSig,
      structKey:   record.structKey,
      createdAt:   record.createdAt,
    };
  }

  // ======================================================
  // Firestoreドキュメントからローカルキャッシュ用に復元
  // ======================================================
  function fromFirestoreDoc(doc) {
    // trigramSigからSetを復元
    const trigramArr = doc.trigramSig ? doc.trigramSig.split('|') : [];
    return {
      hashFull:  doc.hashFull,
      hashNorm:  doc.hashNorm,
      trigrams:  new Set(trigramArr),
      structKey: doc.structKey,
      createdAt: doc.createdAt,
    };
  }

  // ======================================================
  // 外部からキャッシュをロードする
  // ======================================================
  function loadCache(firestoreDocs) {
    localCache.records = firestoreDocs.map(fromFirestoreDoc);
    setLocalCacheUpdated();
  }

  // ======================================================
  // テスト用：キャッシュをリセット
  // ======================================================
  function resetCache() {
    localCache.records  = [];
    localCache.lastUpdated = 0;
  }

  // ======================================================
  // テスト用：ローカルキャッシュのみで1000件テスト
  // ======================================================
  async function runBulkTest(generateFn, answersArr, onProgress) {
    resetCache();
    const results = {
      total:          0,
      exactDuplicates: 0,
      normDuplicates:  0,
      similarDuplicates: 0,
      structDuplicates:  0,
      unique:          0,
      regenCounts:     [],
    };

    for (let i = 0; i < answersArr.length; i++) {
      const answers = answersArr[i];
      let accepted = null;
      let regenCount = 0;
      let threshold = CONFIG.SIMILARITY_THRESHOLD;

      for (let attempt = 0; attempt <= CONFIG.MAX_REGEN_ATTEMPTS; attempt++) {
        if (attempt >= CONFIG.MAX_REGEN_ATTEMPTS - 2) {
          threshold = CONFIG.SIMILARITY_FALLBACK_THRESHOLD;
        }
        const seed   = (i * 999983 + attempt * 12345) ^ 0xDEADBEEF;
        const result = generateFn(answers, seed);
        const dup    = await check(result.text, result.structKey, threshold);
        regenCount   = attempt;

        if (!dup.isDuplicate) {
          accepted = result;
          break;
        }

        if (dup.level === 1) results.exactDuplicates++;
        else if (dup.level === 2) results.normDuplicates++;
        else if (dup.level === 3) results.similarDuplicates++;
        else results.structDuplicates++;
      }

      if (accepted) {
        results.unique++;
        const record = await register(accepted.text, accepted.structKey);
        // trigramSigをテスト用に追加
      }

      results.total++;
      results.regenCounts.push(regenCount);
      if (onProgress && i % 100 === 0) onProgress(i, results);
    }

    results.avgRegenAttempts = results.regenCounts.reduce((a, b) => a + b, 0) / results.regenCounts.length;
    return results;
  }

  // ======================================================
  // 公開インターフェース
  // ======================================================
  return {
    check,
    register,
    toFirestoreDoc,
    fromFirestoreDoc,
    loadCache,
    resetCache,
    isLocalCacheStale,
    runBulkTest,
    extractTrigrams,
    jaccardSimilarity,
    normalizeText,
  };

})();
