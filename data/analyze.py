# -*- coding: utf-8 -*-
import json,re
from collections import Counter
corpus=json.load(open('/tmp/corpus_clean.json'))
recs=list(corpus.values())
CORE={'S2764493093','S2764417013','S52157898','S22755053'}  # SAE, VAR, iJADE, J Aesthetic Ed
core=[p for p in recs if p.get('srcid') in CORE]

def atext(p):
    inv=p.get('abstract')
    if not inv: return ''
    pos=[]
    for w,ps in inv.items():
        for x in ps: pos.append((x,w))
    pos.sort(); return ' '.join(w for _,w in pos)
for p in recs: p['_t']=((p.get('title') or '')+' '+atext(p)).lower()

def report(data,label):
    print('\n\n########',label,'N=',len(data),'########')
    print('\n--- 领域内高被引 Top 15 ---')
    for p in sorted(data,key=lambda x:x.get('cited',0) or 0,reverse=True)[:15]:
        print(f"{p.get('cited',0):4d} {p.get('year')} {(p.get('venue') or '-')[:28]:28s} {(p.get('title') or '')[:68]}")
    CONCEPTS={
     'AI/generative AI':r'\bai\b|artificial intelligence|generative|machine learning|chatgpt',
     'technology/digital':r'technolog|digital|new media',
     'assessment/evaluation':r'assess|evaluat',
     'pedagogy/teaching':r'pedagog|teach|instruction',
     'curriculum':r'curricul',
     'practice/practitioner':r'practic',
     'critical/social justice':r'critical|social justice|equit|inclus|divers',
     'identity':r'identit',
     'culture/cultural':r'cultur',
     'creativity':r'creativ',
     'student/learner':r'student|learner|children|pupil',
     'teacher/educator':r'teacher|educator',
     'research methods':r'methodolog|research method|qualitative|quantitative|ethnograph',
     'visual culture':r'visual culture',
     'posthuman/more-than-human':r'posthuman|post-human|more-than-human',
     'new materialism':r'new material|materiality',
     'affect/emotion':r'affect|emotion|feeling',
     'ecology/sustainability':r'ecolog|sustainab|environment',
     'museum/gallery':r'museum|gallery',
     'collaboration':r'collaborat',
     'reflection':r'reflect',
     'training':r'train',
     'skill':r'skill',
     'wellbeing':r'well.?being|mental health',
     'pandemic/online':r'pandemic|covid|remote|online',
    }
    C=Counter()
    for p in data:
        for name,pat in CONCEPTS.items():
            if re.search(pat,p['_t']): C[name]+=1
    print('\n--- 概念篇数/占比 ---')
    for name,c in C.most_common():
        print(f"{c:4d} {c/len(data)*100:5.1f}%  {name}")
    # unigram
    STOP=set('''a an the and or but if then than of in on at to for from by with without into over under about as is are was were be been being this that these those it its we our you your they their he she i not no nor so such can could may might will would shall should do does did done have has had having there here when where why how all any both each few more most other some only own same too very s t just don now also using used use based through between during before after above below up down out off again further once because while which who whom what whose toward across per via within upon among around behind beyond plus thus hence namely et al one two three new study studies research paper article analysis approach methods results result found show shows shown however using use'''.split())
    U=Counter()
    for p in data:
        for w in re.findall(r'[a-z][a-z\-]{2,}',p['_t']):
            if w not in STOP: U[w]+=1
    print('\n--- 高频实词 Top 45 ---')
    print('  '+'  '.join(f'{w}({c})' for w,c in U.most_common(45)))

report(core,'纯美术教育四刊')
report(recs,'全部8刊')
