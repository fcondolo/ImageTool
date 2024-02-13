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
    if (!t.parent) return;
    t.parent = _parent;
    t.children = [];
    t.index = _index;
    t.w = _parent.w / 2;
    t.h = _parent.h / 2;
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
    const MIN_CELL_SIZE = 4;
    let t = this;
    if ((t.w <= MIN_CELL_SIZE) || (t.h <= MIN_CELL_SIZE)) {
      _bitfield.pushBit(1);
      return;
    }
    let empty = 0;
    let full = 0;
    for (let y = 0; y < t.h; y++) {
      for (let x = 0; x < t.w; x++) {
        let ofs = x * 4 + cropW * 4 * y;
        let r = workImagePixels[ofs++];
        let g = workImagePixels[ofs++];
        let b = workImagePixels[ofs];
        if (r + g + b > 16) full++
        else empty++; 
      }  
    }
    const threshold = (t.w * t.h) / 1.6; 
    if (full > threshold){
      _bitfield.pushBit(1);
      return;
    }
    if (empty > threshold){
      _bitfield.pushBit(1);
      return;
    }
    _bitfield.pushBit(0);
    let topLeft = new Cell(t, 0);
    let bottomLeft = new Cell(t, 1);
    let topRight = new Cell(t, 2);
    let bottomRight = new Cell(t, 3);
    t.children.push(topLeft);
    t.children.push(bottomLeft);
    t.children.push(topRight);
    t.children.push(bottomRight);
    topLeft.compute(_bitfield);
    bottomLeft.compute(_bitfield);
    topRight.compute(_bitfield);
    bottomRight.compute(_bitfield);
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
      alert("Quadtree done, " + t.data.curIndex + " bytes.");
    }
  }

  function saveQuadTree() {
//    let data = new BitField();
//    data.test();
    let tree = new QuadTree();
  }

 