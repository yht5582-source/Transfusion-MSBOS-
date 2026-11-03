from pathlib import Path
p=Path(__file__).parent
s=(p/'src/template.html').read_text()
for key,path in [('STYLE','style.css'),('CORE','core.js'),('MSBOS','msbos.js'),('APP','app.js')]:
    s=s.replace('/*'+key+'*/',(p/'src'/path).read_text())
(p/'index.html').write_text(s)
print('Built standalone index.html')
