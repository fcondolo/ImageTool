function  gen_rgb() {
}

gen_rgb.prototype = {
	generate_clamp : function(_refPix, _destPix, _width, _height) {
		var t = this;

		var i = 0;
		
		for (var y=0;y<_height;y++) {
			for (var x=0;x<_width;x++){
				_destPix[i+0] = _refPix[i+0] & 0xf0;
				_destPix[i+1] = _refPix[i+1] & 0xf0;
				_destPix[i+2] = _refPix[i+2] & 0xf0;
				_destPix[i+3] = 255;
				i+=4;
			}
		}
	},	
	
	get_nearest : function (val) {
		var res = val & 0xf0;
		if ((val & 15) >= 8)
			res += 0x10;
		if (res > 0xf0)
			res = 0xf0;
		return res;
	},
	
	generate_near : function(_refPix, _destPix, _width, _height) {
		var t = this;

		var i = 0;
		
		for (var y=0;y<_height;y++) {
			for (var x=0;x<_width;x++){
				var val = 
				_destPix[i+0] = t.get_nearest(_refPix[i+0]);
				_destPix[i+1] = t.get_nearest(_refPix[i+1]);
				_destPix[i+2] = t.get_nearest(_refPix[i+2]);
				_destPix[i+3] = 255;
				i+=4;
			}
		}
	}	
}
