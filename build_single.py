#!/usr/bin/env python3
# 把 data.js + app.js 内联进 index.html，生成可离线/微信直发的单文件版
import io

base = "/workspace"
html = open(f"{base}/index.html", encoding="utf-8").read()
data = open(f"{base}/data.js", encoding="utf-8").read()
app = open(f"{base}/app.js", encoding="utf-8").read()

html = html.replace('<script src="data.js"></script>', '<script>\n' + data + '\n</script>')
html = html.replace('<script src="app.js"></script>', '<script>\n' + app + '\n</script>')

out = f"{base}/星露奖杯农场-单文件版.html"
with open(out, "w", encoding="utf-8") as f:
    f.write(html)
print("written:", out, len(html), "bytes")
