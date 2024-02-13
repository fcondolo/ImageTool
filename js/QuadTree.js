class BitField {
  constructor() 
  {
    let t = this;
    t.maxData = 8192;
    t.data = new Uint32Array(t.maxData);
    t.curShift = 31;
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
      t.curShift = 31;      
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
    t.curShift = 31;
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
      t.curShift = 31;      
    }
    return v;
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
    }
  
  }

  function saveQuadTree() {
    //let data = new BitField();
    //data.test();
    let tree = new QuadTree();
  }

 