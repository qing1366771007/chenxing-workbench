# -*- coding: utf-8 -*-
"""辰星工作台：英语句子新增「句子·生活用语」分类（开关灯/门窗/电器等）"""

BLOCK = """'句子·生活用语': [
  { en: 'Turn on the light.', zh: '开灯。', emoji: '💡' },
  { en: 'Turn off the light.', zh: '关灯。', emoji: '🌙' },
  { en: 'Open the window.', zh: '开窗。', emoji: '🌤️' },
  { en: 'Close the window.', zh: '关窗。', emoji: '🌧️' },
  { en: 'Open the door.', zh: '开门。', emoji: '🚪' },
  { en: 'Close the door.', zh: '关门。', emoji: '🚪' },
  { en: 'Lock the door.', zh: '把门锁上。', emoji: '🔐' },
  { en: 'Turn on the fan.', zh: '开风扇。', emoji: '🌀' },
  { en: 'Turn off the fan.', zh: '关风扇。', emoji: '🛑' },
  { en: 'Turn on the TV.', zh: '开电视。', emoji: '📺' },
  { en: 'Turn off the TV.', zh: '关电视。', emoji: '📴' },
  { en: 'Turn on the air conditioner.', zh: '开空调。', emoji: '❄️' },
  { en: 'Turn off the air conditioner.', zh: '关空调。', emoji: '🌡️' },
  { en: 'Turn on the tap.', zh: '打开水龙头。', emoji: '🚰' },
  { en: 'Turn off the tap.', zh: '关水龙头。', emoji: '💧' },
  { en: 'Flush the toilet.', zh: '冲一下厕所。', emoji: '🚽' },
  { en: 'Draw the curtains.', zh: '拉开窗帘。', emoji: '🌅' },
  { en: 'Please turn it up.', zh: '声音大一点。', emoji: '🔊' },
  { en: 'Please turn it down.', zh: '声音小一点。', emoji: '🔉' },
],
"""

ANCHOR = "'句子·学校生活': ["

for fp, tag in [(r"E:\青的数据\青的obsidian\辰星工作台\server\index.html", "server"),
                (r"E:\青的数据\青的obsidian\辰星工作台\辰星工作台.html", "share")]:
    s = open(fp, "rb").read().decode("utf-8")
    if "句子·生活用语" in s:
        print("[skip] %s 已存在" % tag)
        continue
    n = s.count(ANCHOR)
    assert n >= 1, "%s 锚点没找到" % tag
    # 按缩进对齐：锚点若在行首（无缩进）就直接拼
    s2 = s.replace(ANCHOR, BLOCK + ANCHOR)
    open(fp, "wb").write(s2.replace("\r\n", "\n").encode("utf-8"))
    print("[ok] %s 插入 %d 处，字节 %d -> %d" % (tag, n, len(s.encode('utf-8')), len(s2.encode('utf-8'))))
