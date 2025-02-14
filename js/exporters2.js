function genSpriteCtrlWords(x,y,h, attached) {	
	var HSTART = v(x + getElemInt10('sprtOfsX'));
	var VSTART = v(y + getElemInt10('sprtOfsY'));
	var VSTOP  = v(VSTART + h);

	// SPRxPOS:
	var pos = 0;
	// Bits 0-7 contain the high 8 bits of HSTART
	pos |= (HSTART >> 1) & 255;
	// Bits 8-15 contain the low 8 bits of VSTART
	pos |= (VSTART & 255) << 8;


	// SPRxCTL:
	var ctl = 0;
	// Bit 0           The HSTART low bit
	ctl |= HSTART & 1;
	// Bit 1           The VSTOP high bit (bit 9)
	ctl |= ((VSTOP >> 8) & 1) << 1;
	// Bit 2           The VSTART high bit (bit 9)
	ctl |= ((VSTART >> 8) & 1) << 2;
	// Bits 6-3        Unused (make zero)
	// Bit 7           (Used in attachment)
	if (attached)
		ctl |= 1 << 7;
	// Bits 15-8       The low eight bits of VSTOP
	ctl |= (VSTOP & 255) << 8;

	return {pos:pos, ctl:ctl};
}




function getChunkyPix(x,y) {
	if (x < 0) return 0;
	if (y < 0) return 0;
	if (x >= cropW) return 0;
	if (y >= cropH) return 0;
	return pixelsPaletteIndex[x + y * cropW];
}


var saveSession = null;

function startSaveSession() {
	var d = new Date();
	saveSession = ";\tGrab export from file: " +  export_fileName + "\n;\t" + d + "\n";	
}

function endSaveSession() {
	if (!saveSession)
		return;
	var blob = new Blob([saveSession], { type: "text/plain;charset=utf-8" });
	var fileName = export_fileName + ".asm";
	saveAs(blob, fileName);	
	saveSession = null;
}

function SprtWordsToArray(_data, _writeIndex, _words) {
	_data[_writeIndex++] = (_words.pos>>8)&255;
	_data[_writeIndex++] = _words.pos&255;
	_data[_writeIndex++] = (_words.ctl>>8)&255;
	_data[_writeIndex++] = _words.ctl&255;
	return _writeIndex;
}

function saveSprite(_saveWindow) {
	setElemValue('viewShow','viewShow_sprites');
	
	if (!_saveWindow) {
		if (!spriteWindow)
			_saveWindow = {x:0, y:0, w:workCanvas.width, h:workCanvas.height};
		else {
			_saveWindow = {x:spriteWindow.x, y:spriteWindow.y, w:spriteWindow.w, h:spriteWindow.h};
		}
	}
	if (!_saveWindow.label)
		_saveWindow.label = getElemValue('sprtName');

	var sprtScrX	= 0;
	var sprtScrY	= 0;
	var includeCtrl	= isElemChecked('includeCtrl');
	if (includeCtrl) {
		sprtScrX	= getElemInt10('sprtScrX');
		sprtScrY	= getElemInt10('sprtScrY');	
	}
	var includeDMAStop = isElemChecked('includeDMAStop');
	var includePal	= isElemChecked('includePal');
	var skpEmpty	= isElemChecked('skpEmpty');
	var sprtC		= getElemInt10('sprtC');
    var mode 		= getElemValue('sprtMode');
	
	var paletteNumEntries = global_palette.length;
	var attached = false;
	if (paletteNumEntries >	 4) {
		if (paletteNumEntries >	 16) {
			alert("Can't export Sprites:  - Wrong palette size - Found " + paletteNumEntries + " colors, but the Sprites export supports 16 colors max.");
			return;
		}
		attached = true;
	}

	var xportASM = false;
	var xportC = false;
	var singleBin = false;
	var multipleBin = false;
    if (mode === "sprtASM") xportASM = true;
    else if (mode === "sprt1C") xportC = true;
    else if (mode === "sprtBin") { xportASM = false; multipleBin = true;}
    else if (mode === "sprt1Bin") {
		xportASM = false;
		singleBin = true;
	}
    else alert("unknown Sprite export mode: " + mode);

	var zip = null;
    if (multipleBin) {
		zip = new JSZip();
	}

	if (includePal && (!xportASM) && (!xportC)) {
		alert("Palette can't be exported with sprites in binary mode. Use the \"Save Palette\" button instead");
		return;
	}

	var d = new Date();
	var singleBinFAT = ";\tSprites export from file: " +  export_fileName + "\n";
	singleBinFAT += ";" +  d.toString() + "\n";
	singleBinFAT += "\tifnd    SPRITES_FAT_I\n";
	singleBinFAT += "SPRITES_FAT_I\tEQU\t1\n";
	singleBinFAT += "SPRITE_HEIGHT\tEQU\t" +  _saveWindow.w.toString() + "\n\n;Sprite offsets:\n";
	
	var save2Clipboard = false;
	var mode2 = document.getElementById("sprtSaveTo").value;
	if (mode2 === "sprt_clipBoard") {
		if ((mode === "sprtBin") || (mode === "sprt1Bin"))
			alert("can't save binary sprite to clipboard.");
		else
			save2Clipboard = true;
	}

	var sprtName = _saveWindow.label;

	var sprtH = getElemInt10('sprtH');
	

	var bitplaneHeight = _saveWindow.h;

	var w;
	var writeSpr0Low;
	var writeSpr0High;
	var writeSpr1Low;
	var writeSpr1High;
	var img = pixelsPaletteIndex;
	var data;
	var data1;
	var writeIndex = 0;
	var writeIndex1 = 0;
	var coveredWidth = 0;
	var coveredHeight = 0;
	var d = new Date();
	var asmStr = ";\tSrpite(s) export from file: " +  export_fileName + "\n";
	asmStr += ";\t" +  d.toString() + "\n\n\tdata_c\n\n";
	var cStr = "//\tSrpite(s) export from file: " +  export_fileName + "\n";
	cStr += "//\t" +  d.toString() + "\n\n";
	var allExported = ";\texportedSprites:\tdc.l ";
	var exportNumber = 0;

	var binSize = 0;
	var xtraBytesPerSprite = 0;
	if (includeCtrl) xtraBytesPerSprite += 4;
	if (includeDMAStop) xtraBytesPerSprite += 4;
	if (singleBin) {
		binSize = sprtC * (4 * bitplaneHeight + xtraBytesPerSprite);
		data = new Uint8Array(binSize);
		data.fill(0);
		data1 = new Uint8Array(binSize);
		data1.fill(0);
		writeIndex = 0;
		writeIndex1 = 0;
	}


	while (coveredHeight < _saveWindow.h) {
		while (coveredWidth < _saveWindow.w) {
			var thisName = sprtName;
			if (!saveSession)
				thisName += "_" + exportNumber;
			exportNumber++;
			var sprtStr = thisName;
			var sprtAttachedStr = thisName + "_attached";
			var sprtCStr = "unsigned short " + thisName + "[] = {\n";
			var sprtAttachedCStr = "unsigned short " + thisName + "_attached[] = {\n";
			if (coveredWidth > 0)
				allExported += ", ";
			allExported += sprtStr;
			if (attached) allExported += ", " + sprtAttachedStr;
			sprtStr += ":\n";
			sprtAttachedStr += ":\n";
			singleBinFAT += thisName + "\tEQU\t" + writeIndex + "\n";
			if (attached)
				singleBinFAT += thisName + "_attached\tEQU\t" + (writeIndex + binSize) + "\n";
			if (singleBin) {
				if (includeCtrl) {
					var words = genSpriteCtrlWords(coveredWidth + sprtScrX, coveredHeight + sprtScrY, sprtH, false);
					writeIndex = SprtWordsToArray(data, writeIndex, words);
					words = genSpriteCtrlWords(coveredWidth + sprtScrX, coveredHeight + sprtScrY, sprtH, attached);
					writeIndex1 = SprtWordsToArray(data1, writeIndex1, words);
				}
			} else {
				data = new Uint8Array(4 * bitplaneHeight + xtraBytesPerSprite);
				data.fill(0);
				data1 = new Uint8Array(4 * bitplaneHeight + xtraBytesPerSprite);
				data1.fill(0);
				if (includeCtrl) {
					var words = genSpriteCtrlWords(coveredWidth + sprtScrX, coveredHeight + sprtScrY, sprtH, false);
					sprtStr += "\tdc.w\t$" + v(words.pos & 65535).toString(16) + ", $" + v(words.ctl & 65535).toString(16) + "\t; control words\n";
					sprtCStr += "\t0x" + v(words.pos & 65535).toString(16) + ",0x" + v(words.ctl & 65535).toString(16) + ",\t// control words\n";
					writeIndex = SprtWordsToArray(data, writeIndex, words);
					words = genSpriteCtrlWords(coveredWidth + sprtScrX, coveredHeight + sprtScrY, sprtH, attached);
					sprtAttachedStr += "\tdc.w\t$" + v(words.pos & 65535).toString(16) + ", $" + v(words.ctl & 65535).toString(16) + "\t; control words\n";
					sprtAttachedCStr += "\t0x" + v(words.pos & 65535).toString(16) + ",0x" + v(words.ctl & 65535).toString(16) + ",\t// control words\n";
					writeIndex1 = SprtWordsToArray(data1, writeIndex1, words);
				}
			}
	
			var hasData = false;
			for (var lineIndex = 0; lineIndex < sprtH; lineIndex++) {
				writeSpr0Low = 0;
				writeSpr0High = 0;
				writeSpr1Low = 0;
				writeSpr1High = 0;
				for (var x = 0; x < 8; x++) {
					var bitindex = 7 - x;
					var col = getChunkyPix(coveredWidth + x + _saveWindow.x, coveredHeight + lineIndex + _saveWindow.y);
					writeSpr0Low |= (col & 1) << bitindex;
					writeSpr0High |= ((col & 2)>>1) << bitindex;
					writeSpr1Low |= ((col & 4)>>2) << bitindex;
					writeSpr1High |= ((col & 8)>>3) << bitindex;
				}
				writeSpr0Low <<= 8;
				writeSpr0High <<= 8;
				writeSpr1Low <<= 8;
				writeSpr1High <<= 8;
				for (var x = 0; x < 8; x++) {
					var bitindex = 7 - x;
					var col = getChunkyPix(coveredWidth + x + _saveWindow.x + 8, coveredHeight + lineIndex + _saveWindow.y);
					writeSpr0Low |= (col & 1) << bitindex;
					writeSpr0High |= ((col & 2)>>1) << bitindex;
					writeSpr1Low |= ((col & 4)>>2) << bitindex;
					writeSpr1High |= ((col & 8)>>3) << bitindex;
				}

				if ((writeSpr0Low !== 0) ||
					(writeSpr0High !== 0) ||
					(writeSpr1Low !== 0) ||
					(writeSpr1High !== 0))
				{
					hasData = true;
				}
				sprtStr += "\tdc.w\t";
				sprtCStr += "\t";
				w = writeSpr0Low >> 8;
				sprtStr += "$"+TwoCharStringHEX(w);
				sprtCStr += "0x"+TwoCharStringHEX(w);
				data[writeIndex++] = w;
				w = writeSpr0Low & 0xff;
				sprtStr += TwoCharStringHEX(w)+", ";
				sprtCStr += TwoCharStringHEX(w)+",";
				data[writeIndex++] = w;
				w = writeSpr0High >> 8;
				sprtStr += "$"+TwoCharStringHEX(w);
				sprtCStr += "0x"+TwoCharStringHEX(w);
				data[writeIndex++] = w;
				w = writeSpr0High & 0xff;
				
				sprtStr += TwoCharStringHEX(w)+"\n";
				sprtCStr += TwoCharStringHEX(w);
				if ((lineIndex !== sprtH-1) || (includeDMAStop))
					sprtCStr += ",";
				sprtCStr += "\n";

				data[writeIndex++] = w;

				sprtAttachedStr += "\tdc.w\t";
				sprtAttachedCStr += "\t";
				w = writeSpr1Low >> 8;
				sprtAttachedStr += "$"+TwoCharStringHEX(w);
				sprtAttachedCStr += "0x"+TwoCharStringHEX(w);
				data1[writeIndex1++] = w;
				w = writeSpr1Low & 0xff;
				sprtAttachedStr += TwoCharStringHEX(w)+", ";
				sprtAttachedCStr += TwoCharStringHEX(w)+",";
				data1[writeIndex1++] = w;
				w = writeSpr1High >> 8;
				sprtAttachedStr += "$"+TwoCharStringHEX(w);
				sprtAttachedCStr += "0x"+TwoCharStringHEX(w);
				data1[writeIndex1++] = w;
				w = writeSpr1High & 0xff;
				sprtAttachedStr += TwoCharStringHEX(w)+"\n";

				sprtAttachedCStr += TwoCharStringHEX(w);
				if (lineIndex !== sprtH-1)
					sprtAttachedCStr += ",";
				sprtAttachedCStr += "\n";
				data1[writeIndex1++] = w;
			}
			if (includeDMAStop) {
				sprtStr += "\tdc.w\t$0000, $0000\t; stop DMA";
				sprtAttachedStr += "\tdc.w\t$0000, $0000\t; stop DMA";
				sprtCStr += "\t0x0000,0x0000\t// stop DMA\n";
				sprtAttachedCStr += "\t0x0000,0x0000\t// stop DMA\n";
				data[writeIndex++] = 0;
				data[writeIndex++] = 0;
				data[writeIndex++] = 0;
				data[writeIndex++] = 0;
				data1[writeIndex1++] = 0;
				data1[writeIndex1++] = 0;
				data1[writeIndex1++] = 0;
				data1[writeIndex1++] = 0;
			}

			if (saveSession) {
				saveSession += sprtStr + "\n";
				if (attached)
					saveSession += sprtAttachedStr + "\n";
				saveSession += ";========================================\n\n";
			} else {
				if ((!skpEmpty) || (hasData)) {
					if (xportASM) {
						asmStr += sprtStr + "\n";
						if (attached)
							asmStr += sprtAttachedStr + "\n";
						asmStr += ";========================================\n\n";
					} else if (xportC) {
						cStr += sprtCStr + '\n';
						if (attached)
							cStr += sprtAttachedCStr + "\n";
						cStr += "};\n//========================================\n\n";
					} else if (!singleBin){
						var blob = new Blob([data], {type: "application/octet-stream"});
						var fileName = thisName + ".bin";
						if (zip) zip.file(fileName, blob);
						else saveAs(blob, fileName);	
		
						if (attached) {
							var blob = new Blob([data1], {type: "application/octet-stream"});
							var fileName = thisName + "_attached.bin";
							if (zip) zip.file(fileName, blob);
							else saveAs(blob, fileName);	
						}
					}	
				}	
			}
			coveredWidth += 16;
			sprtC--;
			if (sprtC <= 0)
				break;
		}
		coveredHeight += sprtH;
		if (sprtC <= 0)
			break;
}

if (zip) {
	zip.generateAsync({type:"blob"}).then(function (blob) {saveAs(blob, export_fileName+".zip");});
}



if (saveSession)
	return;

	if (xportASM){
		if (includePal) {
			var palStr = sprtName + "_palette:\n";			
			asmStr += savePalette(palStr) + "\n\n";
		}
		asmStr += "\n\n" + allExported;	
		if (save2Clipboard) {
			copyStringToClipboard(asmStr);
			alert("done copying the Sprite data to the clipboard");
		} else {
			var blob = new Blob([asmStr], { type: "text/plain;charset=utf-8" });
			var fileName = sprtName + ".asm";
			saveAs(blob, fileName);	
		}
	} if (xportC) {
		if (includePal) {
			var palStr = "unsigned short " + sprtName + "_palette[] = {\n";			
			cStr += savePaletteC(palStr) + "};\n\n";
		}
		if (save2Clipboard) {
			copyStringToClipboard(cStr);
			alert("done copying the Sprite data to the clipboard");
		} else {
			var blob = new Blob([cStr], { type: "text/plain;charset=utf-8" });
			var fileName = sprtName + ".c";
			saveAs(blob, fileName);	
		}
	} else {
		if (singleBin){
			if (attached) {
				var mergedArray = new Uint8Array(data.length + data1.length);
				mergedArray.set(data);
				mergedArray.set(data1, data.length);
				data = mergedArray;
			}
			var blob = new Blob([data], {type: "application/octet-stream"});
			var fileName = sprtName + ".bin";
			saveAs(blob, fileName);
			singleBinFAT += "\tendc\n";
			var blob = new Blob([singleBinFAT], { type: "text/plain;charset=utf-8" });
			var fileName = sprtName + "_FAT.i";
			saveAs(blob, fileName);
		}	
	}
}


function saveBobs(_saveWindow) {
	setElemValue('viewShow','viewShow_bobs');

	if (!_saveWindow) {
		if (!spriteWindow)
			_saveWindow = {x:0, y:0, w:workCanvas.width, h:workCanvas.height};
		else {
			_saveWindow = {x:spriteWindow.x, y:spriteWindow.y, w:spriteWindow.w, h:spriteWindow.h};
		}
	}
	if (!_saveWindow.label)
		_saveWindow.label = getElemValue('bobName');

	if (global_palette.length > 32) {
		alert("Can't export Bobs:  - Wrong palette size - Found " + global_palette.length + " colors, but the Bobs export supports 32 colors max. You can only use 'Save RGB' with this image .");
		return;
	}

	var save2Clipboard = false;
	var mode2 = getElemValue("bobSaveTo");
	if (mode2 === "bob_clipBoard") {
		if ((mode === "bobBin") || (mode === "bobSingleBin"))
			alert("can't save binary Bob to clipboard.");
		else
			save2Clipboard = true;
	}

	var bobW = parseInt(document.getElementById('bobW').value,10);
	var bobH = parseInt(document.getElementById('bobH').value,10);
	var bobC = parseInt(document.getElementById('bobC').value,10);
	var bobName = _saveWindow.label;
	var includePal = document.getElementById('bobIncludePal').checked;
	var interleave = document.getElementById('bobInterlace').checked;
	var bobSkpEmpty = document.getElementById('bobSkpEmpty').checked;

	const XPORT_ASM = 0;
	const XPORT_MULTIPLE_BIN = 1;
	const XPORT_SINGLE_BIN = 2;
	const XPORT_C = 3;

	var zip = null;
	var xportMode = XPORT_ASM;
    var mode = document.getElementById("bobMode").value;
    if (mode === "bobASM") xportMode = XPORT_ASM;
    else if (mode === "bobBin") {
		xportMode = XPORT_MULTIPLE_BIN;
		zip = new JSZip();
	}
    else if (mode === "bobSingleBin") xportMode = XPORT_SINGLE_BIN;
    else if (mode === "bob1C") xportMode = XPORT_C;
    else {
		alert("unknown Bob export mode: " + mode + ". Fallbacking to .asm mode");
		xportMode = XPORT_ASM;
	}

	if ((bobW&7)!=0) {
		alert(" - ABORTING - WRONG BOB WIDTH - SHOULD BE A MULTIPLE OF 8 - FOUND: " + bobW + " PIX WIDTH.");
		return;
	}

	var bytesPerLine = v(bobW/8);
	var bplSize = v(bobH * bytesPerLine);

	var bitplanesCount = 0;
	var colCount = global_palette.length;
	var startCol = 0;
	if (isColor0Locked()) {
		startCol = 1;
		colCount--;
	}

	if (colCount > 16 ) bitplanesCount = 5;
	else if (colCount > 8) bitplanesCount = 4;
	else if (colCount > 4) bitplanesCount = 3;
	else if (colCount > 2) bitplanesCount = 2;
	else if (colCount > 0) bitplanesCount = 1;

	var asmStr = ";\tBob(s) export from file: " +  export_fileName + "\n";
	var d = new Date();
	asmStr += ";\t" +  d.toString() + "\n\n\tdata_c\n\n";
	var allExported = ";\texportedBobs:\tdc.l ";

	var CStr = "//\tBob(s) export from file: " +  export_fileName + "\n";
	CStr += "//\t" +  d.toString() + "\n\n";

	var singleBitplanesData = null;
	if (includePal) {
		singleBitplanesData = new Uint8Array(bobC * bitplanesCount * bplSize + global_palette.length * 2);
	} else {
		singleBitplanesData = new Uint8Array(bobC * bitplanesCount * bplSize);
	}

	singleBitplanesData.fill(0);
	var singleWriteIndex = 0;	
	var singleBinFAT = ";\tBob(s) export from file: " +  export_fileName + "\n";
	singleBinFAT += ";" +  d.toString() + "\n\n;Bob offsets:\n";

	var curStartY = 0;
	var exportNumber = 0;
	while(curStartY < _saveWindow.h) {
		var curStartX = 0;
		while(curStartX < _saveWindow.w) {
			var bitplanesData = new Uint8Array(bitplanesCount * bplSize);
			bitplanesData.fill(0);
			var writeIndex = 0;
			var hasData = false;
		
			var thisName = bobName;
			if (!saveSession)
				thisName += "_" + exportNumber;
			exportNumber++;

			var bobStr = thisName;
			if (curStartX > 0)
				allExported += ", ";
			allExported += bobStr + ", ";
			bobStr += ":\t;" +  bobW + "*" + bobH + " pix, " + bitplanesCount + " bitplanes\n";

			var bobCStr = "unsigned char " + thisName + "[] = {\t//" +  bobW + "*" + bobH + " pix, " + bitplanesCount + " bitplanes\n";
			
			if (interleave) {
				for (var y = 0; y < bobH; y++)
				{
					for (var iBpl = 0; iBpl < bitplanesCount; iBpl++) {
						var bplMask = 1 << iBpl;
						var xmask = 128;
						var thisByte = 0;
						for (var x = 0; x < bobW; x++)
						{
							var col = getChunkyPix(curStartX + x + _saveWindow.x, curStartY + y + _saveWindow.y);
							if ((col & bplMask) !== 0) {
								thisByte |= xmask;
							}
							xmask /= 2;
							if ((x & 7) === 7) {
								if (xmask !== 0.5)
									alert("xmask error");
								if (thisByte !== 0) {
									hasData = true;
								}
								bitplanesData[writeIndex++] = thisByte;
								xmask = 128;
								thisByte = 0;
							}
						}
					}
				}
			} else {
				for (var iBpl = 0; iBpl < bitplanesCount; iBpl++) {
					var bplMask = 1 << iBpl;
					for (var y = 0; y < bobH; y++)
					{
						var xmask = 128;
						var thisByte = 0;
						for (var x = 0; x < bobW; x++)
						{
							var col = getChunkyPix(curStartX + x + _saveWindow.x, curStartY + y + _saveWindow.y);
							if ((col & bplMask) !== 0) {
								thisByte |= xmask;
							}
							xmask /= 2;
							if ((x & 7) === 7) {
								if (xmask !== 0.5)
									alert("xmask error");
								if (thisByte !== 0) {
									hasData = true;
								}
								bitplanesData[writeIndex++] = thisByte;
								xmask = 128;
								thisByte = 0;
							}
						}
					}
				}	
			}
			var fileName = thisName;
			if (hasData || (!bobSkpEmpty)) {
				asmData = bitplanesData;
				if (xportMode === XPORT_MULTIPLE_BIN) {
					var blob = new Blob([bitplanesData], {type: "application/octet-stream"});
					var fname = fileName + ".bin";
					zip.file(fname, blob);
					//saveAs(blob, fname);
				}
				if ((xportMode === XPORT_ASM) || (xportMode === XPORT_C)) {
					for (var dump = 0; dump < asmData.length; dump++) {
						var mod = dump % bytesPerLine;
						if (mod === 0) {
							bobStr += "\n\tdc.b\t";
							bobCStr += "\n\t";
						}
						bobStr += "$"+TwoCharStringHEX(asmData[dump]);
						bobCStr += "0x"+TwoCharStringHEX(asmData[dump]);
						if ((mod !== bytesPerLine - 1) && (dump < asmData.length-1)) {
							bobStr += ",";
						}	
						if (dump < asmData.length-1) {
							bobCStr += ",";
						}	
					}
					asmStr += bobStr + "\n";
					asmStr += ";========================================\n\n";
					CStr += bobCStr + "\n";
					CStr += "};\n\t========================================\n\n";
				} else if (xportMode === XPORT_SINGLE_BIN) {
					singleBinFAT += fileName + "\tEQU\t" + singleWriteIndex + "\n";
					for (var cpy = 0; cpy < asmData.length; cpy++) {
						singleBitplanesData[singleWriteIndex++] = asmData[cpy];
					}
				}
			}
			bobC--;
			if (bobC <= 0) {
				break;
			}
			curStartX += bobW;
		}
		if (bobC <= 0) {
			break;
		}
		curStartY += bobH;
	}
	if (zip) {
		zip.generateAsync({type:"blob"}).then(function (blob) {saveAs(blob, export_fileName+".zip");});
	}

	if (xportMode === XPORT_ASM){
		if (includePal) {
			var palStr = bobName + "_palette:\n";			
			asmStr += savePalette(palStr) + "\n\n";
		}
		asmStr += "\n\n" + allExported;
		if (save2Clipboard) {
			copyStringToClipboard(asmStr);
			alert("done copying the Bob data to the clipboard");
		} else {		
			var blob = new Blob([asmStr], { type: "text/plain;charset=utf-8" });
			var fileName = bobName + ".asm";
			saveAs(blob, fileName);
		}
	} else if (xportMode === XPORT_C){
		if (includePal) {
			var palStr = "unsigned short " + bobName + "_palette[] = {\n";			
			CStr += savePaletteC(palStr) + "};\n\n";
		}
		if (save2Clipboard) {
			copyStringToClipboard(CStr);
			alert("done copying the Bob data to the clipboard");
		} else {		
			var blob = new Blob([CStr], { type: "text/plain;charset=utf-8" });
			var fileName = bobName + ".asm";
			saveAs(blob, fileName);
		}
	}
	else if (xportMode === XPORT_SINGLE_BIN) {
		if (includePal) {
			singleBinFAT += "\n"+ bobName + "_palette\tEQU\t" + singleWriteIndex;
			var startCol = 0;
			if (isColor0Locked()) {
				startCol = 1;
			}
			for (var i = startCol; i < global_palette.length; i++)
			{
				var r = nearest(global_palette[i].r);
				var g = nearest(global_palette[i].g);
				var b = nearest(global_palette[i].b);
				var ar = v(v(r>>4)&15);
				var ab = v(v(b>>4)&15);
					
				singleBitplanesData[singleWriteIndex++] = v(ar);
				singleBitplanesData[singleWriteIndex++] = v(ab | g);
			}
		}
		singleBinFAT += "\n"+ bobName + "_END\tEQU\t" + singleWriteIndex;
		var blob = new Blob([singleBinFAT], { type: "text/plain;charset=utf-8" });
		var fileName = bobName + "_FAT.i";
		saveAs(blob, fileName);

		var fileName2 = bobName + ".bin";
		var blob2 = new Blob([singleBitplanesData], {type: "application/octet-stream"});
		saveAs(blob2, fileName2);
	}
}


function saveBpl_ST() {
	// Bitplane definition: https://www.fxjavadevblog.fr/atari-st-4-bitplanes/
	// Bitplane Simulator: https://www.fxjavadevblog.fr/atari-st-4-bitplanes-simulator/

	var xportBpl = [];
	xportBpl[0] = document.getElementById('ST_xport1').checked;
	xportBpl[1] = document.getElementById('ST_xport2').checked;
	xportBpl[2] = document.getElementById('ST_xport3').checked;
	xportBpl[3] = document.getElementById('ST_xport4').checked;
	let bplCount = 0;
	if (xportBpl[0]) bplCount++;
	if (xportBpl[1]) bplCount++;
	if (xportBpl[2]) bplCount++;
	if (xportBpl[3]) bplCount++;
	let pi1 = document.getElementById('pi1').checked;
	if ((cropW%16) != 0) {
		alert("failed: image width must be a multiple of 16");
		return;
	}
	const bytesPerPacket = 2*bplCount;
	const bytesPerLine = v((cropW/16)*bytesPerPacket);
	let imgSize = v(cropH * bytesPerLine);
	if (pi1) imgSize += 34;
	let bitplanesData = new Uint8Array(imgSize);
	bitplanesData.fill(0);
	var writeIndex = 0;
	if (pi1) {
		bitplanesData[writeIndex++] = 0;	// resolution = low-res
		bitplanesData[writeIndex++] = 0;	// resolution = low-res	

		const remainingBits = 8 - platform_colorBits;
		const maxVal = (1 << platform_colorBits) - 1;
		for (let i = 0; i < 16; i++) {
			var r = 0;
			var g = 0;
			var b = 0;
			if (global_palette.length > i) {	// some pics can be 8 colors
				r = nearest(global_palette[i].r);
				g = nearest(global_palette[i].g);
				b = nearest(global_palette[i].b);	
			}
			var ar = v(v(r>>remainingBits)&maxVal);
			var ag = v(v(g>>remainingBits)&maxVal);
			var ab = v(v(b>>remainingBits)&maxVal);
								
			switch(target_platform) {
				case "target_STE" :
					ar = componentToSTE(ar);
					ag = componentToSTE(ag);
					ab = componentToSTE(ab);
				break;
				default:
				break;
			}
				
			bitplanesData[writeIndex++] = v(ar);
			bitplanesData[writeIndex++] = v(ab | (ag << 4));
		}
	}

	for (var y = 0; y < cropH; y++)
	{
		let x = 0;
		while (x < cropW)
		{
			let _4Words = new Uint8Array(8);
			_4Words.fill(0);

			let col1 = getChunkyPix(x,y);
			x++;
			let col2 = getChunkyPix(x,y);
			x++;
			let col3 = getChunkyPix(x,y);
			x++;
			let col4 = getChunkyPix(x,y);
			x++;

			if ((col1 & 1) == 1) _4Words[0] |= 1<<7;
			if ((col1 & 2) == 2) _4Words[2] |= 1<<7;
			if ((col1 & 4) == 4) _4Words[4] |= 1<<7;
			if ((col1 & 8) == 8) _4Words[6] |= 1<<7;

			if ((col2 & 1) == 1) _4Words[0] |= 1<<6;
			if ((col2 & 2) == 2) _4Words[2] |= 1<<6;
			if ((col2 & 4) == 4) _4Words[4] |= 1<<6;
			if ((col2 & 8) == 8) _4Words[6] |= 1<<6;

			if ((col3 & 1) == 1) _4Words[0] |= 1<<5;
			if ((col3 & 2) == 2) _4Words[2] |= 1<<5;
			if ((col3 & 4) == 4) _4Words[4] |= 1<<5;
			if ((col3 & 8) == 8) _4Words[6] |= 1<<5;

			if ((col4 & 1) == 1) _4Words[0] |= 1<<4;
			if ((col4 & 2) == 2) _4Words[2] |= 1<<4;
			if ((col4 & 4) == 4) _4Words[4] |= 1<<4;
			if ((col4 & 8) == 8) _4Words[6] |= 1<<4;

			col1 = getChunkyPix(x,y);
			x++;
			col2 = getChunkyPix(x,y);
			x++;
			col3 = getChunkyPix(x,y);
			x++;
			col4 = getChunkyPix(x,y);
			x++;

			if ((col1 & 1) == 1) _4Words[0] |= 1<<3;
			if ((col1 & 2) == 2) _4Words[2] |= 1<<3;
			if ((col1 & 4) == 4) _4Words[4] |= 1<<3;
			if ((col1 & 8) == 8) _4Words[6] |= 1<<3;

			if ((col2 & 1) == 1) _4Words[0] |= 1<<2;
			if ((col2 & 2) == 2) _4Words[2] |= 1<<2;
			if ((col2 & 4) == 4) _4Words[4] |= 1<<2;
			if ((col2 & 8) == 8) _4Words[6] |= 1<<2;

			if ((col3 & 1) == 1) _4Words[0] |= 1<<1;
			if ((col3 & 2) == 2) _4Words[2] |= 1<<1;
			if ((col3 & 4) == 4) _4Words[4] |= 1<<1;
			if ((col3 & 8) == 8) _4Words[6] |= 1<<1;

			if ((col4 & 1) == 1) _4Words[0] |= 1;
			if ((col4 & 2) == 2) _4Words[2] |= 1;
			if ((col4 & 4) == 4) _4Words[4] |= 1;
			if ((col4 & 8) == 8) _4Words[6] |= 1;

			col1 = getChunkyPix(x,y);
			x++;
			col2 = getChunkyPix(x,y);
			x++;
			col3 = getChunkyPix(x,y);
			x++;
			col4 = getChunkyPix(x,y);
			x++;

			if ((col1 & 1) == 1) _4Words[1] |= 1<<7;
			if ((col1 & 2) == 2) _4Words[3] |= 1<<7;
			if ((col1 & 4) == 4) _4Words[5] |= 1<<7;
			if ((col1 & 8) == 8) _4Words[7] |= 1<<7;

			if ((col2 & 1) == 1) _4Words[1] |= 1<<6;
			if ((col2 & 2) == 2) _4Words[3] |= 1<<6;
			if ((col2 & 4) == 4) _4Words[5] |= 1<<6;
			if ((col2 & 8) == 8) _4Words[7] |= 1<<6;

			if ((col3 & 1) == 1) _4Words[1] |= 1<<5;
			if ((col3 & 2) == 2) _4Words[3] |= 1<<5;
			if ((col3 & 4) == 4) _4Words[5] |= 1<<5;
			if ((col3 & 8) == 8) _4Words[7] |= 1<<5;

			if ((col4 & 1) == 1) _4Words[1] |= 1<<4;
			if ((col4 & 2) == 2) _4Words[3] |= 1<<4;
			if ((col4 & 4) == 4) _4Words[5] |= 1<<4;
			if ((col4 & 8) == 8) _4Words[7] |= 1<<4;

			col1 = getChunkyPix(x,y);
			x++;
			col2 = getChunkyPix(x,y);
			x++;
			col3 = getChunkyPix(x,y);
			x++;
			col4 = getChunkyPix(x,y);
			x++;

			if ((col1 & 1) == 1) _4Words[1] |= 1<<3;
			if ((col1 & 2) == 2) _4Words[3] |= 1<<3;
			if ((col1 & 4) == 4) _4Words[5] |= 1<<3;
			if ((col1 & 8) == 8) _4Words[7] |= 1<<3;

			if ((col2 & 1) == 1) _4Words[1] |= 1<<2;
			if ((col2 & 2) == 2) _4Words[3] |= 1<<2;
			if ((col2 & 4) == 4) _4Words[5] |= 1<<2;
			if ((col2 & 8) == 8) _4Words[7] |= 1<<2;

			if ((col3 & 1) == 1) _4Words[1] |= 1<<1;
			if ((col3 & 2) == 2) _4Words[3] |= 1<<1;
			if ((col3 & 4) == 4) _4Words[5] |= 1<<1;
			if ((col3 & 8) == 8) _4Words[7] |= 1<<1;

			if ((col4 & 1) == 1) _4Words[1] |= 1;
			if ((col4 & 2) == 2) _4Words[3] |= 1;
			if ((col4 & 4) == 4) _4Words[5] |= 1;
			if ((col4 & 8) == 8) _4Words[7] |= 1;

			if (xportBpl[0]) {
				bitplanesData[writeIndex++] = _4Words[0];
				bitplanesData[writeIndex++] = _4Words[1];	
			}
			if (xportBpl[1]) {
				bitplanesData[writeIndex++] = _4Words[2];
				bitplanesData[writeIndex++] = _4Words[3];
			}
			if (xportBpl[2]) {
				bitplanesData[writeIndex++] = _4Words[4];
				bitplanesData[writeIndex++] = _4Words[5];
			}
			if (xportBpl[3]) {
				bitplanesData[writeIndex++] = _4Words[6];
				bitplanesData[writeIndex++] = _4Words[7];
			}
		}
	}
	if (writeIndex != imgSize) alert("expected to write " + imgSize + " bytes, but wrote " + writeIndex + " bytes.");
	var blob = new Blob([bitplanesData], {type: "application/octet-stream"});
	var fileName = export_fileName;
	if (pi1) 
		fileName += ".pi1";
	else
		fileName += "_bitplanes.bin";
	saveAs(blob, fileName);
  }


function saveBpl() {
	let maxColCount = 32;
	let wMask = 7;
	switch(target_platform) {
		case "target_STE" :
		case "target_ST" : 
			maxColCount = 16;
			wMask = 15;
		break;
		case  "target_PSX16" :
			savePSX_TIM16();
		return;
		default:
		break;
	}

	if ((cropW & wMask)!=0) {
		alert("Can't export bitplanes:  - Wrong image width - Shoud be a multiple of " + (wMask + 1).toString() + " - Found: " + cropW + " pix width. Please adjust cropping values.");
		return;
	}

	var bytesPerLine = v(cropW/8);

	var bitplanesCount = 0;
	var colCount = global_palette.length;
	var startCol = 0;
	if (isColor0Locked()) {
		startCol = 1;
		colCount--;
	}

	if (colCount > maxColCount) {
		alert("Can't export bitplanes:  - Wrong palette size - Found " + colCount + " colors, but the bitplane export supports " + maxColCount + " colors max. You can only use 'Save RGB' with this image .");
		return;
	}

	if (colCount > 16 ) bitplanesCount = 5;
	else if (colCount > 8) bitplanesCount = 4;
	else if (colCount > 4) bitplanesCount = 3;
	else if (colCount > 2) bitplanesCount = 2;
	else if (colCount > 0) bitplanesCount = 1;

	var xportBpl = [];
	xportBpl[0] = document.getElementById('xport1').checked;
	xportBpl[1] = document.getElementById('xport2').checked;
	xportBpl[2] = document.getElementById('xport3').checked;
	xportBpl[3] = document.getElementById('xport4').checked;

	switch(target_platform) {
		case "target_STE" :
		case "target_ST" : 
			saveBpl_ST();
		return;
		default:
		break;
	}

	xportBpl[4] = document.getElementById('xport5').checked;

	var interleave = document.getElementById('xportInterleave').checked;

	var actualBplXportCount  = 0;
	for (var i = 0; i < bitplanesCount; i++) {
		if (xportBpl[i])
			actualBplXportCount++;
	}

	var bplSize = v(cropH * bytesPerLine);
	var bitplanesData = new Uint8Array(actualBplXportCount * bplSize);
	bitplanesData.fill(0);
	if (actualBplXportCount == 0) {
	    alert(" - ABORTING - UNSUPPORTED BITPLANES COUNT: " + actualBplXportCount + " (" + colCount + " colors).");
		return;
	}

	var writeIndex = 0;

	for (var iBpl = 0; iBpl < bitplanesCount; iBpl++) {
		if (xportBpl[iBpl]) {
			var bplMask = 1 << iBpl;
			for (var y = 0; y < cropH; y++)
			{
				var xmask = 128;
				var thisByte = 0;
				for (var x = 0; x < cropW; x++)
				{
					var col = getChunkyPix(x,y);
					if ((col & bplMask) !== 0) {
						thisByte |= xmask;
					}
					xmask /= 2;
					if ((x & 7) === 7) {
						if (xmask !== 0.5)
							alert("xmask error");
						bitplanesData[writeIndex++] = thisByte;
						xmask = 128;
						thisByte = 0;
					}
				}
			}
		}
	}	

	if (interleave) {
		var interData = new Uint8Array(actualBplXportCount * bplSize);
		interData.fill(0);
		var readIndexes = [];
		var rdIndex = 0;
		for (var i = 0; i < bitplanesCount; i++) {
			if (xportBpl[i]) {
				readIndexes.push(rdIndex);
				rdIndex += bplSize;
			}
		}
		var w = 0;
		for (var y = 0; y < cropH; y++) {
			var yofs = bytesPerLine * y;
			for (var iBpl = 0; iBpl < bitplanesCount; iBpl++) {
				if (xportBpl[iBpl]) {
					for (var x = 0; x < bytesPerLine; x++) {
						interData[w++] = bitplanesData[readIndexes[iBpl] + x + yofs];
					}
				}
			}
		}

		var blob = new Blob([interData], {type: "application/octet-stream"});
		var fileName = export_fileName + "_bitplanes_interleaved.bin";
		saveAs(blob, fileName);	
	} else {
		var blob = new Blob([bitplanesData], {type: "application/octet-stream"});
		var fileName = export_fileName + "_bitplanes.bin";
		saveAs(blob, fileName);
	}

  }
 
  function saveRaw() {
	var dataSize = v(workImagePixels.length/4);
	var data = new Uint8Array(dataSize*2);
	data.fill(0);
	var chunkyRead = 0;
	var chunkyWrite = 0;
	for (var i = 0; i < dataSize; i++)
	{
		var r = nearest(workImagePixels[chunkyRead++]);
		var g = nearest(workImagePixels[chunkyRead++]);
		var b = nearest(workImagePixels[chunkyRead++]);
		chunkyRead++;
		r = v(v(r>>4)&15);
		g = v(v(g>>4)&15);
		b = v(v(b>>4)&15);
		data[chunkyWrite++] = v(r);
		data[chunkyWrite++] = v(v(g*16) + b);
	}
	
	var blob = new Blob([data], {type: "application/octet-stream"});
	var fileName = export_fileName + "_12bitRAW.bin";
	saveAs(blob, fileName);
	xport.value = xportstr;
  }

  function save4Bit() {
	if (global_palette.length > 16) {
		alert("Can't export indexes:  - Wrong palette size - Found " + global_palette.length + " colors, but the indexes export supports 16 colors max, as each palette index is stored on 4 bits.");
		return;
	}
	var data = new Uint8Array((cropW * cropH) / 2);
	data.fill(0);
	var readIndex = 0;
	var writeIndex = 0;
	while (readIndex < pixelsPaletteIndex.length) {
		var p1 = pixelsPaletteIndex[readIndex++];
		var p2 = pixelsPaletteIndex[readIndex++];
		p1 &= 15;
		p2 &= 15;
		var final = (p1<<4) | p2;
		data[writeIndex++] = final;
	}
	var palblob = new Blob([data], {type: "application/octet-stream"});
	var palfileName = export_fileName + "_indexes.bin";
	saveAs(palblob, palfileName);
  }

  function save8Bit(_min, _max, _mult) {
	if (global_palette.length > 256) {
		alert("Can't export indexes:  - Wrong palette size - Found " + global_palette.length + " colors, but the indexes export supports 256 colors max, as each palette index is stored on 8 bits.");
		return;
	}
	var data = new Uint8Array(cropW * cropH);
	data.fill(0);
	var readIndex = 0;
	var writeIndex = 0;
	while (readIndex < pixelsPaletteIndex.length) {
		let col = pixelsPaletteIndex[readIndex++];
		if (col < _min) {
			alert("Can't export indexes:  color value: " + col + " is lower than min: " + _min);
			return;	
		}
		if (col > _max) {
			alert("Can't export indexes:  color value: " + col + " is higher than max: " + _max);
			return;	
		}
		let writeMe = Math.floor(col*_mult);
		if (_mult  == 4) {
			if ((writeMe & 3) != 0) {
				debugger;
				alert("wtf");
			}
		}
	//	console.log(writeMe);
		data[writeIndex++] = writeMe;
	}
	var palblob = new Blob([data], {type: "application/octet-stream"});
	var palfileName = export_fileName + "_indexes.bin";
	saveAs(palblob, palfileName);
  }


function savePalette(_asText){
	var saveTextFileHere = false;
	var asCper = null;
	var asC = null;
	if (_asText === '@fromeditor') {
		var mode = document.getElementById("paletteMode").value;
		if (mode === "palASM") {
			_asText = ";\tpalette for: " + export_fileName + "\n";
			var d = new Date();
			_asText += ";\t" +  d.toString() + "\n";
			saveTextFileHere = true;
		}
		else _asText = null;
		if ((mode === "palCper") || (mode === "palCper2")) {
			if (target_platform != 'target_OCS') {
				alert("Palette can be exported to Copperlist only for OCS. Current target platform is: " + target_platform);
				return;
			}
			asCper = ";\tcopperlist for: " + export_fileName + "\n";
			var d = new Date();
			asCper += ";\t" +  d.toString() + "\n";
			saveTextFileHere = true;
		}
		if (mode === "palC") {
			asC = "//\palette for: " + export_fileName + "\n";
			var d = new Date();
			asC += "//\t" +  d.toString() + "\n";
			asC += "unsigned short palette[] = {\n";
			saveTextFileHere = true;
		}
		var save2Clipboard = false;
		var mode2 = document.getElementById("paletteSaveTo").value;
		if (mode2 === "pal_clipBoard") {
			if (mode === "paltBin")
				alert("can't save binary palette to clipboard.");
			else
				save2Clipboard = true;
		}
	}

	var data;
	var index;
	var palLen = global_palette.length;
	var startCol = 0;
	var firstCperCol = 0x180;
	if (mode === "palCper2")
		firstCperCol = 0x1a0;

	if (isColor0Locked()) {	
		startCol = 1;
		palLen--;
		if (_asText) {
			_asText += "; first color is locked, so it's not exported in this palette.\n";
		}
		if (asCper !== null) {
			firstCperCol += 2;
			asCper += "; first color is locked, so it's not exported in this palette.\n";
		}
		if (asC !== null) {
			firstCperCol += 2;
			asC += "// first color is locked, so it's not exported in this palette.\n";
		}
	}
	if (document.getElementById('includeCount').checked) {
		if (saveTextFileHere) {
			_asText += "\tdc.w\t" + TwoCharString(palLen) + "\t; colors count\n";
		}
		data = new Uint8Array(palLen * 2 + 2);
		data.fill(0);
		data[0] = 0;
		data[1] = palLen & 255;
		index = 2;
	}
	else {
		data = new Uint8Array(palLen * 2);
		data.fill(0);
		index = 0;
	}

	const remainingBits = 8 - platform_colorBits;
	const maxVal = (1 << platform_colorBits) - 1;
	for (var i = startCol; i < global_palette.length; i++)
	{				
		var r = nearest(global_palette[i].r);
		var g = nearest(global_palette[i].g);
		var b = nearest(global_palette[i].b);
		var ar = v(v(r>>remainingBits)&maxVal);
		var ag = v(v(g>>remainingBits)&maxVal);
		var ab = v(v(b>>remainingBits)&maxVal);
			

		switch(target_platform) {
			case "target_STE" :
				ar = componentToSTE(ar);
				ag = componentToSTE(ag);
				ab = componentToSTE(ab);
			break;
			default:
			break;
		}
	
		data[index++] = v(ar);
		data[index++] = v(ab | (ag << 4));
		if (_asText) {
			_asText += "\tdc.w\t$"+ TwoCharStringHEX(v(ar)) + TwoCharStringHEX(v(ab | (ag << 4))) +"\n";
		}
		if (asCper) {
			asCper += "\tdc.w\t$"+ TwoCharStringHEX(firstCperCol>>8) + TwoCharStringHEX(firstCperCol&255) + "," + "$" + TwoCharStringHEX(v(ar)) + TwoCharStringHEX(v(ab | (ag << 4))) +"\n";
			firstCperCol += 2;
		}
		if (asC) {
			asC += "\t0x"+ TwoCharStringHEX(v(ar)) + TwoCharStringHEX(v(ab | (ag << 4)));
			if (i < global_palette.length - 1 ){
				asC += ",";
			}
			asC += "\n";
			firstCperCol += 2;
		}
	}
	if (_asText) {
		if (saveTextFileHere) {
			if (save2Clipboard) {
				copyStringToClipboard(_asText);
				alert("done copying the palette to the clipboard");
			} else {
				var blob = new Blob([_asText], { type: "text/plain;charset=utf-8" });
				saveAs(blob, export_fileName + "_palette.asm");
			}
			return;		
		}
		return _asText;
	}
	
	if (asCper) {
		if (save2Clipboard) {
			copyStringToClipboard(asCper);
			alert("done copying the copperlist to the clipboard");
		} else {
			var blob = new Blob([asCper], { type: "text/plain;charset=utf-8" });
			saveAs(blob, export_fileName + "_copper.asm");
			}
		return;		
	}

	if (asC) {
		asC += "};\n";
		if (save2Clipboard) {
			copyStringToClipboard(asC);
			alert("done copying the palette to the clipboard");
		} else {
			var blob = new Blob([asC], { type: "text/plain;charset=utf-8" });
			saveAs(blob, export_fileName + "_palette.c");
			}
		return;		
	}

	var blob = new Blob([data], {type: "application/octet-stream"});
	var fileName = export_fileName + "_palette.bin";
	saveAs(blob, fileName);
}


function savePaletteC(_asText){
	var asC = _asText;

	var data;
	var index;
	var palLen = global_palette.length;
	var startCol = 0;

	if (isColor0Locked()) {	
		palLen--;
		startCol = 1;
		asC += "// first color is locked, so it's not exported in this palette.\n";
	}
	data = new Uint8Array(palLen * 2);
	data.fill(0);
	index = 0;
	for (var i = startCol; i < global_palette.length; i++)
	{
		var r = nearest(global_palette[i].r);
		var g = nearest(global_palette[i].g);
		var b = nearest(global_palette[i].b);
		var ar = v(v(r>>4)&15);
		var ab = v(v(b>>4)&15);
			
		data[index++] = v(ar);
		data[index++] = v(ab | g);
		asC += "\t0x"+ TwoCharStringHEX(v(ar)) + TwoCharStringHEX(v(ab | g));
		if (i < global_palette.length - 1 ){
			asC += ",";
		}
		asC += "\n";
	}
	return asC;
}

