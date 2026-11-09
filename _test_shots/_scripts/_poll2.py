# -*- coding: utf-8 -*-
import urllib.request, gzip, time
LOCAL = open(r"E:\青的数据\青的obsidian\辰星工作台\server\index.html", "rb").read()
print("本地字节数:", len(LOCAL), flush=True)
KEY = "Turn on the light."
for i in range(1, 26):
    try:
        req = urllib.request.Request("https://chenxing-workbench.onrender.com/?t=%d" % int(time.time()),
                                     headers={"User-Agent": "Mozilla/5.0", "Accept-Encoding": "gzip",
                                              "Cache-Control": "no-cache"})
        r = urllib.request.urlopen(req, timeout=45)
        raw = r.read()
        enc = (r.headers.get("Content-Encoding") or "").lower()
        body = gzip.decompress(raw) if (enc == "gzip" or raw[:2] == b"\x1f\x8b") else raw
        t = body.decode("utf-8", "ignore")
        info = {"round": i, "status": r.status, "bytes": len(body),
                "has_life_sent_cat": "句子·生活用语" in t,
                "has_key_sentence": KEY in t,
                "turns": t.count("turn on the light"),
                "same_as_local": len(body) == len(LOCAL)}
        print(info, flush=True)
        if info["has_life_sent_cat"] and info["same_as_local"]:
            print("=== 线上已生效 ===", flush=True)
            break
    except Exception as e:
        print("round", i, "ERR", repr(e), flush=True)
    time.sleep(10)
