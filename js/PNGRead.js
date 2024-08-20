class PNGRead {
	constructor(_bin) {
		let t = this;
		t.OK = false;
	  	t.bin = _bin;
	  	t.readOfs = 0;
		t.maxOfs = t.bin.length;
		
		if (!t.checkHeader()) return;
		

		while (t.readOfs < t.maxOfs) {
			let len = t.isChunk("PLTE");
			if (len > 0) {
				if ((len % 3) != 0) {
					alert("PLTE chunK data size should be a multiple of 3");
					return;
				}
				t.pal = new Uint8Array(len);
				for (let i = 0; i < len; i++) {
					t.pal[i] = t.readByte();
				}
				t.OK = true;
				return;
			}
		}
		alert("Could not find PLTE chunk. Are you sure it's an indexed-color (color type 3) PNG file?");
		return;
	}

	readByte() {
		let t = this;
		if (t.readOfs >= t.maxOfs) {
			alert("read overflow");
			return 0;
		}
		let v = t.bin[t.readOfs];
		t.readOfs++;
		return v;
	}

	readWord() {
		let t = this;
		let hi = t.readByte();
		let lo = t.readByte();
		return (hi<<8)|lo;
	}

	readLong() {
		let t = this;
		let hi = t.readWord();
		let lo = t.readWord();
		return (hi<<16)|lo;
	}

	checkHeader() {
		const signature = [137, 80, 78, 71, 13, 10 ,26 ,10];	
		let t = this;
		for (let i = 0; i < signature.length; i++) {
			if (t.readByte() != signature[i]) {
				alert("unknown PNG format, header failed");
				return false;
			}
		}

		let len = t.readLong();
		let name = "";
		name += String.fromCharCode(t.readByte());
		name += String.fromCharCode(t.readByte());
		name += String.fromCharCode(t.readByte());
		name += String.fromCharCode(t.readByte());
		if (name != "IHDR") {
			return false;
		}
		
		t.Width = t.readLong();
		t.Height = t.readLong();
		t.Bit = t.readByte();
		t.Color = t.readByte();
		if (t.Color != 3) {
			alert("Pixels are not stored as palette indexes. Are you sure it's an indexed-color (color type 3) PNG file?");
			return false;
		}
		if (t.Bit > 8) {
			alert("Invalid colors: Max 8 bit per component (24 bit colors) supported.");
			return false;
		}

		t.Compression = t.readByte();
		t.Filter = t.readByte();
		t.Interlace = t.readByte();

		while (t.readOfs < t.maxOfs-4) {
			if (String.fromCharCode(t.readByte()) == 'P') {
				if (String.fromCharCode(t.readByte()) == 'L') {
					if (String.fromCharCode(t.readByte()) == 'T') {
						if (String.fromCharCode(t.readByte()) == 'E') {
							t.readOfs -= 8;
							return true;
						}							
					}						
				}	
			}
		}
		return false;
	}


	isChunk(_name) {
		let t = this;
		const len = t.readLong();
		let name = "";
		name += String.fromCharCode(t.readByte());
		name += String.fromCharCode(t.readByte());
		name += String.fromCharCode(t.readByte());
		name += String.fromCharCode(t.readByte());
		if (name != _name) {
			t.readOfs += len + 4;
			return -1;
		}
		return len;	
	}
}