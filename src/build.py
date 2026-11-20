# Setzt die Einzelteile zu einer einzigen Spieldatei zusammen (app/index.html)
import os, sys
D = os.path.dirname(os.path.abspath(__file__))
R = lambda f: open(os.path.join(D, f), encoding='utf-8').read()
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(D, '..', 'app', 'index.html')
core = R('core.js') + '\n' + R('culture.js') + '\n' + R('techtree.js') + '\n' + R('town.js') + '\n' + R('war.js') + '\n' + R('village.js')
t = R('template.html').replace('/*ASSETS*/', R('assets.js')).replace('/*CORE*/', core).replace('/*SPRITES*/', R('sprites.js')) \
    .replace('/*CORESRC*/', core).replace('/*WORKER*/', R('worker.js')).replace('/*UI*/', R('ui.js'))
open(out, 'w', encoding='utf-8').write(t)
print(out, len(t))
