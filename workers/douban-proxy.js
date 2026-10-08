/**
 * 豆瓣图书搜索代理（Cloudflare Worker）
 *
 * 背景：豆瓣没有公开的图书搜索 API，且其网页接口禁止浏览器跨域调用。
 * 这个 Worker 部署在 Cloudflare 边缘网络上：接收本项目的搜索请求 →
 * 代为请求豆瓣移动端的搜索接口 → 过滤出图书结果并整理成简洁的 JSON 返回。
 *
 * 部署步骤（免费，无需绑定付费方式）：
 *   1. 打开 https://dash.cloudflare.com → 注册/登录
 *   2. 左侧 Workers and Pages → Create Worker → Deploy（先建一个空 Worker）
 *   3. 进入该 Worker → Edit code → 把本文件全部内容粘贴进去 → Deploy
 *   4. 复制分配的网址（形如 https://xxx.你的子域.workers.dev）
 *   5. 把网址填入 src/pages/AddBookPage.tsx 顶部的 DOUBAN_PROXY_URL，重新部署本项目
 *
 * 调用方式：GET https://你的worker地址/?q=三体
 * 返回：{ source: 'douban', total: n, books: [{ id, title, authors, publisher,
 *         publishedDate, coverUrl, rating, abstract, url }] }
 *
 * 注意：豆瓣未开放此接口，属于灰色用法，随时可能失效；请勿用于商业用途或高频调用。
 */

const DOUBAN_SEARCH = 'https://m.douban.com/rexxar/api/v2/search'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS },
  })
}

// 豆瓣书籍的 card_subtitle 形如 "刘慈欣 / 2008 / 重庆出版社"（顺序不固定），
// 从中拆出作者 / 年份 / 出版社。
function parseCardSubtitle(s) {
  const parts = String(s || '')
    .split('/')
    .map((x) => x.trim())
    .filter(Boolean)
  const yearRe = /^(19|20)\d{2}(-\d{1,2})?$/
  const yearIdx = parts.findIndex((p, i) => i > 0 && yearRe.test(p))
  return {
    authors: parts.length > 0 ? parts[0].split(/\s+/).filter(Boolean) : [],
    year: yearIdx > 0 ? parts[yearIdx] : undefined,
    publisher:
      yearIdx > 0 && parts.length > 2
        ? parts[parts.length - 1]
        : parts.length > 1 && yearIdx !== 1
          ? parts[1]
          : undefined,
  }
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    const url = new URL(request.url)
    const q = (url.searchParams.get('q') || '').trim()
    if (!q) return json({ error: '缺少参数 q' }, 400)
    if (q.length > 60) return json({ error: '关键词过长' }, 400)

    const upstream = new URL(DOUBAN_SEARCH)
    upstream.searchParams.set('type', 'book')
    upstream.searchParams.set('q', q)
    upstream.searchParams.set('start', '0')
    upstream.searchParams.set('count', '12')

    let data
    try {
      const res = await fetch(upstream.toString(), {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
          Referer: 'https://m.douban.com/search/',
          Accept: 'application/json',
        },
      })
      if (!res.ok) return json({ error: `upstream HTTP ${res.status}` }, 502)
      data = await res.json()
    } catch (e) {
      return json({ error: 'upstream fetch failed' }, 502)
    }

    if (data.banned) return json({ error: '被豆瓣限流，请稍后再试' }, 429)

    const items = (data.subjects?.items ?? []).filter((i) => i.target_type === 'book')
    const books = items.map(({ target: t }) => {
      const { authors, year, publisher } = parseCardSubtitle(t.card_subtitle)
      return {
        id: `douban:${t.id}`,
        title: t.title,
        authors,
        publisher,
        publishedDate: year,
        coverUrl: t.cover_url,
        rating: t.rating?.value,
        abstract: t.abstract,
        url: `https://book.douban.com/subject/${t.id}/`,
      }
    })

    return json({ source: 'douban', total: books.length, books })
  },
}
