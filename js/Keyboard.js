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
	    case 48: break; // 0
	    case 49: break; // 1
	    case 50: break; // 2
	    case 51: break; // 4
	    case 52: break; // 8
	    case 53: break; // 16
	    case 54: break; // 32

        // Alphabet
        case 65: break; // a
        case 66: break; // b
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
        case 83: break;// s
        case 84: break; // t
        case 85: break; // u
        case 86: break; // v
        case 87: break; // w
        case 88: break; // x
        case 89: break; // y
        case 90: break; // z

        case 107:
        case 171: 	{
            cameraZoom *= 1.2;
        } break; // plus

        case 173: {
        } break;       // minus
        case 109:        // numpad minus
        case 189: cameraZoom = Math.max(1,cameraZoom /= 1.2); break;
        default: console.log("unmapped keycode:" + key); break;
    }
}
