/*

-----B. Terminology

     CLUT - Color LookUp Table (The Sony term for Palette)

     Image Org - Hard-wired (video) memory address in which to load the image data into.  A TIM loader 
          for a game may or may not use this.

     Palette Org - Hard-wired (video) memory address in which to load the CLUT into.  A TIM loader for a 
          game may or may not use this.

     BPP - Bits per pixel.

     [pA-B rC] - pixels A-B (leftmost pixel 0), row number C (topmost row 0).
          This won't have a bitplane value because it's a linear format.

     [pX rX] - The last pixel of row X.  The last pixel's number is equal to the correct width 
          of the image as defined in the header.

___________________________________________________________________________________________________


2. TIM Graphics Data (A. 4BPP, B. 8BPP, C. 16BPP, D. 24BPP)
   Note: The PSX's r3000a processor is Little-Endian.

-----A. 4BPP PSX TIM
        Each pair represents one byte
        Format:

  [p0-1 r0], [p2-3 r0], [p4-5 r0], [p6-7 r0], ..., [pX r0]
  [p0-1 r1], [p2-3 r1], [p4-5 r1], [p6-7 r1], ..., [pX r1]
  ...
  And it continues until the row number equals the height (from the header).  It gets its
  colors from a 16 entry CLUT in the header of the file, there may be multiple CLUTs.


-----B. 8BPP PSX TIM
        Each pair represents one byte
        Format:

  [p0 r0], [p1 r0], [p2 r0], [p3, r0], [p4, r0], [p5, r0], [p6, r0], [p7, r0], ..., [pX r0]
  [p0 r1], [p1 r1], [p2 r1], [p3, r1], [p4, r1], [p5, r1], [p6, r1], [p7, r1], ..., [pX r1]
  ...
  And it continues until the row number equals the height (from the header).  It gets its
  colors from a 256 entry CLUT in the header of the file, there may be multiple CLUTs.


-----C. 16BPP PSX TIM
        Each pair represents two bytes
        Format:

  [p0 r0], [p1 r0], [p2 r0], [p3, r0], [p4, r0], [p5, r0], [p6, r0], [p7, r0], ..., [pX r0]
  [p0 r1], [p1 r1], [p2 r1], [p3, r1], [p4, r1], [p5, r1], [p6, r1], [p7, r1], ..., [pX r1]
  ...
  And it continues until the row number equals the height (from the header).  It doesn't need
  a CLUT because it's a type of 15bit color.


-----D. 24BPP PSX TIM
        Each pair represents three bytes
        Format:

  [p0 r0], [p1 r0], [p2 r0], [p3, r0], [p4, r0], [p5, r0], [p6, r0], [p7, r0], ..., [pX r0]
  [p0 r1], [p1 r1], [p2 r1], [p3, r1], [p4, r1], [p5, r1], [p6, r1], [p7, r1], ..., [pX r1]
  ...
  Continues until the row number equals the height (from the header).  It doesn't need a CLUT 
  since it's 24bit color.  I've never actually ripped a 24BPP TIM from a PSX game but I found 
  one 24BPP TIM image and took this info from it.  May or may not actually be used on the PSX.

___________________________________________________________________________________________________


3. TIM Headers (A. 4BPP, B. 8BPP, C. 16BPP, D. 24BPP)
   2 and 4 byte fields are Little Endian (like x86) unless noted.

   The TIM-Type Flag looks like this: (In how the PSX "sees" the data, not through a hex editor.)
   xxxxxxxx xxxxxxx xxxxxxx xxxxcttt
   x - reserved
   c - CLUT or no CLUT (0 = no CLUT)
   t - type
       000 - 4BPP
       001 - 8BPP
       010 - 16BPP
       011 - 24BPP
       100 - Mixed Format


-----A. 4BPP TIM Header:       

  -- First Header Block --
    [1-4]   - 10 00 00 00 : ID Tag for TIM Format
    [5-8]   - 08 00 00 00 or 00 00 00 00 (no clut) : ID Tag for 4BPP
    [9-12]  - Size of CLUT + 12 (accounting for 12 bytes before the CLUT block starts)
    [13-14] - Palette Org X
    [15-16] - Palette Org Y
    [17-18] - Number of colors in each CLUT (always 16)
    [19-20] - Number of CLUTs

  -- CLUT Block (Offset: 21) --
    [21-??] - CLUT Data.  16 Colors per CLUT, 32 bytes per CLUT.

  -- Second Header Block (Offset: 21 + Number of CLUTs * Colors Per CLUT * 2) --
    [1-4]   - Size of image data + 12 (accounting for 12 bytes before image data starts)
    [5-6]   - Image Org X
    [7-8]   - Image Org Y
    [9-10]  - Image Width (Multiply by 4 to get actual width)
    [11-12] - Image Height

  -- Image Data Block (Offset: 20 + 13 + Number of CLUTs * Colors Per CLUT * 2) --


-----B. 8BPP TIM Header:

  -- First Header Block --
    [1-4]   - 10 00 00 00: ID Tag for TIM
    [5-8]   - 09 00 00 00 or 01 00 00 00 (no CLUT): ID Tag for 8BPP
    [9-12]  - Size of CLUT + 12 (accounting for 12 bytes before the CLUT block starts)
    [13-14] - Palette Org X
    [15-16] - Palette Org Y
    [17-18] - Number of colors in each CLUT (always 256)
    [19-20] - Number of CLUTs

  -- CLUT Block (Offset: 21) --
    [21-??] - CLUT Data.  256 Colors per CLUT, 512 bytes per CLUT.

  -- Second Header Block (Offset: 20 + Number of CLUTs * Colors Per CLUT * 2) --
    [1-4]   - Size of image data + 12 (accounting for 12 bytes before image data starts)
    [5-6]   - Image Org X
    [7-8]   - Image Org Y
    [9-10]  - Image Width (Multiply by 2 to get actual width)
    [11-12] - Image Height

  -- Image Data Block (Offset: 20 + 13 + Number of CLUTs * Colors Per CLUT * 2) --


-----C. 16BPP TIM Header:

  -- Header Block --
    [1-4]   - 10 00 00 00: ID Tag for TIM
    [5-8]   - 02 00 00 00: ID Tag for 16BPP
    [9-12]  - Size of image data + 12 (accounting for 12 bytes before image data starts)
    [13-14] - Image Org X
    [15-16] - Image Org Y
    [17-18] - Image Width (Stored as actual width)
    [19-20] - Image Height

  -- Image Data Block (Offset: 21) --

  Note: There is no CLUT data.


-----D. 24BPP TIM Header:

  -- Header Block --
    [1-4]   - 10 00 00 00: ID Tag for TIM
    [5-8]   - 03 00 00 00: ID Tag for 24BPP
    [9-12]  - Size of image data + 12 (accounting for 12 bytes before image data starts)
    [13-14] - Image Org X
    [15-16] - Image Org Y
    [17-18] - Image Width (Divide by 1.5 to get actual height)
    [19-20] - Image Height

  -- Image Data Block (Offset: 21) --

  Note: There is no CLUT data.

*/

// data, value, offset
// return new offset
function savePSX_Write16(_d, _v, _o) {
	_d[_o] = _v & 0xff;
	_d[_o + 1] = (_v >> 8) & 0xff;
	return _o + 2;
 }

// data, value, offset
// return new offset
function savePSX_Write32(_d, _v, _o) {
	_d[_o] = _v & 0xff;
	_d[_o + 1] = (_v >> 8) & 0xff;
	_d[_o + 2] = (_v >> 16) & 0xff;
	_d[_o + 3] = (_v >> 24) & 0xff;
	return _o + 4;
 }
 

  function savePSX_TIM16() {
	var dataSize = v(workImagePixels.length/4);
	var data = new Uint8Array(dataSize*2 + 20);		// 2 bytes per pixel, 20 bytes TIM header
	data.fill(0);
	var chunkyRead = 0;
	var chunkyWrite = 0;

	// write 16 BPP TIM header
	chunkyWrite = savePSX_Write32(data, 0x10, chunkyWrite); // constant magic
	chunkyWrite = savePSX_Write32(data, 0x02, chunkyWrite); // 0x08 for 4 bits paletted images, 0x09 for 8 bits paletted images, 0x02 for 16 bits true-colour images.
	chunkyWrite = savePSX_Write32(data, dataSize + 12, chunkyWrite); // Size of image data + 12 (accounting for 12 bytes before image data starts)
	chunkyWrite = savePSX_Write16(data, 0, chunkyWrite); // Image Org X (address to load the image at in the PSX memory - not used here)
	chunkyWrite = savePSX_Write16(data, 0, chunkyWrite); // Image Org Y (address to load the image at in the PSX memory - not used here)
	chunkyWrite = savePSX_Write16(data, cropW, chunkyWrite); // Image width
	chunkyWrite = savePSX_Write16(data, cropH, chunkyWrite); // Image height

	// write data
	for (var i = 0; i < dataSize; i++)
	{
		var r = nearest(workImagePixels[chunkyRead++]);
		var g = nearest(workImagePixels[chunkyRead++]);
		var b = nearest(workImagePixels[chunkyRead++]);
		chunkyRead++;
		r = v(v(r>>3)&31);
		g = v(v(g>>3)&31);
		b = v(v(b>>3)&31);
		const val = r | (g << 5) | (b << 10);
		chunkyWrite = savePSX_Write16(data, val, chunkyWrite);
	}
	
	var blob = new Blob([data], {type: "application/octet-stream"});
	var fileName = export_fileName + "_16bitPSX.TIM";
	saveAs(blob, fileName);
  }

 