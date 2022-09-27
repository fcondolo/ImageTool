
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


function drawPoint(_x, _y, _r, _animate) {
	if (_animate) {
		viewContext.fillStyle = "rgba(255,0,255,255)";
		if (_r < 4)
			_r *= 1 + 3 * Math.abs(Math.sin(anim_timer/50));
		else
			_r *= 1 + Math.sin(anim_timer/100);
	}
	viewContext.beginPath();
	viewContext.arc(_x, _y, _r, 0, 2 * Math.PI);
	viewContext.fill();
	if (_animate) {
		viewContext.fillStyle = "rgba(0,0,255,255)";
	}
}

var curSprtFrame1 = 0
var curSprtFrame2 = prtcle_frames_count/4;
var curSprtFrame3 = prtcle_frames_count/4*2;
var curSprtFrame4 = prtcle_frames_count/4*3;


function showCards() {
	const w = viewCanvas.width;
	const h = viewCanvas.height;
	const centerx = 0.5;
	const centery = 0.5;
	const curvelen = 200;
	const minrad = 0.05;
	const radincr = 0.005;
	const curveFactor = 0.2;

	let rad = minrad;
	for (let i = 0; i < curvelen; i++) {
		const angle = i * curveFactor;
		let x = centerx + rad * Math.cos(angle);
		let y = centery + rad * Math.sin(angle);
		drawPoint(x * w, y * h, 4);
		rad += radincr;
	}
}


function interpolate(x1, y1, r1, x2, y2, r2) {
	var ret = [];	
	let dx = x2-x1;
	let dy = y2-y1;
	// let dist = Math.sqrt(dx*dx+dy*dy);
	// we want manhattan dist as every changing pix must give a value
	let dist = Math.max(Math.abs(dx),Math.abs(dy));
	if (dist <= 1) {
		ret.push({x:x1,y:y1,r:r1});
		return ret;
	}
	let steps = dist * MYDATA.interp;
	let slopex = dx / steps;
	let slopey = dy / steps;
	let sloper = (r2 - r1) / steps;
	let x = x1;
	let y = y1;
	let r = r1;
	for (var i = 0; i < steps; i++) {
		ret.push({x:x,y:y,r:r});	
		x += slopex;
		y += slopey;
		r += sloper;
	}
	return ret;
}

function precalcInterp() {
	let totalPoints = 0;
	for (listIt = 0; listIt < MYDATA.lists.length; listIt++) {
		const curList = MYDATA.lists[listIt].points;
		let lstTotalPts = 0;
		for (var keyIt = 0; keyIt < curList.length; keyIt++) {
			let thispt = curList[keyIt];
			let nextpt = curList[Math.min(keyIt+1,curList.length-1)];
			let coord = interpolate(
				thispt.x * AMIGA_WIDTH, thispt.y * AMIGA_HEIGHT, thispt.r,
				nextpt.x * AMIGA_WIDTH, nextpt.y * AMIGA_HEIGHT, nextpt.r
				);
			totalPoints += coord.length;
			lstTotalPts += coord.length;
			thispt.interp = coord;
		}
		curList.totalPoints = lstTotalPts;
	}
	MYDATA.totalPoints = totalPoints;
}

function buildViewImage(_time) {
	if (!viewCanvas)
		return;

	onptsel();
	var w = 0;
	var h = 0;
	if (VIDEO_DATA.active) {
		w = video.videoWidth;
		h = video.videoHeight;
	} else {
		w = workCanvas.width;
		h = workCanvas.height;
	}
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


	viewContext.fillStyle = "rgba(0,0,255,255)";

	viewContext.resetTransform();
	viewContext.translate(destW / 2, destH / 2 )
    viewContext.scale(cameraZoom, cameraZoom)
    viewContext.translate( -destW / 2 + cameraOffset.x, -destH / 2 + cameraOffset.y )
	viewContext.drawImage(workCanvas, 0, 0, workCanvas.width, workCanvas.height, 0, 0, destW, destH);

	invtransfo = viewContext.getTransform();
	invtransfo.invertSelf();

	MYDATA.interp = getElemInt10('interp');
	precalcInterp();

	switch (PLAY) {
		case 0 : drawCurrentListPoints(); break;
		case 1 : if (VIDEO_DATA.video) drawAnimFrame(); else drawAnimPoints(false); break;
		case 2 : drawAnimPoints(true); break;
		default : break;
	}


	// MOUSE
	viewContext.resetTransform();
	drawPoint(grab_curx, grab_cury, getElemInt10('bobsize') * cameraZoom);


	if (getElem("showCards").checked) {
		showCards();
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
		drawPoint(twirl_centerx + x, twirl_centery + y, prtcle_rad);
	}	
}



function drawCurrentListPoints() {
	const index = getElem("alllists").selectedIndex;
	if (index >= 0 && index < MYDATA.lists.length) {
		const PATH_PTS = MYDATA.lists[index].points;

		for (var i = 0; i < PATH_PTS.length; i++) {
			const coord = PATH_PTS[i].interp;
			for (let j = 0; j < coord.length; j++) {
				drawPoint(coord[j].x * destW / AMIGA_WIDTH, coord[j].y * destH / AMIGA_HEIGHT, coord[j].r, (i === CUR_PT_INDEX)) && (j===0);
			}
		}
	}
}


function drawAnimPoints(_parallel) {
	let keyIndex = 0;
	let prevx, prevy, prevr;
	let canInterp = false;
	let listIt = 0;
	for (listIt = 0; listIt < MYDATA.lists.length; listIt++) {
		const curList = MYDATA.lists[listIt].points;
		if (_parallel)
			keyIndex = 0;


		for (var keyIt = 0; keyIt < curList.length; keyIt++) {
			let coord = curList[keyIt].interp;
			for (let j = 0; j < coord.length; j++) {
				if (keyIndex > PLAYFRAME)
					break;
				drawPoint(coord[j].x * destW / AMIGA_WIDTH, coord[j].y * destH / AMIGA_HEIGHT, coord[j].r);
				keyIndex++;
			}
		}				
	}
	PLAYFRAME++;
	if (PLAYFRAME >= MYDATA.totalPoints)
		PLAYFRAME = 0;
}



function drawAnimFrame() {
	viewContext.fillStyle = 'black';
	viewContext.fillRect(0, 0, viewCanvas.width, viewCanvas.height);
	viewContext.fillStyle = 'blue';

	let keyIndex = 0;
	let interpCount = Math.max(getElemInt10('interp'), 10);
	MYDATA.interp = interpCount;
	let prevx, prevy, prevr;
	let canInterp = false;

		if (MYDATA.lists.length === 0)
			return;
		VIDEO_DATA.curFrame %= MYDATA.lists.length;

		const curList = MYDATA.lists[Math.floor(VIDEO_DATA.curFrame)];
		getElem("mouseCoordLabel").innerHTML = curList.name;

		for (var keyIt = 0; keyIt < curList.points.length; keyIt++) {
			const thisPt = curList.points[keyIt];
			let nextPt = thisPt;
			if (keyIt < curList.points.length - 1)
				nextPt = curList.points[keyIt + 1];
			let slopex = 0;
			let slopey = 0;
			let sloper = 0;
			if (interpCount > 0) {
				slopex = (nextPt.x - thisPt.x) / interpCount;
				slopey = (nextPt.y - thisPt.y) / interpCount;
				sloper = (nextPt.r - thisPt.r) / interpCount;	
			}
			let cx = thisPt.x;
			let cy = thisPt.y;
			let cr = thisPt.r;
			for (var j = 0; j < interpCount; j++) {
				drawPoint(cx * destW, cy* destH, cr);
				keyIndex++;
				cx += slopex;
				cy += slopey;
				cr += sloper;
			}
		}

		VIDEO_DATA.curFrame = (VIDEO_DATA.curFrame + 0.1) % VIDEO_DATA.processedFrames.length;
		
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


function processOneVideoFrame() {
	const frame = VIDEO_DATA.video.get();
	const elm = getElem("video");
	const w = video.videoWidth;
	const h = video.videoHeight;

	workCanvas.width = w;
	workCanvas.height = h;
	workContext.width = w;
	workContext.height = h;
	workContext.imageSmoothingEnabled = false;
	workContext.drawImage(elm, 0, 0, w, h, 0, 0, w, h);
	workImageData = workContext.getImageData(0, 0, w, h);
	workImagePixels = workImageData.data;

	viewCanvas.width = w;
	viewCanvas.height = h;
	viewContext.width = w;
	viewContext.height = h;
	viewContext.imageSmoothingEnabled = false;
	viewContext.drawImage(elm, 0, 0, w, h, 0, 0, w, h);


	if ((VIDEO_DATA.processedFrames.length <= VIDEO_DATA.curFrame) ||
		(!VIDEO_DATA.processedFrames[VIDEO_DATA.curFrame])) {
		Contour("frame #" + frame);
		VIDEO_DATA.processedFrames[VIDEO_DATA.curFrame] = true;
	}

	if (elm.currentTime >= elm.duration) {
		elm.currentTime = 0;
		VIDEO_DATA.processed = true;
		elm.width = 0;
		elm.height = 0;
		elm.style.visibility = "hidden";
	}
}

