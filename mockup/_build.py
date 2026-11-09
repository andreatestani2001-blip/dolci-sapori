# Inietta lo sprite SVG nelle pagine (al posto di <!--ICONS-->) e lo script che adatta
# lo zoom del canvas desktop (1280px) alla larghezza reale della cornice.
import pathlib
root = pathlib.Path(__file__).parent
icons = (root/"_icons.svg").read_text(encoding="utf-8")
fit = """<script>
(function(){function fit(){document.querySelectorAll('.desk').forEach(function(d){var c=d.querySelector('.cvs');if(!c)return;
var w=d.clientWidth-20;c.style.zoom=(w/1280).toFixed(4);});}
fit();addEventListener('resize',fit);})();
</script>
</body>"""
for src in sorted(root.glob("*.src.html")):
    out = root/src.name.replace(".src.html",".html")
    html = src.read_text(encoding="utf-8").replace("<!--ICONS-->", icons).replace("</body>", fit)
    out.write_text(html, encoding="utf-8")
    print("built", out.name)
