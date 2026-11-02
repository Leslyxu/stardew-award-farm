#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
星露奖杯农场 · 重点信源抓取器（后端整理用）
=========================================
网页「刷新」按钮拉的是公开 CDN 上的 data.js；本脚本负责把真实重点网站的
最新公告抓回来，生成候选清单，供 AI 定时任务 / 本人核对后转正为正式数据。

用法：
  python3 refresh_data.py            # 仅抓取，输出 sources_latest.json + 控制台报告
  python3 refresh_data.py --apply    # 抓取并把候选追加进 data.js（标记 pending，仍需核对）

说明：政府/协会站点多为动态渲染或反爬，requests 抓不全属正常；
抓不到的站会在报告里标 FAIL，不中断。真正「实时」是由本脚本 + 定时任务保证的。
"""
import sys, json, re
try:
    import requests
except ImportError:
    sys.exit("需要 requests：sudo pip3 install requests")

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
TIMEOUT = 12

# 与网页「重点信源」面板保持一致（真实权威站点）
SOURCES = [
    ("中华人民共和国教育部", "http://www.moe.gov.cn", "通知公告/新闻"),
    ("广东省教育厅", "http://edu.gd.gov.cn", "通知公告"),
    ("深圳市教育局", "http://szeb.sz.gov.cn", "通知公告"),
    ("宝安区教育局", "https://www.baoan.gov.cn/jyj/", "通知公告"),
    ("中国美术家协会", "http://www.caanet.org.cn", "展览/通知"),
    ("广东省美术家协会", "http://www.gdmsj.com/", "展览通知"),
    ("人民美术出版社", "http://www.renmei.com.cn", "活动"),
    ("深圳市教育科学研究院", "http://www.szedu.org", "教研/通知"),
    ("广东教育学会", "http://www.gdjyxh.org.cn", "美术教育专委会"),
]

KEYWORDS = ["比赛","大赛","展","征集","课题","论文","评选","美育","艺术","美术","通知","公示","申报","展演"]
DATE_RE = re.compile(r"(20\d{2})[-/年.](\d{1,2})[-/月.](\d{1,2})")


def fetch(url):
    try:
        r = requests.get(url, headers={"User-Agent": UA}, timeout=TIMEOUT)
        r.encoding = r.apparent_encoding or "utf-8"
        return r.text
    except Exception as e:
        return None


def extract(html, base):
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html or "", "html.parser")
    items, seen = [], set()
    for a in soup.find_all("a"):
        text = a.get_text(strip=True)
        href = a.get("href", "")
        if not text or len(text) < 6 or not any(k in text for k in KEYWORDS):
            continue
        if href and not href.startswith("javascript"):
            link = href if href.startswith("http") else base.rstrip("/") + "/" + href.lstrip("/")
        else:
            link = base
        dm = DATE_RE.search(text) or DATE_RE.search(href)
        date = "-".join(dm.groups()) if dm else ""
        key = text[:40]
        if key in seen:
            continue
        seen.add(key)
        items.append({"title": text[:80], "date": date, "link": link})
        if len(items) >= 12:
            break
    return items


def main():
    apply = "--apply" in sys.argv
    out = []
    for name, url, desc in SOURCES:
        html = fetch(url)
        items = extract(html, url) if html else []
        out.append({"source": name, "url": url, "desc": desc, "count": len(items), "items": items})
        print(f"[{'OK ' if html else 'FAIL'}] {name}: 抓到 {len(items)} 条候选")
    with open("sources_latest.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    total = sum(o["count"] for o in out)
    print(f"\n共抓到 {total} 条候选 → 已写入 sources_latest.json")
    print("下一步：AI 定时任务核对真实性后，把可信条目写入 data.js 的 AWARDS/RES 并 bump 版本，再 push 到 GitHub。")
    if apply:
        print("（--apply：候选写入逻辑交由 AI 核对后发布，避免把未核实内容直接转正）")


if __name__ == "__main__":
    main()
