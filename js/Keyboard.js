var SHIFT = false;
var CTRL = false;

function keyDown(event) {
    var key = event.keyCode;
    switch (key) {
        // Special keys
        case 16: SHIFT = true; break;
        case 17: CTRL = true; break; // PC
        case 91: CTRL = true; break; // MAC cmd key
        default: break;
    }
}

function keyUp(event) {
    var key = event.keyCode;
    switch (key) {
        // Special keys
        case 16: SHIFT = false; break;
        case 17: CTRL = false; break; // PC
        case 91: CTRL = false; break; // MAC cmd key

        case 27: editorOnEsc(); break; // Esc

        case 32: break; // spacebar
	    case 33: break; // pag up
	    case 34: break; // pag down

        // Arrows
        case 37: break; // left
        case 38: break; // up
        case 39: break; // right
        case 40: break; // down
        case 46: onEditorDel(); break; // del

        // Numbers
	    case 48: setElemValue('grabMode', 'grabmode_none'); break; // 0
	    case 49: 	{
            if (SHIFT) {
                var zoom = getElemInt10("zoom");
                if (zoom < 8) {
                    zoom++;
                    setElemValue("zoom",zoom);
                }    
            } else setElemValue('grabMode', 'grabmode_1px'); break; // 1
        }
	    case 50: setElemValue('grabMode', 'grabmode_2px'); break; // 2
	    case 51: setElemValue('grabMode', 'grabmode_4px'); break; // 4
	    case 52: setElemValue('grabMode', 'grabmode_8px'); break; // 8
	    case 53: setElemValue('grabMode', 'grabmode_16px'); break; // 16
	    case 54: setElemValue('grabMode', 'grabmode_32px'); break; // 32

        // Alphabet
        case 65: break; // a
        case 66: window.location.href = "#saveBobs"; break; // b
        case 67:
            if (CTRL) {
                // copy
                event.preventDefault();
            }
            break; // c 
	    case 68: break; // d
	    case 69: break; // e
        case 71: break; // g
        case 72: break; // h
	    case 73: break; // i
	    case 75: break; // k
	    case 76: break; // l
	    case 77: break; // m
        case 78: break; // n
	    case 79: break; // o
	    case 80: break; // p
	    case 81: break; // q
	    case 82: break; // r
        case 83: window.location.href = "#saveSprite"; break; // s
        case 84: break; // t
        case 85: break; // u
        case 86: break; // v
        case 87: window.location.href = "#workBench"; break; // w
        case 88: break; // x
        case 89: break; // y
        case 90: break; // z

        case 107:
        case 171: 	{
                var zoom = getElemInt10("zoom");
            if (zoom < 8) {
                zoom++;
                setElemValue("zoom",zoom);
            }
        }
        break; // plus

        case 173:        // minus
        case 109:        // numpad minus
        case 189: if ((!SHIFT) && (!CTRL)){
            var zoom = getElemInt10("zoom");
            if (zoom > 1) {
                zoom--;
                setElemValue("zoom",zoom);
            }
        }
        break; // minus

        default: console.log("unmapped keycode:" + key); break;
    }
}
