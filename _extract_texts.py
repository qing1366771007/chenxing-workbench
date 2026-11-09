# -*- coding: utf-8 -*-
"""从 index.html 提取所有会被朗读的文本，统计规模"""
import re, json, os

WD = r'E:\青的数据\青的obsidian\辰星工作台'
s = open(os.path.join(WD, 'server', 'index.html'), encoding='utf-8').read()


def block(src, start_kw, open_ch='[', close_ch=']'):
    """从 start_kw 起找到配对的括号块，返回块内文本"""
    i = src.find(start_kw)
    if i < 0:
        return ''
    j = src.find(open_ch, i)
    if j < 0:
        return ''
    depth = 0
    k = j
    in_str = None
    while k < len(src):
        c = src[k]
        if in_str:
            if c == '\\':
                k += 2
                continue
            if c == in_str:
                in_str = None
        else:
            if c in '"\'`':
                in_str = c
            elif c == open_ch:
                depth += 1
            elif c == close_ch:
                depth -= 1
                if depth == 0:
                    return src[j:k + 1]
        k += 1
    return ''


# 1) 洪恩 1300 字
hg = block(s, 'var HONGEN_GROUPS')
groups = re.findall(r'"([^"]{2,40})"', hg)
chars = []
for g in groups:
    chars.extend(list(g))
print('洪恩组数', len(groups), '字数', len(chars), '去重', len(set(chars)))

# 2) 古诗
po = block(s, 'const poemsData')
titles = re.findall(r"title:\s*'([^']+)'", po)
lines_all = []
for m in re.finditer(r"lines:\s*\[([^\]]*)\]", po):
    lines_all.extend(re.findall(r"'([^']+)'", m.group(1)))
print('古诗', len(titles), '行数', len(lines_all), '去重', len(set(lines_all)))

# 3) 英语句子
en = block(s, 'const engSentenceData', '{', '}')
en_ens = re.findall(r"en:\s*'([^']+)'", en)
en_zhs = re.findall(r"zh:\s*'([^']+)'", en)
print('英语', len(en_ens), len(en_zhs), '去重', len(set(en_ens)), len(set(en_zhs)))

res = {
    'zh': sorted(set(chars) | set(titles) | set(lines_all) | set(en_zhs)),
    'en': sorted(set(en_ens)),
}
print('中文去重总数', len(res['zh']), '英文', len(res['en']))
print('示例', res['zh'][:5], res['en'][:5])
json.dump(res, open(os.path.join(WD, '_audio_texts.json'), 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)
print('saved _audio_texts.json')
