var QUAD_DRAWNSPRT = 0;

class BitField {
  constructor() 
  {
    let t = this;
    t.maxData = 8192;
    t.data = new Uint8Array(t.maxData);
    t.curShift = 7;
    t.curIndex = 0;
    t.curVal = 0;
  }


  pushBit(_v) {
    let t = this;
    _v &= 1;
    t.curVal |= (_v << t.curShift);
    if (t.curShift > 0) {
      t.curShift--;
    } else {
      t.data[t.curIndex++] = t.curVal;
      t.curShift = 7;      
      t.curVal = 0;
      if (t.curIndex >= t.maxData) {
        debugger;
        alert("QuadTree.js: increase t.maxData in constructor");
      }
    }
  }

  finishWrite() {
    let t = this;
    t.data[t.curIndex] = t.curVal;
  }

  startRead() {
    let t = this;
    t.curShift = 7;
    t.curIndex = 0;
    t.curVal = 0;
  }

  popBit() {
    let t = this;
    let v = (t.data[t.curIndex] >> t.curShift) & 1;
    if (t.curShift > 0) {
      t.curShift--;
    } else {
      t.curIndex++;
      t.curShift = 7;      
    }
    return v;
  }

  test() {
    let t = this;
    const LEN = 1024;
    let data = new Uint8Array(LEN);
    for (let i = 0; i < LEN; i++)
      data[i] = Math.floor(Math.random() * 1000) & 1;
    for (let i = 0; i < LEN; i++)
      t.pushBit(data[i]);
    t.finishWrite();
    t.startRead();
    for (let i = 0; i < LEN; i++) {
      if (t.popBit() != data[i]) {
        debugger;
        alert("failed");
      }
    }
    alert("test OK, " + t.curIndex + " bytes.");
  }
}

class Cell {
  /*
  _parent : the parent cell
  _index : the index in the parent cell (0 = top left, 1 = bottom left, 2 = top right, 3 = bottom right)
  */
  constructor(_parent, _index) 
  {
    let t = this;
    t.MIN_CELL_SIZE = 4;
    t.parent = _parent;
    t.children = [];
    t.index = _index;
    if (!_parent) return;
    t.w = Math.floor((_parent.w + 1) / 2);
    t.h = Math.floor((_parent.h + 1) / 2);
    switch (_index) {
      case 0:
        t.x = _parent.x;
        t.y = _parent.y;
      break;
      case 1:
        t.x = _parent.x;
        t.y = _parent.y + t.h;
      break;
      case 2:
        t.x = _parent.x + t.w;
        t.y = _parent.y;
      break;
      case 3:
        t.x = _parent.x + t.w;
        t.y = _parent.y + t.h;
      break;
      default:
        debugger;
        alert("unsupported index");
      break;
    }
  }

  compute(_bitfield) {
    let t = this;
    let empty = 0;
    let full = 0;
    for (let y = 0; y < t.h; y++) {
      for (let x = 0; x < t.w; x++) {
        let ofs = (t.x + x) * 4 + cropW * 4 * (t.y + y);
        let r = workImagePixels[ofs++];
        let g = workImagePixels[ofs++];
        let b = workImagePixels[ofs];
        if (r + g + b > 0) full++
        else empty++; 
      }  
    }
    if ((t.w <= t.MIN_CELL_SIZE) || (t.h <= t.MIN_CELL_SIZE)) {
      _bitfield.pushBit(1);
      if (empty == t.w * t.h)
        _bitfield.pushBit(0);
      else
        _bitfield.pushBit(1);
      return;
    }
    const threshold = (t.w * t.h) / 1; 
    if (full >= threshold){
      _bitfield.pushBit(1);
      _bitfield.pushBit(1);
      return;
    }
    if (empty >= threshold){
      _bitfield.pushBit(1);
      _bitfield.pushBit(0);
      return;
    }
    _bitfield.pushBit(0);
    let topLeft = new Cell(t, 0);
    let bottomLeft = new Cell(t, 1);
    let topRight = new Cell(t, 2);
    let bottomRight = new Cell(t, 3);
    topLeft.compute(_bitfield);
    bottomLeft.compute(_bitfield);
    topRight.compute(_bitfield);
    bottomRight.compute(_bitfield);
    t.children.push(topLeft);
    t.children.push(bottomLeft);
    t.children.push(topRight);
    t.children.push(bottomRight);
  }

  addSprite(_x, _y, _w, _h, _pix) {
    QUAD_DRAWNSPRT++;
    // sprite
    if (_x % 2 != 0) { _x--; _w++;}
    if (_y % 2 != 0) { _y--; _h++;}
    if (_w % 2 != 0) _w++;
    if (_h % 2 != 0) _h++;
    for (let y = 0; y < _h; y++) {
      for (let x = 0; x < _w; x++) {
        let ofs = (_x + x) + (_y + y) * cropW;
        ofs *= 4;
        workImagePixels[ofs] = 255;//_pix[ofs];
        workImagePixels[ofs + 1] = 255;//_pix[ofs + 1];
        workImagePixels[ofs + 2] = 255;//_pix[ofs + 2];
      }  
    }

    // debug contour
    for (let x = 0; x < _w; x++) {
      let ofs = (_x + x) + (_y + 0) * cropW;
      ofs *= 4;
      workImagePixels[ofs] = 255;
      workImagePixels[ofs + 1] = 0;
      workImagePixels[ofs + 2] = 0;
      ofs = (_x + x) + (_y + _h) * cropW;
      ofs *= 4;
      workImagePixels[ofs] = 255;
      workImagePixels[ofs + 1] = 0;
      workImagePixels[ofs + 2] = 0;
    }  

    for (let y = 0; y < _h; y++) {
      let ofs = (_x + 0) + (_y + y) * cropW;
      ofs *= 4;
      workImagePixels[ofs] = 255;
      workImagePixels[ofs + 1] = 0;
      workImagePixels[ofs + 2] = 0;
      ofs = (_x + _w) + (_y + y) * cropW;
      ofs *= 4;
      workImagePixels[ofs] = 255;
      workImagePixels[ofs + 1] = 0;
      workImagePixels[ofs + 2] = 0;
    }  
  }

  replay(_bitfield, _pix) {
    let t = this;
    let b = _bitfield.popBit();
    if (b == 1) { // cell is not subdivided
      b = _bitfield.popBit();
      if (b == 1) // is not 100% empty cell
        t.addSprite(t.x, t.y, t.w, t.h, _pix);
      return;
    }
    // cell is subdivided
    let topLeft = new Cell(t, 0);
    let bottomLeft = new Cell(t, 1);
    let topRight = new Cell(t, 2);
    let bottomRight = new Cell(t, 3);
    topLeft.replay(_bitfield, _pix);
    bottomLeft.replay(_bitfield, _pix);
    topRight.replay(_bitfield, _pix);
    bottomRight.replay(_bitfield, _pix);
  }
}

class QuadTree {
    constructor() 
    {
      let t = this;
      t.data = new BitField();
      t.root = new Cell(null,0);
      t.root.parent = null;
      t.root.index = 0;
      t.root.x = 0;
      t.root.y = 0;
      t.root.w = cropW;
      t.root.h = cropH;
      t.root.children = [];
      t.root.compute(t.data);
      t.data.finishWrite();
      console.log("Quadtree done, " + (t.data.curIndex + 1) + " bytes.");
    }

    replay() {
      let t = this;
      // clear image
      t.pix =  workImagePixels.slice();
      let ofs = 0;
      for (let y = 0; y < cropH; y++) {
        for (let x = 0; x < cropW; x++) {
          workImagePixels[ofs++] = 0;       
          workImagePixels[ofs++] = 0;       
          workImagePixels[ofs++] = 0;       
          workImagePixels[ofs++] = 255;       
        }  
      }

      // rebuild image
      t.data.startRead();
      t.root.children = [];
      t.root.replay(t.data, t.pix);
    }
  }

  function saveQuadTree() {
//    let data = new BitField();
//    data.test();
    let tree = new QuadTree();

    var d = new Date();
    let s = "\t// quadtree for: " + export_fileName;
    s += "\t\n // " + d.toString() + "\n";
    s += "\tstatic unsigned char quadTreeBits[" + (tree.data.curIndex + 1) + "] = {";
    for (let i = 0; i <= tree.data.curIndex; i++) {
      s += tree.data.data[i];
      if (i < tree.data.curIndex) s+= ", ";
      else s += "};\n";
    }
    navigator.clipboard.writeText(s);

    QUAD_DRAWNSPRT  = 0;
    tree.replay();
    console.log("drawn " + QUAD_DRAWNSPRT + " sprites");


    workContext.putImageData(workImageData, 0, 0);
   buildViewImage(0);
  }

 