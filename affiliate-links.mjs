// 成果報酬リンクの接続ポイント。必ず本人名義の承認済みURLを公式画面から取得する。
// 楽天アフィリエイトのサイト登録とリンク発行が済むまで有効化しない。
// 提携URLの自動生成や、未承認の売上を偽る処理は行わない。
export const AFFILIATE = Object.freeze({
  confirmed: false,
  provider: "",
  siteUrl: "https://hakopita-m84e27.deed.page/",
  boxBySize: Object.freeze({}),
  boxGeneral: "",
  cushion: "",
});
export function allowedTrackingUrl(url) {
  if (typeof url !== "string" || !url.trim()) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || u.username || u.password) return false;
    return ["hb.afl.rakuten.co.jp", "a.r10.to", "r10.to", "af.moshimo.com", "px.a8.net"]
      .includes(u.hostname);
  } catch { return false; }
}
export function chooseAffiliateLink(config, type, size) {
  if (!config || config.confirmed !== true) return null;
  let href = null;
  if (type === "box") {
    href = config.boxBySize?.[String(size)] || config.boxGeneral;
  } else if (type === "cushion") {
    href = config.cushion;
  }
  return allowedTrackingUrl(href) ? href : null;
}
