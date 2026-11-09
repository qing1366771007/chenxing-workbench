# -*- coding: utf-8 -*-
"""给英语句子模块新增分类「句子·生活动作」（洗手/刷牙/穿衣等 17 句）"""
import os, shutil, time

BASE = r"E:\青的数据\青的obsidian\辰星工作台"

ANCHOR = "'句子·学校生活': ["

NEW = """'句子·生活动作': [
  { en: 'Go wash your hands.', zh: '去洗手。', emoji: '🧼' },
  { en: 'Put some soap on.', zh: '抹点肥皂。', emoji: '🧴' },
  { en: 'Rub your hands.', zh: '搓搓手。', emoji: '🤲' },
  { en: 'Rinse your hands.', zh: '冲干净手。', emoji: '🚿' },
  { en: 'Dry your hands.', zh: '擦干手。', emoji: '🧻' },
  { en: 'Time to brush your teeth.', zh: '该刷牙了。', emoji: '🪥' },
  { en: 'Rinse your mouth.', zh: '漱漱口。', emoji: '💧' },
  { en: 'Spit it out.', zh: '吐出来。', emoji: '🫧' },
  { en: "Let's wash your face.", zh: '我们洗洗脸。', emoji: '🧖' },
  { en: 'Comb your hair.', zh: '梳梳头。', emoji: '💈' },
  { en: 'Put on your clothes.', zh: '穿衣服。', emoji: '👕' },
  { en: 'Take off your clothes.', zh: '脱衣服。', emoji: '👖' },
  { en: 'Put on your socks.', zh: '穿袜子。', emoji: '🧦' },
  { en: 'Tie your shoes.', zh: '系鞋带。', emoji: '👟' },
  { en: 'Zip up your jacket.', zh: '拉上外套拉链。', emoji: '🧥' },
  { en: 'Put on your hat.', zh: '戴上帽子。', emoji: '🧢' },
  { en: 'Put away your toys.', zh: '收拾玩具。', emoji: '🧸' },
],
"""

ts = time.strftime("%Y%m%d_%H%M")

for fn in ["server/index.html", "index.html", "辰星工作台.html"]:
    fp = os.path.join(BASE, fn)
    raw = open(fp, "rb").read()
    s = raw.decode("utf-8")
    if "'句子·生活动作': [" in s:
        print("%-22s 已存在，跳过" % fn)
        continue
    n = s.count(ANCHOR)
    if n == 0:
        print("%-22s !! 找不到锚点" % fn)
        continue
    shutil.copyfile(fp, fp + ".bak_" + ts + "_lifeact")
    s = s.replace(ANCHOR, NEW + ANCHOR)
    open(fp, "wb").write(s.replace("\r\n", "\n").encode("utf-8"))
    print("%-22s 插入 %d 处，新字节 %d" % (fn, n, len(s.encode("utf-8"))))
