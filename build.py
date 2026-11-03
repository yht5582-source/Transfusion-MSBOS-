from pathlib import Path
p=Path(__file__).parent
s=(p/'src/template.html').read_text(encoding='utf-8')
for key,path in [('STYLE','style.css'),('CORE','core.js'),('MSBOS','msbos.js'),('SCHEDULE','schedule.js'),('TEACH','teach.js'),('GUIDE','guide.js'),('APP','app.js')]:
    s=s.replace('/*'+key+'*/',(p/'src'/path).read_text(encoding='utf-8'))
(p/'index.html').write_text(s,encoding='utf-8')
print('Built standalone index.html')
