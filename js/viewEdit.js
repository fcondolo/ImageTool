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

	for (var i = 0; i < PATH_PTS.length; i++) {
		let coord = {x:PATH_PTS[i].x * destW,y:PATH_PTS[i].y * destH};
		var r = PATH_PTS[i].r * cameraZoom;
		viewContext.beginPath();
		viewContext.arc(coord.x, coord.y, r, 0, 2 * Math.PI);
		viewContext.fill();
	}

	return;

	let topLeftView = invtransfo.transformPoint(new DOMPoint(0, 0));
	let bottomRightView = invtransfo.transformPoint(new DOMPoint(destW-1, destH-1));
	let topLeftWork = {x:topLeftView.x/destW*workCanvas.width, y:topLeftView.y/destH*workCanvas.height};
	let bottomRightWork = {x:bottomRightView.x/destW*workCanvas.width, y:bottomRightView.y/destH*workCanvas.height};

	let zoomSourceCoord = destToSource(zoomDestCoord);

	let topleft = destToSource({x:Math.max(0,-0.5 + zoomDestCoord.x), y:Math.max(0,-0.5 +  zoomDestCoord.y)});
	let bottomright = destToSource({x:Math.min(1,0.5 + zoomDestCoord.x), y:Math.min(1,0.5 + zoomDestCoord.y)});

	imagezone.x = topleft.x;
	imagezone.y = topleft.y;
	imagezone.w = bottomright.x-topleft.x;
	imagezone.h = bottomright.y-topleft.y;


	// show mouse cursor
	var cx = grab_curx;
	var cy = grab_cury;
	var r = getElemInt10('bobsize');
	viewContext.beginPath();
	viewContext.arc(cx, cy, r, 0, 2 * Math.PI);
	viewContext.fill();

	for (var i = 0; i < PATH_PTS.length; i++) {
		let coord = sourceToDest({x:PATH_PTS[i].x,y:PATH_PTS[i].y});
		var r = PATH_PTS[i].r * cameraZoom;
		viewContext.beginPath();
		viewContext.arc(coord.x + cameraOffset.x, coord.y + cameraOffset.y, r, 0, 2 * Math.PI);
		viewContext.fill();
	}

//	showGrab(_time, cameraZoom);
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

