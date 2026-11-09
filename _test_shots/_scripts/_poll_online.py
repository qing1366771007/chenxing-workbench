import urllib.request, gzip, time, zlib, os, io
LOCAL = open(r"E:\青的数据\青的obsidian\辰星工作台\server\index.html","rb").read()
print("本地字节数:", len(LOCAL))
URL = "https://chenxing-workbench.onrender.com/?t=%d"
last = None
for i in range(1, 31):
    try:
        req = urllib.request.Request(URL % int(time.time()), headers={
            "User-Agent": "Mozilla/5.0", "Accept-Encoding": "gzip", "Cache-Control": "no-cache"})
        r = urllib.request.urlopen(req, timeout=45)
        raw = r.read()
        enc = (r.headers.get("Content-Encoding") or "").lower()
        body = gzip.decompress(raw) if (enc == "gzip" or raw[:2] == b"\x1f\x8b") else raw
        t = body.decode("utf-8", "ignore")
        info = {
            "round": i,
            "status": r.status,
            "bytes": len(body),
            "has_hongen_tab": "洪恩1300字" in t,
            "has_hzHgEnter": "hzHgEnter" in t,
            "has_hzHgPanel": "hzHgPanel" in t,
            "surname_pinyin_div": 'surname-pinyin">' in t,
            "groups_len": t.count("HONGEN_GROUPS"),
            "same_as_local": len(body) == len(LOCAL),
            "age_hdr": r.headers.get("Age"),
        }
        print(info, flush=True)
        last = info
        if info["has_hzHgPanel"] and not info["surname_pinyin_div"] and info["same_as_local"]:
            print("=== 线上已生效 ===")
            break
    except Exception as e:
        print("round", i, "ERR", repr(e), flush=True)
    time.sleep(12)
open(r"E:\青的数据\青的obsidian\辰星工作台\_online_check.txt","w",encoding="utf-8").write(str(last))
