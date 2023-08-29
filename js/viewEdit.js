
function buildViewImage(_time) {
	if (!viewCanvas)
		return;

	var thisView = getCurrentView();
	var zoom = v(parseInt(document.getElementById("zoom").value, 10));
	var w = thisView.w * zoom;
	var h = thisView.h * zoom;
	viewCanvas.width = w;
	viewCanvas.height = h;
	viewContext.width = w;
	viewContext.height = h;
	viewContext.imageSmoothingEnabled = false;
	viewContext.drawImage(workCanvas, 0, 0, thisView.w, thisView.h, 0, 0, w, h);

	var viewShow = document.getElementById('viewShow').value;
	if (viewShow !== "viewShow_normal") {
		var ctx = viewContext;
		alpha = 0.6 + 0.3*Math.abs(Math.sin(_time));
		var stroke = "rgba(0, 255, 0, " + alpha + ")";
		ctx.strokeStyle = stroke;
		ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
		if (grab_state === "null") {
			if (viewShow === "viewShow_sprites") {
				showSprites(_time, zoom, w, h);
			}
			if (viewShow === "viewShow_bobs") {
				showBobs(_time, zoom, w, h);
			}
		}
	}

	showGrab(_time, zoom);
}


function showSprites(_time, zoom, w, h)  {
	var ctx = viewContext;
	var thisView = spriteWindow;

	var sprtC = parseInt(document.getElementById('sprtC').value,10);
	var originalsprtC = sprtC;
	var maxsprtC = 0;
	var sprtH = zoom * parseInt(document.getElementById('sprtH').value,10);
	var sprtW = zoom * 16;

	var startX = thisView.x * zoom;
	var endX = startX + thisView.w * zoom;
	var startY = thisView.y * zoom;
	var endY = startY + thisView.h * zoom;
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
		document.getElementById('sprtC').value = maxsprtC;
	}
	if (startX > 0)
		ctx.fillRect(0,0,startX-1,viewContext.height);
	if (endX < viewContext.width)
		ctx.fillRect(endX,0,viewContext.width-endX,viewContext.height);
	if (startY > 0)
		ctx.fillRect(0,0,viewContext.width,startY-1);
	if (endY < viewContext.height)
		ctx.fillRect(0,endY,viewContext.width,viewContext.height-endY);

} 



function showBobs(_time, zoom, w, h)  {
	var ctx = viewContext;
	var thisView = spriteWindow;
	var startX = thisView.x * zoom;
	var endX = startX + thisView.w * zoom;
	var startY = thisView.y * zoom;
	var endY = startY + thisView.h * zoom;

	var bobW = zoom * parseInt(document.getElementById('bobW').value,10);
	var bobH = zoom * parseInt(document.getElementById('bobH').value,10);
	var bobC = parseInt(document.getElementById('bobC').value,10);
	var originalBobC = bobC;
	var maxBobC = 0;
	for (var y = startY; y < endY; y += bobH) {
		for (var x = startX; x < endX; x += bobW) {
			if (bobC > 0) {
				ctx.beginPath();
				ctx.moveTo(x,y);
				ctx.lineTo(x+bobW,y);
				ctx.lineTo(x+bobW,y+bobH);
				ctx.lineTo(x,y+bobH);
				ctx.lineTo(x,y);
				ctx.stroke();			
				bobC--;	
			} else {
				ctx.fillRect(x,y,bobW,bobH);
			}
			maxBobC++;
		}	
	}
	if (originalBobC > maxBobC) {
		document.getElementById('bobC').value = maxBobC;
	}
	if (startX > 0)
		ctx.fillRect(0,0,startX-1,viewContext.height);
	if (endX < viewContext.width)
		ctx.fillRect(endX,0,viewContext.width-endX,viewContext.height);
	if (startY > 0)
		ctx.fillRect(0,0,viewContext.width,startY-1);
	if (endY < viewContext.height)
		ctx.fillRect(0,endY,viewContext.width,viewContext.height-endY);
} 

function showGrab(_time, zoom)  {
	var zoom = v(parseInt(document.getElementById("zoom").value, 10));
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

	if (grab_state === "progress") {
		if (grabMode !== "grabmode_none") {	
			document.getElementById("mouseCoordLabel").innerHTML = r.x + ", " + r.y + ", " + Math.abs(r.w) + ", " + Math.abs(r.h);
			ctx.strokeRect(minx, miny, maxx-minx, maxy-miny);
		}	
	} else if (grab_state === "done") {
		ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
		ctx.fillRect(0,0,minx,ctx.height);
		ctx.fillRect(maxx,0,ctx.width-maxx,ctx.height);
		ctx.fillRect(0,0,ctx.width,miny);
		ctx.fillRect(0,maxy,ctx.width,ctx.height-maxy);
		ctx.strokeRect(minx, miny, maxx-minx, maxy-miny);
	} else  if (grab_state === "null") {
		if (getElemValue('grabMode') !== 'grabmode_none') {
			var rect = viewCanvas.getBoundingClientRect();
			if (realMouseCoord.x >= rect.x && realMouseCoord.y >= rect.y && realMouseCoord.x < rect.x + rect.width && realMouseCoord.y < rect.y + rect.height) {
				var cx = v(grab_curx * zoom);
				var cy = v(grab_cury * zoom);
	
				ctx.beginPath();
				ctx.moveTo(cx, 0);
				ctx.lineTo(cx, ctx.height);
				ctx.moveTo(0, cy);
				ctx.lineTo(ctx.width, cy);
				ctx.stroke();	
			}	
		}
	}

} 
