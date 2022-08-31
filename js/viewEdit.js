
cameraOffset = { x: 0, y: 0 };
zoomDestCoord = { x: 0, y: 0 }; // normalized, relative to center
cameraZoom = 1;


isDragging = false;
dragStart = { x: 0, y: 0 };

initialPinchDistance = null;
lastZoom = cameraZoom;
viewmouse = { x: 0, y: 0 };
imagezone = {x:0,y:0,w:0,h:0};

invtransfo = null;

MAX_ZOOM = 5
MIN_ZOOM = 0.1
SCROLL_SENSITIVITY = 0.0005

var sprtCoord = [];
const prtcle_count = 32;
const prtcle_rad = 4;
const prtcle_frames_count = 16;
const twirl_centerx = 100;
const twirl_centery = 100;


function precalcSprites() {
	const twirl_totalAngle = Math.PI * 4;
	var sprtyofs = [];

	const prtcle_step = twirl_totalAngle / prtcle_count;
	const rad_incr = 1.15*prtcle_count/35;

	for (var i = 0; i < prtcle_count; i++)
		sprtyofs[i] = 0;	

	for (var frame = 0; frame < prtcle_frames_count; frame++) {
		let twirl_rad = 20 + rad_incr * frame;
		let prtcle_angle = (prtcle_step/prtcle_frames_count)*frame;

		// GENERATE SPRITES COORD
		for (var i = 0; i < prtcle_count; i++) {
			let x = Math.cos(prtcle_angle) * twirl_rad;
			let y = Math.sin(prtcle_angle) * twirl_rad + sprtyofs[i];
			sprtCoord.push(x);
			sprtCoord.push(y);
			prtcle_angle += prtcle_step;
			twirl_rad *= rad_incr;
		}
	
	
		// AVOID MULTIPLE SPRITES ON THE SAME LINE
		let ofs = frame * 2 * prtcle_count;
		let fine = true;
		do {
			fine = true;
			for (var i = 0; i < prtcle_count; i++) {
				for (var j = 0; j < i; j++) {
					let sprite1_bottom = sprtCoord[ofs + i*2+1] + prtcle_rad/2;
					let sprite2_top = sprtCoord[ofs + j*2+1] - prtcle_rad/2;
					if (Math.abs(sprite2_top - sprite1_bottom) < 1) {
						sprtyofs[ofs + j]++;
						sprtCoord[ofs + j*2+1]++;
						fine = false;
						break;
					}
				}		
			}	
		} while (!fine);
	
		// TODO  : SORT FRAME VERTICALLY	
	}
}

var curSprtFrame1 = 0
var curSprtFrame2 = prtcle_frames_count/4;
var curSprtFrame3 = prtcle_frames_count/4*2;
var curSprtFrame4 = prtcle_frames_count/4*3;
function buildViewImage(_time) {
	if (!viewCanvas)
		return;

	var thisView = getCurrentView();
	var w = thisView.w;
	var h = thisView.h;
	var ratio = h/w;
	var neededW = workCanvas.width * cameraZoom;
	var neededH = workCanvas.height * cameraZoom;
	var maxW = window.innerWidth * 0.8;
	var maxH = ratio*maxW;
	destW = Math.min(neededW,maxW);
	destH = Math.min(neededH,maxH);

	viewCanvas.width = destW;
	viewCanvas.height = destH;
	viewContext.width = destW;
	viewContext.height = destH;
	viewContext.imageSmoothingEnabled = false;


	viewContext.resetTransform();
	viewContext.translate(destW / 2, destH / 2 )
    viewContext.scale(cameraZoom, cameraZoom)
    viewContext.translate( -destW / 2 + cameraOffset.x, -destH / 2 + cameraOffset.y )
	viewContext.drawImage(workCanvas, 0, 0, workCanvas.width, workCanvas.height, 0, 0, destW, destH);

	invtransfo = viewContext.getTransform();
	invtransfo.invertSelf();

	viewContext.fillStyle = "rgba(0,255,0,255)";

	if (!PLAY) {
		const index = getElem("alllists").selectedIndex;
		if (index >= 0 && index < MYDATA.lists.length) {
			const PATH_PTS = MYDATA.lists[index].points;
	
			let interpCount = getElemInt10('interp');
			let prevx, prevy, prevr;
			for (var i = 0; i < PATH_PTS.length; i++) {
				let coord = {x:PATH_PTS[i].x * destW,y:PATH_PTS[i].y * destH};
				var r = PATH_PTS[i].r * cameraZoom;
				viewContext.beginPath();
				viewContext.arc(coord.x, coord.y, r, 0, 2 * Math.PI);
				viewContext.fill();
				if (i > 0) {
					if (interpCount > 0) {
						let slopex = (coord.x - prevx) / interpCount;
						let slopey = (coord.y - prevy) / interpCount;
						let sloper = (r - prevr) / interpCount;
						for (var j = 0; j < interpCount; j++) {
							prevx += slopex;
							prevy += slopey;
							prevr += sloper;
							viewContext.beginPath();
							viewContext.arc(prevx, prevy, prevr, 0, 2 * Math.PI);
							viewContext.fill();
						}
					}
				}
				prevx = coord.x;
				prevy = coord.y;
				prevr = r;
			}	
		}	
	} else {
		let keyIndex = 0;
		let interpCount = getElemInt10('interp');
		let prevx, prevy, prevr;
		let canInterp = false;

		let maxKeyIndex = 0;
		for (var listIt = 0; listIt < MYDATA.lists.length; listIt++) {
			const curList = MYDATA.lists[listIt];
			maxKeyIndex += curList.points.length;
		}
		maxKeyIndex *= interpCount;

		for (var listIt = 0; listIt < MYDATA.lists.length; listIt++) {
			const curList = MYDATA.lists[listIt];
			canInterp = false; // don't interpolate with previous list
			for (var keyIt = 0; keyIt < curList.points.length; keyIt++) {
				if (keyIndex <= PLAYFRAME) {
					const pathPt = curList.points[keyIt];
					let coord = {x:pathPt.x * destW, y:pathPt.y * destH};
					var r = pathPt.r * cameraZoom;
					viewContext.beginPath();
					viewContext.arc(coord.x, coord.y, r, 0, 2 * Math.PI);
					viewContext.fill();
					if (canInterp) {
						let slopex = (coord.x - prevx) / interpCount;
						let slopey = (coord.y - prevy) / interpCount;
						let sloper = (r - prevr) / interpCount;
						for (var j = 0; j < interpCount; j++) {
							prevx += slopex;
							prevy += slopey;
							prevr += sloper;
							viewContext.beginPath();
							viewContext.arc(prevx, prevy, prevr, 0, 2 * Math.PI);
							viewContext.fill();
							keyIndex++;
							if (keyIndex >= PLAYFRAME)
								break;
						}
					}
					prevx = coord.x;
					prevy = coord.y;
					prevr = r;
					canInterp = true;
				}
				if (keyIndex === 0) keyIndex++;
			}				
		}
		PLAYFRAME++;
		if (PLAYFRAME >= maxKeyIndex)
			PLAYFRAME = 0;
	}

	return;
	//DRAW SPRITES
	viewContext.fillStyle = "rgba(255,255,255,255)";

	let ofs = v(curSprtFrame1 * 2 * prtcle_count);
	drawSprites(ofs);
	curSprtFrame1 = v((curSprtFrame1+1)%prtcle_frames_count);

	ofs = v(curSprtFrame2 * 2 * prtcle_count);
	drawSprites(ofs);
	curSprtFrame2 = v((curSprtFrame2+1)%prtcle_frames_count);

	ofs = v(curSprtFrame3 * 2 * prtcle_count);
	drawSprites(ofs);
	curSprtFrame3 = v((curSprtFrame3+1)%prtcle_frames_count);

	ofs = v(curSprtFrame4 * 2 * prtcle_count);
	drawSprites(ofs);
	curSprtFrame4 = v((curSprtFrame4+1)%prtcle_frames_count);
	return;

}

function drawSprites(ofs) {
	for (var i = 0; i < prtcle_count; i++) {
		let x = sprtCoord[ofs + i*2];
		let y = sprtCoord[ofs + i*2+1];
		viewContext.beginPath();
		viewContext.arc(twirl_centerx + x, twirl_centery + y, prtcle_rad, 0, 2 * Math.PI);
		viewContext.fill();
	}	
}

// Gets the relevant location from a mouse or single touch event
function getEventLocation(e)
{
    if (e.touches && e.touches.length == 1)
    {
        return { x:e.touches[0].clientX, y: e.touches[0].clientY }
    }
    else if (e.clientX && e.clientY)
    {
        return { x: e.clientX, y: e.clientY }        
    }
	else alert("WTF");
}



function onPointerDown(e)
{
	if (!(CTRL && SHIFT)) return;
    isDragging = true
    dragStart.x = getEventLocation(e).x/cameraZoom - cameraOffset.x
    dragStart.y = getEventLocation(e).y/cameraZoom - cameraOffset.y
}

function onPointerUp(e)
{
	if (!(CTRL && SHIFT)) return;
    isDragging = false
    initialPinchDistance = null
    lastZoom = cameraZoom
}

function onPointerMove(e)
{
	let mx = getEventLocation(e).x/cameraZoom - dragStart.x;
	let my = getEventLocation(e).y/cameraZoom - dragStart.y;
	viewmouse = getMousePos(viewCanvas,e);
	if (!(CTRL && SHIFT)) return;
    if (isDragging)
    {
        cameraOffset.x = mx;
        cameraOffset.y = my;
    }
}

function handleTouch(e, singleTouchHandler)
{
	if (!(CTRL && SHIFT)) return;
    if ( e.touches.length == 1 )
    {
        singleTouchHandler(e)
    }
    else if (e.type == "touchmove" && e.touches.length == 2)
    {
        isDragging = false
        handlePinch(e)
    }
}


function handlePinch(e)
{
	if (!(CTRL && SHIFT)) return;
    e.preventDefault()
    
    let touch1 = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    let touch2 = { x: e.touches[1].clientX, y: e.touches[1].clientY }
    
    // This is distance squared, but no need for an expensive sqrt as it's only used in ratio
    let currentDistance = (touch1.x - touch2.x)**2 + (touch1.y - touch2.y)**2
    
    if (initialPinchDistance == null)
    {
        initialPinchDistance = currentDistance
    }
    else
    {
        adjustZoom( null, currentDistance/initialPinchDistance )
    }
}

function adjustZoom(zoomAmount, zoomFactor)
{
	if (!(CTRL && SHIFT)) return;
    if (!isDragging)
    {
        if (zoomAmount)
        {
            cameraZoom += zoomAmount
        }
        else if (zoomFactor)
        {
            console.log(zoomFactor)
            cameraZoom = zoomFactor*lastZoom
        }
        
        cameraZoom = Math.min( cameraZoom, MAX_ZOOM )
        cameraZoom = Math.max( cameraZoom, MIN_ZOOM )
        
        console.log(zoomAmount)
    }
}


function showGrab(_time, zoom)  {
	var zoom = cameraZoom;
	var ctx = viewContext;

	if (grab_startx < 0) grab_startx = 0;
	if (grab_starty < 0) grab_starty = 0;
	if (grab_curx < 0) grab_curx = 0;
	if (grab_cury < 0) grab_cury = 0;
	if (grab_startx > cropW) grab_startx = cropW;
	if (grab_starty > cropH) grab_starty = cropH;
	if (grab_curx > cropW) grab_curx = cropW;
	if (grab_cury > cropH) grab_cury = cropH;
	var r = {x:grab_startx, y:grab_starty, w:grab_curx - grab_startx, h:grab_cury - grab_starty};


	var scaled_x = v(r.x*zoom);
	var scaled_y = v(r.y*zoom);
	var scaled_w = v(r.w*zoom);
	var scaled_h = v(r.h*zoom);

	var minx = Math.min(scaled_x, scaled_x + scaled_w);
	var miny = Math.min(scaled_y, scaled_y + scaled_h);
	var maxx = Math.max(scaled_x, scaled_x + scaled_w);
	var maxy = Math.max(scaled_y, scaled_y + scaled_h);

	var alpha = 0.7 + 0.3*Math.abs(Math.sin(_time * 6.2));
	var rd = 255 * Math.abs(Math.cos(_time * 5));
	var g = 255 * Math.abs(Math.sin(_time * 5));
	var b = 255 * Math.abs(Math.sin(_time * 4));
	var stroke = "rgba("+rd+","+g+","+b+"," + alpha + ")";
	ctx.strokeStyle = stroke;
	ctx.fillStyle = stroke;
	

	for (var i = 0; i < PATH_PTS.length; i++) {
		var cx = v(PATH_PTS[i].x * zoom) - cameraOffset.x * zoom;
		var cy = v(PATH_PTS[i].y * zoom) - cameraOffset.y * zoom;
		var r = PATH_PTS[i].r * zoom;
		ctx.beginPath();
		ctx.arc(cx, cy, r, 0, 2 * Math.PI);
		ctx.fill();
		if (i > 0) {
			let count = getElemInt10('interp');
			if (count > 0) {
				let prevx = v(PATH_PTS[i-1].x * zoom);
				let prevy = v(PATH_PTS[i-1].y * zoom);
				let prevr = PATH_PTS[i-1].r * zoom;
				let slopex = (cx - v(PATH_PTS[i-1].x * zoom)) / count;
				let slopey = (cy - v(PATH_PTS[i-1].y * zoom)) / count;
				let sloper = (r - PATH_PTS[i-1].r * zoom) / count;
				for (var j = 0; j < count; j++) {
					prevx += slopex;
					prevy += slopey;
					prevr += sloper;
					ctx.beginPath();
					ctx.arc(prevx, prevy, prevr, 0, 2 * Math.PI);
					ctx.fill();
				}
			}
		}
	}

} 

