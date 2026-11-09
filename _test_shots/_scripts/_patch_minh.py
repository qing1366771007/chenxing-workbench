# -*- coding: utf-8 -*-
"""英语句子卡片加最小高度，避免长短句卡片高低参差"""
import os

BASE = r"E:\青的数据\青的obsidian\辰星工作台"
OLD = """.eng-sent-card {
  position:relative; overflow:hidden;
  background:#fff; border-radius:16px; padding:14px 12px 14px 19px;"""
NEW = """.eng-sent-card {
  position:relative; overflow:hidden; min-height:96px;
  background:#fff; border-radius:16px; padding:14px 12px 14px 19px;"""

for fn in ["server/index.html", "index.html", "辰星工作台.html"]:
    fp = os.path.join(BASE, fn)
    s = open(fp, "rb").read().decode("utf-8")
    c = s.count(OLD)
    if c == 1:
        s = s.replace(OLD, NEW)
        open(fp, "wb").write(s.encode("utf-8"))
    print("%-22s 命中 %d" % (fn, c))
