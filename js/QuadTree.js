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

  test() {
    const LEN = 1024;
    let t = this;
    let bits = new Uint8Array(LEN);
    for (let i = 0; i < LEN; i++)
      bits[i] = Math.floor(Math.random()*1000)&1;
    for (let i = 0; i < LEN; i++)
      t.pushBit(bits[i]);
    t.finishWrite();

    t.startRead();
    for (let i = 0; i < LEN; i++) {
      let v = t.popBit();
      if (v != bits[i]) {
        debugger;
        alert("BitField::test failed");
        return;
      }
    }
    alert("BitField::test succeeded. Array max index: " + t.curIndex);
  }
}

  function saveQuadTree() {
    let data = new BitField();
    data.test();
  }

 