/*
source	: the original drag'n dropped image. Its data is never changed
work	: a copy of the source image, but cropped and with color changes. work is the base for export functions
view    : zoomed copy of work. Also shows color cycling
pixelsPaletteIndex : index in palette of each pixel in the work image

*/

var chosenFileName = null;

// All variables for the source image (original image given by the user)
var sourceImage;
var sourceCanvas;
var sourceContext;
var sourceImageData;
var sourceImagePixels;

// All variables for the work image (cropped and color remapped). The work image is used for export.
var workCanvas;
var workContext;
var workImageData;
var workImagePixels;

// All variables for the view image. Used for all edition / visualization purposes. Copy of the work image (but can be zoomed, color cycled, etc.)
var viewCanvas;
var viewContext;

// Table containing the index in global_palette[] for each pixel in workImagePixels
var pixelsPaletteIndex;

// Table containing the palette build from the workCanvas contents
var global_palette = [];

var cropX, cropY, cropW, cropH;
var views = [];
var viewX, viewY, viewW, viewH;
var curViewIndex;
var realMouseCoord = {x:0,y:0};
var frames = [];

var spriteWindow;
var target_platform;

var CONST_LOCK0_COLOR = {r:345,g:456,b:567};

var export_fileName = "file";

var color_convert_method = remapRGBtoAmiga_clamp;

// grabbing
var grab_state = "null";
var grab_startx = -1;
var grab_starty = -1;
var grab_curx = -1;
var grab_cury = -1;
var inGrabContext = false;


/************************************************ 
EVENT HANDLERS AND LISTENERS
************************************************/
let viewShow_start, viewShow_previousTimeStamp;
var anim_timer = 0;
function viewShow_step(timestamp) {
  if (viewShow_start === undefined) {
	viewShow_start = timestamp;
	viewShow_previousTimeStamp = timestamp;
  }
  const elapsed = timestamp - viewShow_start;
  const delta = timestamp - viewShow_previousTimeStamp;

  if (delta >= 1.0/30.0) {
	viewShow_previousTimeStamp = timestamp;
	anim_timer += 1.0/30.0;
	buildViewImage(anim_timer * 0.3);
  }
  window.requestAnimationFrame(viewShow_step);
}


function getElem(_id) {
	var elm = document.getElementById(_id);
	if ((elm === undefined) || (!elm)) {
		alert("MAJOR ERROR : HTML ELEMENT " + _id + " NOT FOUND!");
		debugger;
		return null;
	}
	return elm;
}

function getElemInt10(_id) {
	var elm = document.getElementById(_id);
	if ((elm === undefined) || (!elm)) {
		alert("MAJOR ERROR : HTML ELEMENT " + _id + " NOT FOUND!");
		debugger;
		return 0;
	}
	if ((elm.value === undefined) || (elm.value === null)) {
		alert("MAJOR ERROR : HTML ELEMENT " + _id + " HAS NO VALUE!");
		debugger;
		return 0;
	}
	var ret = parseInt(elm.value,10);
	if (isNaN(ret)) {
		alert("MAJOR ERROR : HTML ELEMENT " + _id + " IS NOT A NUMBER!");
		debugger;
		return 0;
	}
	return v(ret);
}

function getElemValue(_id) {
	var elm = document.getElementById(_id);
	if ((elm === undefined) || (!elm)) {
		alert("MAJOR ERROR : HTML ELEMENT " + _id + " NOT FOUND!");
		debugger;
		return "error";
	}
	if ((elm.value === undefined) || (elm.value === null)) {
		alert("MAJOR ERROR : HTML ELEMENT " + _id + " HAS NO VALUE!");
		debugger;
		return "error";
	}
	return elm.value;
}


function setElemValue(_id, _value) {
	var elm = document.getElementById(_id);
	if ((elm === undefined) || (!elm)) {
		alert("MAJOR ERROR : HTML ELEMENT " + _id + " NOT FOUND!");
		debugger;
		return;
	}
	if ((elm.value === undefined) || (elm.value === null)) {
		alert("MAJOR ERROR : HTML ELEMENT " + _id + " HAS NO VALUE!");
		debugger;
		return;
	}
	elm.value = _value;
}

function setElemInner(_id, _value) {
	var elm = document.getElementById(_id);
	if ((elm === undefined) || (!elm)) {
		alert("MAJOR ERROR : HTML ELEMENT " + _id + " NOT FOUND!");
		debugger;
		return;
	}
	if ((elm.innerHTML === undefined) || (elm.innerHTML === null)) {
		alert("MAJOR ERROR : HTML ELEMENT " + _id + " HAS NO VALUE!");
		debugger;
		return;
	}
	elm.innerHTML = _value;
}

function isElemChecked(_id) {
	var elm = document.getElementById(_id);
	if ((elm === undefined) || (!elm)) {
		alert("MAJOR ERROR : HTML ELEMENT " + _id + " NOT FOUND!");
		debugger;
		return false;
	}
	if ((elm.checked === undefined) || (elm.checked === null)) {
		alert("MAJOR ERROR : HTML ELEMENT " + _id + " IS NOT A CHECKBOX!");
		debugger;
		return false;
	}
	return elm.checked;
}

function setElemChecked(_id,_value) {
	var elm = document.getElementById(_id);
	if ((elm === undefined) || (!elm)) {
		alert("MAJOR ERROR : HTML ELEMENT " + _id + " NOT FOUND!");
		debugger;
		return;
	}
	if ((elm.checked === undefined) || (elm.checked === null)) {
		alert("MAJOR ERROR : HTML ELEMENT " + _id + " IS NOT A CHECKBOX!");
		debugger;
		return;
	}
	elm.checked = _value;
}

function onLoad() {
	document.getElementById('file-input').addEventListener('change', readSingleFile, false);
	getElem('frames').style.display = 'none';
	setElemValue('sprtScrX', 0);
	setElemValue('sprtScrY', 0);
	setElemValue('sprtOfsX', 128);
	setElemValue('sprtOfsY', 44);

    document.onmousemove = function(e) {
        onMouseMove(e);
    }
		
    document.onclick = function(e) {
        onMouseClick(e);
    }

    document.onmousedown = function(e) {
        onMouseDown(e);
    }

    document.onmouseup = function(e) {
        onMouseUp(e);
    }

	//buildxportMenu(0);
	var dropZone = getElem('refImg');
	dropZone.addEventListener('dragover', handleDragOver, false);
	dropZone.addEventListener('drop', handleFileSelect, false);
	
	window.requestAnimationFrame(viewShow_step);
}

function copyStringToClipboard (str) {
	// Create new element
	var el = document.createElement('textarea');
	// Set value (string to be copied)
	el.value = str;
	// Set non-editable to avoid focus and move outside of view
	el.setAttribute('readonly', '');
	el.style = {position: 'absolute', left: '-9999px'};
	document.body.appendChild(el);
	// Select text inside element
	el.select();
	// Copy text to clipboard
	document.execCommand('copy');
	// Remove temporary element
	document.body.removeChild(el);
 }
  
function onImageDropped() {
	onDrop(null);
}
  
function typeOf(val) {
	return Object.prototype.toString.call(val).slice(8,-1);
}

function v(t) {return Math.floor(t);}

function isColor0Locked() {
	if (global_palette.length < 1)
		return false;

	if (global_palette[0].r !== CONST_LOCK0_COLOR.r)
		return false;
	if (global_palette[0].g !== CONST_LOCK0_COLOR.g)
		return false;
	if (global_palette[0].b !== CONST_LOCK0_COLOR.b)
		return false;

	return true;
}

function onLockCol0() {
	if (!getElem('lockclr0').checked) {
		if (isColor0Locked())
			global_palette.shift();
	}
	onDoCrop();
}

/************************************************ 
CROPPING
************************************************/
function readCropValues() {
	cropX = parseInt(getElem('cropX').value,10);
	cropY = parseInt(getElem('cropY').value,10);
	cropW = parseInt(getElem('cropW').value,10);
	cropH = parseInt(getElem('cropH').value,10);

	if (parseInt(getElem('sprtH').value, 10) > cropH) {
		getElem('sprtH').value = cropH;
	}
	
	if (parseInt(getElem('bobW').value, 10) > cropW) {
		getElem('bobW').value = cropW;
	}
	if (parseInt(getElem('bobH').value, 10) > cropH) {
		getElem('bobH').value = cropH;
	}

	resetViewsToCropValues();
}

function writeCropValues(x,y,w,h) {
	cropX = x;
	cropY = y;
	cropW = w;
	cropH = h;

	if (cropX < 0) cropX = 0;
	if (cropX > sourceImage.width-1) cropX = sourceImage.width-1;
	if (cropY < 0) cropY = 0;
	if (cropY > sourceImage.height-1) cropY = sourceImage.height-1;
	if (cropW < 0) cropW = 0;
	if (cropH < 0) cropH = 0;
	if (cropX + cropW >= sourceImage.width) cropW = sourceImage.width-cropX;
	if (cropY + cropH >= sourceImage.height) cropH = sourceImage.height-cropY;
	if (cropW < 0) cropW = 0;
	if (cropH < 0) cropH = 0;

	getElem('cropX').value = cropX;
	getElem('cropY').value = cropY;
	getElem('cropW').value = cropW;
	getElem('cropH').value = cropH;

	resetViewsToCropValues();
}


function addView(_x,_y,_w,_h,_setCurrent) {
	views.push({x:_x, y:_y, w:_w, h:_h});
	if (_setCurrent) {
		curViewIndex = views.length - 1;
		spriteWindow = {x:_x, y:_y, w:_w, h:_h};
	}
}

function popView(_x,_y,_w,_h) {
	if (views.length > 1) {
		views.pop();
	}
	if (curViewIndex >= views.length)
		curViewIndex = views.length - 1;
	if (curViewIndex < 0)
		curViewIndex = 0;
	spriteWindow = {x:views[curViewIndex].x, y:views[curViewIndex].y, w:views[curViewIndex].w, h:views[curViewIndex].h};
	return {x:views[curViewIndex].x, y:views[curViewIndex].y, w:views[curViewIndex].w, h:views[curViewIndex].h};
}


function resetViewsToCropValues() {
	views = [];
	addView(cropX, cropY, cropW, cropH, true);
}

function getCurrentView() {
	if (curViewIndex < 0) curViewIndex = 0;
	if (curViewIndex >= views.length) curViewIndex = views.length-1;
	return views[curViewIndex];
}

function onCrop(){
	var tcropX = parseInt(getElem('cropX').value,10);
	var tcropY = parseInt(getElem('cropY').value,10);
	var tcropW = parseInt(getElem('cropW').value,10);
	var tcropH = parseInt(getElem('cropH').value,10);
	if (tcropX < 0) tcropX = 0;
	if (tcropX > sourceImage.width-1) tcropX = sourceImage.width-1;
	if (tcropY < 0) tcropY = 0;
	if (tcropY > sourceImage.height-1) tcropY = sourceImage.height-1;
	if (tcropW < 0) tcropW = 0;
	if (tcropH < 0) tcropH = 0;
	if (tcropX + tcropW >= sourceImage.width) tcropW = sourceImage.width-tcropX;
	if (tcropY + tcropH >= sourceImage.height) {
		tcropH = sourceImage.height-tcropY;
	}
	if (tcropW < 0) tcropW = 0;
	if (tcropH < 0) tcropH = 0;
	getElem('cropX').value = tcropX;
	getElem('cropY').value = tcropY;
	getElem('cropW').value = tcropW;
	getElem('cropH').value = tcropH;
}

function onDoCrop() {
	readCropValues();

	global_palette = [];
	buildWorkImage();
	buildPaletteFromWorkImage();
	buildPixelsPaletteIndexes();
	buildViewImage(0);
}
	
function removeExtension(filename){
    var lastDotPosition = filename.lastIndexOf(".");
    if (lastDotPosition === -1) return filename;
    else return filename.substr(0, lastDotPosition);
}

function onDrop(_fname) {
	global_palette = [];
	onPlatformChosen();
	sourceImage = getElem('refImg');
	if (_fname)
		export_fileName = removeExtension(_fname);
	else if (sourceImage.file && sourceImage.file.name)
		export_fileName = removeExtension(sourceImage.file.name);
	else if (chosenFileName)
		export_fileName = removeExtension(chosenFileName);
	else export_fileName = "noname";
	//document.getElementById('file-input').value = export_fileName;
	var w = sourceImage.width;
	var h = sourceImage.height
	writeCropValues(0,0,w,h);

	//getElem("refImgName").innerHTML = "file: " + sourceImage.file.name + " - size: " + w + "x" + h + " pixels.";
	getElem('sprtName').value = export_fileName;
	getElem('lockclr0').checked = false;
	getElem('bobC').value = 1;
	getElem('bobName').value = export_fileName;
	getElem('bobIncludePal').checked = false;
	getElem('bobInterlace').checked = false;
	getElem('bobSkpEmpty').checked = false;
	getElem('xportInterleave').checked = false;
	getElem('includeCount').checked = false;
	getElem('includeCtrl').checked = false;
	getElem('includePal').checked = false;
	getElem('skpEmpty').checked = false;
	
	getElem('sprtH').value = sourceImage.height;
	getElem('bobW').value = sourceImage.width;
	getElem('bobH').value = sourceImage.height;

	sourceCanvas = document.getElementById("sourceCanvas");
	if (!sourceCanvas) {
		sourceCanvas = document.createElement('canvas');
		sourceCanvas.id = "sourceCanvas";
	}
	sourceCanvas.width = w;
	sourceCanvas.height = h;
	sourceContext = sourceCanvas.getContext('2d');
	sourceContext.drawImage(sourceImage,0,0,w,h);
	sourceImageData = sourceContext.getImageData(0, 0, w, h);
	sourceImagePixels = sourceImageData.data;

	workCanvas = getElem('workCanvas');
	workContext = workCanvas.getContext('2d');
	viewCanvas = getElem('viewCanvas');
	viewContext = viewCanvas.getContext('2d');

	buildWorkImage();
	buildPaletteFromWorkImage();
	buildPixelsPaletteIndexes();
	buildViewImage(0);

	getElem('sprtC').value = v(w / 16);
}

function buildWorkImage() {
    var algo = getElem("conversionAlgo").value;
    if (algo === "nearestColor") color_convert_method = remapRGBtoAmiga_nearest;
    else if (algo === "clampColor") color_convert_method = remapRGBtoAmiga_clamp;
    else alert("unknown algo: " + algo);

	workCanvas.width = cropW;
	workCanvas.height = cropH;
	workContext.width = cropW;
	workContext.height = cropH;
	workContext.imageSmoothingEnabled = false;	
	workContext.drawImage(sourceImage,cropX,cropY,cropW,cropH,0,0,cropW,cropH);
	workImageData = workContext.getImageData(0, 0, cropW, cropH);
	workImagePixels = workImageData.data;

    // we need  to clamp to Amiga colors early in the process
    // otherwise, 2 different RGB255 colors may remap to the same palette entry
	var read = 0;
	for (var y = 0; y < cropH; y++) {
	    for (var x = 0; x < cropW; x++) {
	        var ir = workImagePixels[read];
	        var ig = workImagePixels[read + 1];
	        var ib = workImagePixels[read + 2];
	        var col = color_convert_method(ir, ig, ib);
	        workImagePixels[read] = col.r;
	        workImagePixels[read+1] = col.g;
	        workImagePixels[read+2] = col.b;
	        read += 4;
	    }
	}	
	workImageData.data = workImagePixels;
	workContext.putImageData(workImageData, 0, 0);
}

function clampCoord(coord, clamp) {
	return Math.round(coord/clamp)*clamp;
}

function buildPaletteFromWorkImage() {
	global_palette = [];
	if (getElem('lockclr0').checked)
		global_palette.push({r:CONST_LOCK0_COLOR.r,g:CONST_LOCK0_COLOR.g,b:CONST_LOCK0_COLOR.b});	// impossible color to make sure it remaps to no pixel
		
	var read = 0;
	var write = 0;

	for (var y = 0; y < cropH; y++) {
		for (var x = 0; x < cropW; x++) {
			var ir = workImagePixels[read];
			var ig = workImagePixels[read+1];
			var ib = workImagePixels[read+2];
			read += 4;
			getPaletteIndex(ir, ig, ib, true);
		}
	}
	refreshPaletteInfo();
}

function refreshPaletteInfo() {
	getElem('xport1').checked = false;
	getElem('xport2').checked = false;
	getElem('xport3').checked = false;
	getElem('xport4').checked = false;
	getElem('xport5').checked = false;
	if (global_palette.length > 0) {
		getElem('xport1').checked = true;
		if (global_palette.length > 2) {
			getElem('xport2').checked = true;
			if (global_palette.length > 4) {
				getElem('xport3').checked = true;
				if (global_palette.length > 8) {
					getElem('xport4').checked = true;
					if (global_palette.length > 16) {
						getElem('xport5').checked = true;
					}
				}
			}
		}
	}

	if (global_palette.length < 33) {
		var palCol = '<ul style="width:100%" id="items">';
		for (var i = 0; i < global_palette.length; i++) {
			var amigaColorValue;
			if ((i === 0) && isColor0Locked()) {
				amigaColorValue = "000";
				palCol += '<li>' + TwoCharString(i) + ' (LOCKED)</li>';	
			} else {
				amigaColorValue = nearestPalEntry(global_palette[i]);
				var palVal = "#" + TwoCharStringHEX(global_palette[i].r) + TwoCharStringHEX(global_palette[i].g) + TwoCharStringHEX(global_palette[i].b);
				palCol += '<li>' + TwoCharString(i) + ' ($'+ amigaColorValue +'):' + '<input style="height: 40px; width:50%;" id="colorBox_' + i + '" onchange="onNewColor(' + i + ')" type="color" value="' + palVal + '"></li>';	
			}
		}
		palCol += "</ul>";

		getElem('paletteColors').innerHTML = palCol;
		var el = getElem('items');
		var sortable = Sortable.create(el, {
			onEnd: function (evt) {
				remapColorIndex(evt.oldIndex, evt.newIndex);
			},
		});
	} else {
		getElem('paletteColors').innerHTML = "<b>"+global_palette.length+": too many colors for palette editor</b><br>";
	}

}

function buildPixelsPaletteIndexes() {
	pixelsPaletteIndex = new Uint8Array(cropW * cropH);
	var write = 0;
	var read = 0;
	for (var y = 0; y < cropH; y++) {
		for (var x = 0; x < cropW; x++) {
			var ir = workImagePixels[read];
			var ig = workImagePixels[read+1];
			var ib = workImagePixels[read+2];
			read += 4;
			pixelsPaletteIndex[write++] = getPaletteIndex(ir, ig, ib, false);			
		}
	}
}



	

  function nearest(val) {
		var res = Math.floor(val) & 0xf0;
		if ((val & 15) >= 8)
			res += 0x10;
		if (res > 0xf0)
			res = 0xf0;
		return res;
}
	

function getPaletteIndex(_r,_g,_b, _autoAddMissing) {
		for (var i = 0; i < global_palette.length; i++) {
			if ((global_palette[i].r == _r)&&(global_palette[i].g == _g)&&(global_palette[i].b == _b))
				return i;
		}
		if (_autoAddMissing) {
			global_palette.push({r:_r,g:_g,b:_b});
			return global_palette.length-1;	
		} else {
			alert("getPaletteIndex: color not found");
			return -1;
		}
}

function findNearesIndexInPalette(_r,_g,_b) {
	var bestDist = 99999;
	var bestIndex = 0;
	for (var i = 0; i < global_palette.length; i++) {
		var dist = Math.abs(global_palette[i].r-_r) + Math.abs(global_palette[i].g-_g) + Math.abs(global_palette[i].b-_b);
		if ((i === 0) || (dist < bestDist)) {
			bestIndex = i;
			bestDist = dist;
		}
	}
	return bestIndex;
}

function TwoCharString(i) {
    if (i < 10)
        return "0" + i;
    return i;
}


function TwoCharStringHEX(i) {
	var ret = "";
	var hi = Math.floor(i / 16);
	switch(hi){
		case 0 : ret += "0"; break;
		case 1 : ret += "1"; break;
		case 2 : ret += "2"; break;
		case 3 : ret += "3"; break;
		case 4 : ret += "4"; break;
		case 5 : ret += "5"; break;
		case 6 : ret += "6"; break;
		case 7 : ret +=  "7"; break;
		case 8 : ret += "8"; break;
		case 9 : ret += "9"; break;
		case 10 : ret += "a"; break;
		case 11 : ret += "b"; break;
		case 12 : ret += "c"; break;
		case 13 : ret += "d"; break;
		case 14 : ret += "e"; break;
		case 15 : ret += "f"; break;
		default : alert("color value error"); ret += "0"; break;
	}
	var lo = Math.floor(i&15);
	switch(lo){
		case 0 : ret += "0"; break;
		case 1 : ret += "1"; break;
		case 2 : ret += "2"; break;
		case 3 : ret += "3"; break;
		case 4 : ret += "4"; break;
		case 5 : ret += "5"; break;
		case 6 : ret += "6"; break;
		case 7 : ret +=  "7"; break;
		case 8 : ret += "8"; break;
		case 9 : ret += "9"; break;
		case 10 : ret += "a"; break;
		case 11 : ret += "b"; break;
		case 12 : ret += "c"; break;
		case 13 : ret += "d"; break;
		case 14 : ret += "e"; break;
		case 15 : ret += "f"; break;
		default : alert("color value error"); ret += "0"; break;
	}
    return ret;
}

function ThreeCharStringHEX(i) {
	var ret = "";
	var superhi = Math.floor(i / 256);
	switch(hi){
		case 0 : ret += "0"; break;
		case 1 : ret += "1"; break;
		case 2 : ret += "2"; break;
		case 3 : ret += "3"; break;
		case 4 : ret += "4"; break;
		case 5 : ret += "5"; break;
		case 6 : ret += "6"; break;
		case 7 : ret +=  "7"; break;
		case 8 : ret += "8"; break;
		case 9 : ret += "9"; break;
		case 10 : ret += "a"; break;
		case 11 : ret += "b"; break;
		case 12 : ret += "c"; break;
		case 13 : ret += "d"; break;
		case 14 : ret += "e"; break;
		case 15 : ret += "f"; break;
		default : alert("color value error"); ret += "0"; break;
	}
	var hi = Math.floor(i / 16);
	switch(hi){
		case 0 : ret += "0"; break;
		case 1 : ret += "1"; break;
		case 2 : ret += "2"; break;
		case 3 : ret += "3"; break;
		case 4 : ret += "4"; break;
		case 5 : ret += "5"; break;
		case 6 : ret += "6"; break;
		case 7 : ret +=  "7"; break;
		case 8 : ret += "8"; break;
		case 9 : ret += "9"; break;
		case 10 : ret += "a"; break;
		case 11 : ret += "b"; break;
		case 12 : ret += "c"; break;
		case 13 : ret += "d"; break;
		case 14 : ret += "e"; break;
		case 15 : ret += "f"; break;
		default : alert("color value error"); ret += "0"; break;
	}
	var lo = Math.floor(i&15);
	switch(lo){
		case 0 : ret += "0"; break;
		case 1 : ret += "1"; break;
		case 2 : ret += "2"; break;
		case 3 : ret += "3"; break;
		case 4 : ret += "4"; break;
		case 5 : ret += "5"; break;
		case 6 : ret += "6"; break;
		case 7 : ret +=  "7"; break;
		case 8 : ret += "8"; break;
		case 9 : ret += "9"; break;
		case 10 : ret += "a"; break;
		case 11 : ret += "b"; break;
		case 12 : ret += "c"; break;
		case 13 : ret += "d"; break;
		case 14 : ret += "e"; break;
		case 15 : ret += "f"; break;
		default : alert("color value error"); ret += "0"; break;
	}
    return ret;
}



function remapColorIndex(oldIndex, newIndex) {
    if (newIndex === oldIndex)
        return;

	if (isColor0Locked()) {
		if ((newIndex === 0) || (oldIndex === 0)) {
			refreshPaletteInfo();
			return;
		}
	}

    var or = global_palette[oldIndex].r;
    var og = global_palette[oldIndex].g;
    var ob = global_palette[oldIndex].b;

    if (newIndex < oldIndex) {
        for (var i = oldIndex ; i > newIndex; i--) {
            global_palette[i].r = global_palette[i - 1].r;
            global_palette[i].g = global_palette[i - 1].g;
            global_palette[i].b = global_palette[i - 1].b;
        }
    }
    else {
        for (var i = oldIndex; i < newIndex; i++) {
            global_palette[i].r = global_palette[i + 1].r;
            global_palette[i].g = global_palette[i + 1].g;
            global_palette[i].b = global_palette[i + 1].b;
        }
    }
    global_palette[newIndex].r = or;
    global_palette[newIndex].g = og;
    global_palette[newIndex].b = ob;

    buildPixelsPaletteIndexes();
	refreshPaletteInfo();
}

function pal_ascending() {
	var start = 0;
	if (isColor0Locked())
		start = 1;
    var good = false;
    while (!good) {
        good = true;
        for (var i = start; i < global_palette.length; i++) {
            for (var j = i +1; j < global_palette.length; j++) {
                var ir = global_palette[i].r;
                var ig = global_palette[i].g;
                var ib = global_palette[i].b;
                var jr = global_palette[j].r;
                var jg = global_palette[j].g;
                var jb = global_palette[j].b;
                var ilum = 0.2126 * ir + 0.7152 * ig + 0.0722 * ib;
                var jlum = 0.2126 * jr + 0.7152 * jg + 0.0722 * jb;
                if (ilum > jlum) {
                    good = false;
                    global_palette[i].r = jr;
                    global_palette[i].g = jg;
                    global_palette[i].b = jb;
                    global_palette[j].r = ir;
                    global_palette[j].g = ig;
                    global_palette[j].b = ib;
                }
            }
        }
    }
    buildPixelsPaletteIndexes();
	refreshPaletteInfo();
}

function pal_descending() {
	var start = 0;
	if (isColor0Locked())
		start = 1;
    var good = false;
    while (!good) {
        good = true;
        for (var i = start; i < global_palette.length; i++) {
            for (var j = i + 1; j < global_palette.length; j++) {
                var ir = global_palette[i].r;
                var ig = global_palette[i].g;
                var ib = global_palette[i].b;
                var jr = global_palette[j].r;
                var jg = global_palette[j].g;
                var jb = global_palette[j].b;
                var ilum = 0.2126 * ir + 0.7152 * ig + 0.0722 * ib;
                var jlum = 0.2126 * jr + 0.7152 * jg + 0.0722 * jb;
                if (ilum < jlum) {
                    good = false;
                    global_palette[i].r = jr;
                    global_palette[i].g = jg;
                    global_palette[i].b = jb;
                    global_palette[j].r = ir;
                    global_palette[j].g = ig;
                    global_palette[j].b = ib;
                }
            }
        }
    }
    buildPixelsPaletteIndexes();
	refreshPaletteInfo();
}

function onSprtExportMode() {
	var mode = getElem("sprtMode").value;
	var mode2 = getElem("sprtSaveTo").value;
	if (mode2 === "sprt_clipBoard") {
		if (mode === "sprtBin")
			getElem("sprtSaveTo").value = "sprt_file";
		if (mode === "sprt1Bin")
			getElem("sprtSaveTo").value = "sprt_file";
	}
}

function onBobExportMode() {
	var mode = getElem("bobMode").value;
	var mode2 = getElem("bobSaveTo").value;
	if (mode2 === "bob_clipBoard") {
		if (mode === "bobBin")
			getElem("bobSaveTo").value = "bob_file";
		if (mode === "bobSingleBin")
			getElem("bobSaveTo").value = "bob_file";
	}
}

function onPalExportMode() {
	var mode = getElem("paletteMode").value;
	var mode2 = getElem("paletteSaveTo").value;
	if (mode2 === "pal_clipBoard") {
		if (mode === "paltBin")
			getElem("paletteSaveTo").value = "pal_file";
	}
}


function clampPalEntry(_e) {
	var r = _e.r&0xf0;
	var g = _e.g&0xf0;
	var b = _e.b&0xf0;
	r >>= 4;
	g >>= 4;
	b >>= 4;
	return r.toString(16)+g.toString(16)+b.toString(16);
}

function remapRGBtoAmiga_nearest(_r, _g, _b) {
    var r = _r & 0xf0;
    if ((_r & 15) >= 8)
        r += 0x10;
    if (r > 0xf0)
        r = 0xf0;

    var g = _g & 0xf0;
    if ((_g & 15) >= 8)
        g += 0x10;
    if (g > 0xf0)
        g = 0xf0;

    var b = _b & 0xf0;
    if ((_b & 15) >= 8)
        b += 0x10;
    if (b > 0xf0)
        b = 0xf0;

    return { r:r, g:g, b:b };
}

function remapRGBtoAmiga_clamp(_r, _g, _b) {
    var r = _r & 0xf0;
    var g = _g & 0xf0;
    var b = _b & 0xf0;
    return { r: r, g: g, b: b };
}

function nearestPalEntry(_e) {
	var col = color_convert_method(_e.r, _e.g, _e.b);

	col.r >>= 4;
	col.g >>= 4;
	col.b >>= 4;
	return col.r.toString(16)+col.g.toString(16)+col.b.toString(16);
}



var global_pal_copy = [];
var prev_cycle_val = 0;
function startColorCycle() {
	global_pal_copy = [];
    for (var i = 0; i < global_palette.length; i++) {
		var r = global_palette[i].r;
		var g = global_palette[i].g;
		var b = global_palette[i].b;
		global_pal_copy.push({r:r,g:g,b:b});
	}
	prev_cycle_val = parseInt(getElem("colorcycle").value, 10);
}

function endColorCycle() {
    for (var i = 0; i < global_pal_copy.length; i++) {
		global_palette[i].r = global_pal_copy[i].r;
		global_palette[i].g = global_pal_copy[i].g;
		global_palette[i].b = global_pal_copy[i].b;
	}
	getElem("colorcycle").value = 0;
	postColorChange();		
}

function doColorCycle(_amount) {
    var amount = 0;
    if (!_amount)
        amount = parseInt(getElem("colorcycle").value, 10);
    else
        amount = _amount;

	if (prev_cycle_val == amount)
		return;

	var direction = 1;
	if (prev_cycle_val > amount) {
		direction = -1;
	}
	prev_cycle_val = amount;

	var noCol0 = isColor0Locked();
    var start = 0;
	if (noCol0)
		start = 1;
    var or;
    var og;
    var ob;
	var lastIndex;
	if (direction >= 0) {
		or = global_palette[start].r;
		og = global_palette[start].g;
		ob = global_palette[start].b;
			for (var i = 0; i < global_palette.length - 1; i++) {
			ai = (start + i) % global_palette.length;
			an = (start + i + 1) % global_palette.length;
			if (noCol0 && (ai === 0))
				ai = 1;
			if (noCol0 && (an === 0))
				an = 1;
			global_palette[ai].r = global_palette[an].r;
			global_palette[ai].g = global_palette[an].g;
			global_palette[ai].b = global_palette[an].b;
		}
		lastIndex = (start + global_palette.length - 1) % global_palette.length;
		if (noCol0 && (lastIndex === 0))
			lastIndex = 1;
	} else {
		var idx = (start + global_palette.length - 1) % global_palette.length;
		if (noCol0 && (idx === 0))
			idx = 1;
		or = global_palette[idx].r;
		og = global_palette[idx].g;
		ob = global_palette[idx].b;
		for (var i = global_palette.length - 1; i > 0 ; i--) {
			ai = (start + i) % global_palette.length;
			an = (start + i - 1) % global_palette.length;
			while (an < 0)
				an += global_palette.length;
			if (noCol0 && (ai === 0))
				ai = 1;
			if (noCol0 && (an === 0))
				an = 1;
			global_palette[ai].r = global_palette[an].r;
			global_palette[ai].g = global_palette[an].g;
			global_palette[ai].b = global_palette[an].b;
		}
		lastIndex = 0;
		if (noCol0)
			lastIndex = 1;
	}
    global_palette[lastIndex].r = or;
    global_palette[lastIndex].g = og;
    global_palette[lastIndex].b = ob;
	postColorChange();
}

function postColorChange() {
	var read = 0;
	var write = 0;
	for (var y = 0; y < cropH; y++) {
		for (var x = 0; x < cropW; x++) {
			var index = pixelsPaletteIndex[read++];
			workImagePixels[write++] = global_palette[index].r;
			workImagePixels[write++] = global_palette[index].g;
			workImagePixels[write++] = global_palette[index].b;
			workImagePixels[write++] = 255;
		}
	}

	workImageData.data = workImagePixels;
	workContext.putImageData(workImageData, 0, 0);

	refreshPaletteInfo();
	buildViewImage(0);
}

function onNewColor(_index) {
    var iicol = getElem('colorBox_' + _index.toString()).value;
    while (iicol.charAt(0) === ' ' || iicol.charAt(0) === '#')
        iicol = iicol.substr(1);
    var iival = parseInt(iicol, 16);
    var r = (iival >> 16) & 255;
    var g = (iival >> 8) & 255;
    var b = (iival >> 0) & 255;
    global_palette[_index].r = r;
    global_palette[_index].g = g;
    global_palette[_index].b = b;
    postColorChange();
}


function isInGrabZone(x,y) {
	if (!viewCanvas)
		return false;
    var rect = viewCanvas.getBoundingClientRect();
	if (!rect)
		return false;

	if (grab_state === "progress")
		return true;
	
	if (x < rect.left) return false;
	if (y < rect.top) return false;
	if (x > rect.left + rect.width) return false;
	if (y > rect.top + rect.height) return false;
	return true;
}

function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
	var x = evt.clientX - rect.left;
	var y = evt.clientY - rect.top;
	var ret = rectToGrid(v(x), v(y) , 0, 0);

	return {
      x: v(ret.x),
      y: v(ret.y)
    };
}

function setTooltipPos(e, d) {
	d.left = (e.clientX + 10).toString()+"px";
	d.top = (e.clientY + 10).toString()+"px";
}

function onMouseDown(e) {
	if (isInGrabZone(e.clientX, e.clientY)) {
		if (getElemValue('grabMode') !== 'grabmode_none')
			viewCanvas.style.cursor = "crosshair";
		if (grab_state !== "done") {	
			var grabMode = getElem('grabMode').value;
			if (grabMode !== "grabmode_none") {
				grab_state = "progress";
				var m = getMousePos(viewCanvas,e);
				grab_startx = m.x;
				grab_starty = m.y;
	
				var elm = getElem('mouseFollow').style;
				elm.display = "block";
				setTooltipPos(e,elm);	
			}
		}	
	}
}

function onMouseUp(e) {
	if (isInGrabZone(e.clientX, e.clientY)) {
		viewCanvas.style.cursor = "default";
		if (grab_state !== "done") {	
			var grabMode = getElem('grabMode').value;
			if (grabMode !== "grabmode_none") {
				var m = getMousePos(viewCanvas,e);
				if (grab_state === "progress") {
					grab_state = "done";
					var parent = getElem('grabDone').parentNode.getBoundingClientRect();
					var elm = getElem('grabDone').style;
					elm.display = "block";
					elm.left = (e.clientX - parent.x).toString()+"px";
					elm.top = (e.clientY - parent.y).toString()+"px";
				} else {
					grab_state = "null";
				}
				if (grab_state !== "done") {	
					grab_startx = m.x;
					grab_starty = m.y;
				}
				grab_curx = m.x;
				grab_cury = m.y;
				var elm = getElem('mouseFollow').style;
				elm.display = "none";

				if (grab_curx < grab_startx) {
					var temp = grab_curx;
					grab_curx = grab_startx;
					grab_startx = temp;
				}
				if (grab_cury < grab_starty) {
					var temp = grab_cury;
					grab_cury = grab_starty;
					grab_starty = temp;
				}
			
			}	
		}
	}
}

function onMouseMove(e) {
	realMouseCoord.x = e.clientX;
	realMouseCoord.y = e.clientY;
	if (isInGrabZone(e.clientX, e.clientY)) {
		if (grab_state !== "done") {
			if (getElemValue('grabMode') !== 'grabmode_none')
				viewCanvas.style.cursor = "crosshair";
			var grabMode = getElem('grabMode').value;
			var m = getMousePos(viewCanvas,e);
			grab_curx = m.x;
			grab_cury = m.y;
			var elm = getElem('mouseFollow').style;
			setTooltipPos(e,elm);	
		}
	}
}

function onMouseClick(e) {
	if (grab_state !== "done") {
		grab_state = "null";
		getElem('mouseFollow').style.display = "none";
	}
	if (viewCanvas && viewCanvas.style)
		viewCanvas.style.cursor = "default";
}

function exitGrab() {
	grab_state = "null";
	getElem('mouseFollow').style.display = "none";
	getElem('grabDone').style.display = "none";
}

function editorOnEsc() {
	if (viewCanvas && viewCanvas.style)
		viewCanvas.style.cursor = "default";
	exitGrab();
	getElem('addFrame').style.display = "none";
	setElemValue('viewShow', 'viewShow_normal');
//	setElemValue('grabMode','grabmode_none');
	closePreview();
	inGrabContext = false;
}

function grabToView() {
	exitGrab();
	buildViewImage(0);
	addView(grab_startx, grab_starty, grab_curx - grab_startx, grab_cury - grab_starty, true);
	buildViewImage(0);
}



function rectToGrid(_x,_y,_w,_h) {
	var zoom = getElemInt10("zoom");
	var grabMode = getElem('grabMode').value;
	var step = 1;
	if (grabMode === "grabmode_2px")
		step = 2;
	else if (grabMode === "grabmode_4px")
	step = 4;
	else if (grabMode === "grabmode_8px")
		step = 8;
	else if (grabMode === "grabmode_16px")
		step = 16;
	else if (grabMode === "grabmode_32px")
		step = 32;
		
	var x = clampCoord(v(_x/zoom),step);
	var y = clampCoord(v(_y/zoom),step);
	var w = clampCoord(v(_w/zoom),step);
	var h = clampCoord(v(_h/zoom),step);

	return {x:x,y:y,w:w,h:h};
}

function updateXportValues() {
	inGrabContext = true;
	spriteWindow = {x: grab_startx, y:grab_starty, w:grab_curx - grab_startx, h:grab_cury - grab_starty};
	getElem('sprtC').value = v((spriteWindow.w+15) / 16);
	getElem('sprtH').value = spriteWindow.h;	
	getElem('bobC').value = 1;
	getElem('bobW').value = spriteWindow.w;	
	getElem('bobH').value = spriteWindow.h;	
}

function grabToSprites() {
	updateXportValues();
	getElem('viewShow').value='viewShow_sprites';
	//setElemValue('sprtSaveFrom', 'sprt_fromCur');
	window.location.href = "#saveSprite";
	exitGrab();
}

function grabToBobs() {
	updateXportValues();
	getElem('viewShow').value='viewShow_bobs';
	window.location.href = "#saveBobs";
	exitGrab();
}



function onPlatformChosen() {
    target_platform = getElem("platform").value;
	if (target_platform !== "target_OCS") {
		setElemValue('platform','target_OCS');
		//alert("Only Amiga OCS is supported for now. Other platforms are WIP...");
	}
}

function addFrame() {
	spriteWindow = {x: grab_startx, y:grab_starty, w:grab_curx - grab_startx, h:grab_cury - grab_starty};
	var e = {clientX:realMouseCoord.x, clientY:realMouseCoord.y};
	exitGrab();

	setElemValue('frameName', checkString(export_fileName)+"_"+(frames.length+1));
	setElemValue('frameX', spriteWindow.x);
	setElemValue('frameY', spriteWindow.y);
	setElemValue('frameW', spriteWindow.w);
	setElemValue('frameH', spriteWindow.h);

	var cvs = getElem('addFrameCanvas');
	var ctx = cvs.getContext('2d');
	cvs.width = spriteWindow.w;
	cvs.height = spriteWindow.h;
	ctx.width = spriteWindow.w;
	ctx.height = spriteWindow.h;
	ctx.imageSmoothingEnabled = false;
	ctx.drawImage(workCanvas, spriteWindow.x, spriteWindow.y, spriteWindow.w, spriteWindow.h, 0, 0, spriteWindow.w, spriteWindow.h);
	
	var elmnt = getElem('addFrame');
	var parent = elmnt.parentNode.getBoundingClientRect();
	var styl = elmnt.style;
	styl.display = "block";
	styl.left = (e.clientX - parent.x).toString()+"px";
	styl.top = (e.clientY - parent.y).toString()+"px";
}

function addFrameCancel() {
	var elmnt = getElem('addFrame');
	elmnt.style.display = "none";
}


function checkString(s) {
	s = s.replace(/\s/g, '_')
	s = s.replace(/;/g, '_');
	return s;
}

var curFrameIndex = 0;
function addFrameOk() {
	frames.push({
		label:checkString(getElemValue('frameName')),
		x:getElemInt10('frameX'),
		y:getElemInt10('frameY'),
		w:getElemInt10('frameW'),
		h:getElemInt10('frameH')
	}
	);
	addFrameCancel();
	curFrameIndex = frames.length - 1;
	buildFrames();
}



function deleteFrame() {
	frames.splice(curFrameIndex, 1);
	if (curFrameIndex > 0)
		curFrameIndex--;
	buildFrames();
}

function prevFrame() {
	if (curFrameIndex > 0)
		curFrameIndex--;
	buildFrames();
}

function nextFrame() {
	if (curFrameIndex < frames.length-1)
		curFrameIndex++;
	buildFrames();
}

function buildFrames() {
	if (frames.length == 0) {
		getElem('frames').style.display = 'none';
		return;
	}
	getElem('frames').style.display = 'block';
	var i = curFrameIndex;
	var cvs = getElem('framesCanvas');
	var ctx = cvs.getContext('2d');
	cvs.width = frames[i].w;
	cvs.height = frames[i].h;
	ctx.width = frames[i].w;
	ctx.height = frames[i].h;
	ctx.imageSmoothingEnabled = false;
	ctx.drawImage(workCanvas, frames[i].x, frames[i].y, frames[i].w, frames[i].h, 0, 0, frames[i].w, frames[i].h);
	setElemInner('curFrameLabel', frames[i].label + ', x:' + frames[i].x + ', y:' + frames[i].y + ', w:' + frames[i].w + ', h:' + frames[i].h);
}


function grabbedToSprites() {
	inGrabContext = true;
	spriteWindow = {x: grab_startx, y:grab_starty, w:grab_curx - grab_startx, h:grab_cury - grab_starty};
	setElemValue('sprtC', spriteWindow.w / 16); 
	setElemValue('sprtH', spriteWindow.h); 
	setElemValue('viewShow', 'viewShow_sprites');
	exitGrab();
	window.location.href = "#saveSprite";	
}

function onBobW() {
	if (inGrabContext) {
		var hCount = v(spriteWindow.w / getElemInt10('bobW'));
		var vCount = v(spriteWindow.h / getElemInt10('bobH'));
		setElemValue('bobC', hCount * vCount);
	} else {
		var hCount = v(cropW / getElemInt10('bobW'));
		var vCount = v(cropH / getElemInt10('bobH'));
		setElemValue('bobC', hCount * vCount);
	}
	buildViewImage();	
	previewBobs(true);
}

function onBobH() {
	if (inGrabContext) {
		var hCount = v(spriteWindow.w / getElemInt10('bobW'));
		var vCount = v(spriteWindow.h / getElemInt10('bobH'));
		setElemValue('bobC', hCount * vCount);
	} else {
		var hCount = v(cropW / getElemInt10('bobW'));
		var vCount = v(cropH / getElemInt10('bobH'));
		setElemValue('bobC', hCount * vCount);
	}
	buildViewImage();	
	previewBobs(true);
}

function onBobC() {
	buildViewImage();	
	previewBobs(true);
}

function onSprtH() {
	if (inGrabContext) {
		var hCount = v(spriteWindow.w / 16);
		var vCount = v(spriteWindow.h / getElemInt10('sprtH'));
		setElemValue('sprtC', hCount * vCount);
	}
	buildViewImage();	
	previewSprites(true);
}

function onSprtC() {
	buildViewImage();	
	previewSprites(true);
}

function onGrabCancelButton() {
	exitGrab();
	inGrabContext = false;	
}

function readSingleFile(e) {
	var file = e.target.files[0];
	if (!file) {
	  return;
	}
	chosenFileName = e.target.files[0].name;
	var reader = new FileReader();
	reader.onload = function(e) {
		document.getElementById('refImg').src = e.target.result;
		setTimeout(function() { onDrop(chosenFileName); }, 500);
	};
	reader.readAsDataURL(file);
}
  
function previewSprites(_updateOnly) {
	setElemValue('viewShow','viewShow_sprites');
	
	var zoom = v(parseInt(document.getElementById("zoom").value, 10));
	var cvs = getElem('previewCanvas');
	var ctx = cvs.getContext('2d');
	cvs.width = zoom * spriteWindow.w;
	cvs.height = zoom * spriteWindow.h;
	ctx.width = zoom * spriteWindow.w;
	ctx.height = zoom * spriteWindow.h;
	ctx.imageSmoothingEnabled = false;
	ctx.drawImage(workCanvas, spriteWindow.x, spriteWindow.y, spriteWindow.w, spriteWindow.h, 0, 0, zoom * spriteWindow.w, zoom * spriteWindow.h);


	var thisView = spriteWindow;
	var sprtC = getElemInt10('sprtC');
	var originalsprtC = sprtC;
	var maxsprtC = 0;
	var sprtH = zoom * getElemInt10('sprtH');
	var sprtW = zoom * 16;

	var startX = 0;
	var endX = startX + thisView.w * zoom;
	var startY = 0;
	var endY = startY + thisView.h * zoom;
	ctx.strokeStyle = "rgba(0,255,0,100)";
	for (var y = startY; y < endY; y += sprtH) {
		for (var x = startX; x < endX; x += sprtW) {
			if (sprtC > 0) {
				ctx.beginPath();
				ctx.moveTo(x,y);
				ctx.lineTo(x+sprtW,y);
				ctx.lineTo(x+sprtW,y+sprtH);
				ctx.lineTo(x,y+sprtH);
				ctx.lineTo(x,y);
				ctx.stroke();			
				sprtC--;	
			} else {
				ctx.fillRect(x,y,sprtW,sprtH);
			}
			maxsprtC++;
		}	
	}
	if (originalsprtC > maxsprtC) {
		setElemValue('sprtC', maxsprtC);
	}

	if (!_updateOnly) {
		var e = {clientX:realMouseCoord.x, clientY:realMouseCoord.y};
		var elm = getElem('preview').style;
		elm.display = "block";
		elm.left = (e.clientX + 10).toString()+"px";
		elm.top = (e.clientY  - v(ctx.height * 3/4)).toString()+"px";
	}
}

function previewBobs(_updateOnly) {
	setElemValue('viewShow','viewShow_bobs');

	var zoom = v(parseInt(document.getElementById("zoom").value, 10));
	var cvs = getElem('previewCanvas');
	var ctx = cvs.getContext('2d');
	cvs.width = zoom * spriteWindow.w;
	cvs.height = zoom * spriteWindow.h;
	ctx.width = zoom * spriteWindow.w;
	ctx.height = zoom * spriteWindow.h;
	ctx.imageSmoothingEnabled = false;
	ctx.drawImage(workCanvas, spriteWindow.x, spriteWindow.y, spriteWindow.w, spriteWindow.h, 0, 0, zoom * spriteWindow.w, zoom * spriteWindow.h);


	var thisView = spriteWindow;
	var sprtC = getElemInt10('bobC');
	var originalsprtC = sprtC;
	var maxsprtC = 0;
	var sprtH = zoom * getElemInt10('bobH');
	var sprtW = zoom * getElemInt10('bobW');

	var startX = 0;
	var endX = startX + thisView.w * zoom;
	var startY = 0;
	var endY = startY + thisView.h * zoom;
	ctx.strokeStyle = "rgba(0,255,0,100)";
	for (var y = startY; y < endY; y += sprtH) {
		for (var x = startX; x < endX; x += sprtW) {
			if (sprtC > 0) {
				ctx.beginPath();
				ctx.moveTo(x,y);
				ctx.lineTo(x+sprtW,y);
				ctx.lineTo(x+sprtW,y+sprtH);
				ctx.lineTo(x,y+sprtH);
				ctx.lineTo(x,y);
				ctx.stroke();			
				sprtC--;	
			} else {
				ctx.fillRect(x,y,sprtW,sprtH);
			}
			maxsprtC++;
		}	
	}
	if (originalsprtC > maxsprtC) {
		setElemValue('bobC', maxsprtC);
	}

	if (!_updateOnly) {
		var e = {clientX:realMouseCoord.x, clientY:realMouseCoord.y};
		var elm = getElem('preview').style;
		elm.display = "block";
		elm.left = (e.clientX + 10).toString()+"px";
		elm.top = (e.clientY  - v(ctx.height * 3/4)).toString()+"px";
	}
}

function closePreview() {
	var elm = getElem('preview').style;
	elm.display = "none";
}


function onNewFrameName() {
	var name = getElemValue('frameName');
	for (var i = 0;  i< frames.length; i++) {
		if (name === frames[i].label) {
			alert("label '" + name + "' already used for frame #" + i);
			setElemValue('frameName', name + "_2");
			rerturn;
		}
	}
}


function framesToSprites() {
	if (global_palette.length > 16) {
		alert("Can't export Sprites:  - Wrong palette size - Found " + global_palette.length + " colors, but the Sprites export supports 16 colors max.");
		return;
	}

	for (var i = 0; i < frames.length; i++) {
		var f = frames[i];
		if (f.w > 16) {
			alert("In grab frames mode, sprites must be 16 pix wide maximum, but frame #" + i + " (" + f.label + ") is " + f.w + " pix wide" );
			return;
		}
	}

	inGrabContext = true;
	spriteWindow = {x: grab_startx, y:grab_starty, w:grab_curx - grab_startx, h:grab_cury - grab_starty};
	setElemValue('sprtC', 1);
	setElemValue('sprtH', spriteWindow.h);
	setElemValue('viewShow','viewShow_sprites');
	setElemChecked('includeCtrl', true);
	setElemValue('sprtMode','sprtASM');
	setElemChecked('includePal', false);

	startSaveSession();
	for (var i = 0; i < frames.length; i++) {
		var f = frames[i];
		spriteWindow = {x:f.x, y:f.y, w:f.w, h:f.h, label:f.label};
		saveSprite({x:f.x, y:f.y, w:f.w, h:f.h, label:f.label});
	}
	saveSession += export_fileName + "_palette:\n";			
	saveSession = savePalette(saveSession) + "\n\n";

	endSaveSession();
	
	exitGrab();
}

function framesToBobs() {
	alert("Not yet implemented. life is cruel. Reach me on FaceBook or comment on Pouet if you need this one!");
	return;
	if (global_palette.length > 32) {
		alert("Can't export Bobs:  - Wrong palette size - Found " + global_palette.length + " colors, but the Bobs export supports 32 colors max. You can only use 'Save RGB' with this image .");
		return;
	}

	inGrabContext = true;
	spriteWindow = {x: grab_startx, y:grab_starty, w:grab_curx - grab_startx, h:grab_cury - grab_starty};
	setElemValue('bobC', 1);
	setElemValue('bobW', spriteWindow.w);
	setElemValue('bobH', spriteWindow.h);
	setElemValue('viewShow','viewShow_bobs');
	setElemValue('bobMode','bobASM');
	setElemChecked('bobIncludePal', false);
	
	startSaveSession();
	for (var i = 0; i < frames.length; i++) {
		var f = frames[i];
		spriteWindow = {x:f.x, y:f.y, w:f.w, h:f.h, label:f.label};
		saveBob({x:f.x, y:f.y, w:f.w, h:f.h, label:f.label});
	}
	saveSession += export_fileName + "_palette:\n";			
	saveSession = savePalette(saveSession) + "\n\n";

	endSaveSession();
	
	exitGrab();
}


function getBuffer(fileData) {
	return function(resolve) {
	  var reader = new FileReader();
	  reader.readAsArrayBuffer(fileData);
	  reader.onload = function() {
		var arrayBuffer = reader.result
		var bytes = new Uint8Array(arrayBuffer);
		resolve(bytes);
	  }
  }
}

function importPalette() {
	var mode = getElemValue('loadpalettefrom');
	if (mode === 'loadpalettefrom_binary') {
		let input = document.createElement('input');
		input.type = 'file';
		input.onchange = _ => {
				  let files =   Array.from(input.files);
				  fileData = new Blob([files[0]]);
				  // Pass getBuffer to promise.
				  var promise = new Promise(getBuffer(fileData));
				  // Wait for promise to be resolved, or log error.
				  promise.then(function(data) {
					remapPaletteFromBin(data);
				  }).catch(function(err) {
					console.log('Error: ',err);
				  });
		};
		input.click();	
	} else if (mode === 'loadpalettefrom_asm') {
		let input = document.createElement('input');
		input.type = 'file';
		input.onchange = _ => {
				  let files =   Array.from(input.files);
				  var reader = new FileReader();
				  reader.onload = function(e) {
					  remapPaletteFromText(e.target.result);
				  };
				  reader.readAsText(files[0]);
		};
		input.click();	
		} else if (mode === 'loadpalettefrom_clip') {
			navigator.clipboard.readText()
			.then(text => {
				remapPaletteFromText(text);
			})
			.catch(err => {
			  alert('Failed to read clipboard contents: ', err);
			});
		} else {
			alert('unknow load palette mode');
		}
}


function getTextLine(_t) {
	ret = "";
	while(_t.index < _t.chars.length) {
		var c = _t.chars[_t.index++];
		if (c === '\n')
			break;
		if (c === ';')
		break;
		if (
			(c === ' ') ||
			(c === '\t')
		)
			continue;
		ret += c;
	}
	if ((ret.length < 2) && (_t.index >= _t.chars.length-1))
		_t.over = true;
	return ret;
}

function isHexChar(_c) {
	switch(_c) {
		case '0' : return true;
		case '1' : return true;
		case '2' : return true;
		case '3' : return true;
		case '4' : return true;
		case '5' : return true;
		case '6' : return true;
		case '7' : return true;
		case '8' : return true;
		case '9' : return true;
		case 'a' : return true;
		case 'A' : return true;
		case 'b' : return true;
		case 'B' : return true;
		case 'c' : return true;
		case 'C' : return true;
		case 'd' : return true;
		case 'D' : return true;
		case 'e' : return true;
		case 'E' : return true;
		case 'f' : return true;
		case 'F' : return true;
		default: return false;
	}
}

function remapPaletteFromText(_text) {
	global_palette = [];
	var txt = {index:0,chars:_text,over:false,writeIndex:0};
	var lineNum = -1;
	while (true) {
		lineNum++;
		chars = getTextLine(txt);
		if (txt.over)
			break;
		// find dc.w
		var ok = false;
		var index = 0;
		if (chars[index] == 0)
			break;
		if (
			((chars[index] === 'd') || (chars[index] === 'D')) &&
			((chars[index + 1] === 'c') || (chars[index + 1] === 'C')) &&
			(chars[index + 2] === '.') &&
			((chars[index + 3] === 'w') || (chars[index + 3] === 'W'))
		) {
			ok = true;
		}
		index += 4;
		if (!ok) {
			continue;
		}
		while(index < chars.length) {
			// find the next number
			if (chars[index] == ',') {
				index++;
				continue;
			}

			if (chars[index++] !== '$')
			{
				alert("expected '$' after dc.w at line " + lineNum);
				continue;
			}
			var num = "";
			while (index < chars.length) {
				if (isHexChar(chars[index]))
				{
					num += chars[index];
				} else break;
				index++;
			}
			
			var hexnum = parseInt(num,16);
			if (isNaN(hexnum)) {
				alert("expected hex number after '$' at line " + lineNum + " but found: " + num);
				continue;
			}
			var b = hexnum & 15;
			var g = (hexnum>>4) & 15;
			var r = (hexnum>>8) & 15;
			global_palette.push({r:r<<4,g:g<<4,b:b<<4});
		}
	}
	postPaletteUpdate();
}

function remapPaletteFromBin(_bin) {
	var index = 0;
	global_palette = [];
	while (index < _bin.length) {
		var r = v(_bin[index++]) & 15;
		var g = v(_bin[index++]);
		b = g & 15;
		g = (g >> 4) & 15;
		global_palette.push({r:r<<4,g:g<<4,b:b<<4});
	}

	postPaletteUpdate();
}


function postPaletteUpdate() {
	pixelsPaletteIndex = new Uint8Array(cropW * cropH);
	var write = 0;
	var read = 0;
	for (var y = 0; y < cropH; y++) {
		for (var x = 0; x < cropW; x++) {
			var ir = workImagePixels[read];
			var ig = workImagePixels[read+1];
			var ib = workImagePixels[read+2];
			read += 4;
			pixelsPaletteIndex[write++] = findNearesIndexInPalette(ir, ig, ib);
		}
	}
	
	var read = 0;
	var write = 0;
	for (var y = 0; y < cropH; y++) {
		for (var x = 0; x < cropW; x++) {
			var index = pixelsPaletteIndex[read++];
			var col = global_palette[index];
			workImagePixels[write] = col.r;
			workImagePixels[write+1] = col.g;
			workImagePixels[write+2] = col.b;
			write += 4;
		}
	}	
	workImageData.data = workImagePixels;
	workContext.putImageData(workImageData, 0, 0);
	refreshPaletteInfo();	
}
