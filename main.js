// The complex number z = x + i*y is represented as the array [x, y].
const Z = (x,y) => [x,y];
const Re = z => z[0];
const Im = z => z[1];

// Operations on complex numbers.
const add = (z1, z2) => Z(Re(z1) + Re(z2), Im(z1) + Im(z2));
const mul = (z1, z2) => Z(Re(z1)*Re(z2) - Im(z1)*Im(z2), Re(z1)*Im(z2) + Im(z1)*Re(z2));

const Z_PLANE_CTX = document.getElementById("z_plane").getContext("2d");
const W_PLANE_CTX = document.getElementById("w_plane").getContext("2d");

const PLANE_SIZE = 3;

var CANVAS_SIZE = document.getElementById("z_plane").width;

window.onload = () => {
	// Initialize canvas.
	[Z_PLANE_CTX, W_PLANE_CTX].forEach(ctx => {
		ctx.scale(CANVAS_SIZE/PLANE_SIZE, -CANVAS_SIZE/PLANE_SIZE);
		ctx.translate(PLANE_SIZE/2, -PLANE_SIZE/2);
		ctx.lineWidth = 2*PLANE_SIZE/CANVAS_SIZE;
	});

	draw_grid();
	draw_axes();
};

function draw_line(ctx, points) {
	ctx.beginPath();
	points.forEach(p => ctx.lineTo(p[0], p[1]));
	ctx.stroke();
}

function interpolate_line(z1, z2, steps) {
	let [x1, y1] = z1;
	let [x2, y2] = z2;
	let x_step = (x2 - x1) / steps;
	let y_step = (y2 - y1) / steps;
	let x = x1;
	let y = y1;
	let line = [];
	while (steps-- >= 0) {
		line.push([x, y]);
		x += x_step;
		y += y_step;
	}
	return line;
}

var CURRENT_TRANSFORM = z => z;

var STEPS = 500;

function draw_line_transform(z1, z2) {
	draw_line(Z_PLANE_CTX, [z1, z2]);
	draw_line(W_PLANE_CTX, interpolate_line(z1, z2, STEPS).map(CURRENT_TRANSFORM));
}

function set_stroke(c) {
	[Z_PLANE_CTX, W_PLANE_CTX].forEach(ctx => ctx.strokeStyle = c);
}

function draw_grid() {
	let n_lines = 32;
	for (let x = -PLANE_SIZE; x < +PLANE_SIZE; x += PLANE_SIZE/n_lines) {
		let p = (x + PLANE_SIZE)/(2*PLANE_SIZE);
		// vertical line
		set_stroke(`hsl(${300 + 180*p} 100% 50%)`);
		draw_line_transform([x, -PLANE_SIZE], [x, +PLANE_SIZE]);
	}
	for (let x = -PLANE_SIZE; x < +PLANE_SIZE; x += PLANE_SIZE/n_lines) {
		let p = (x + PLANE_SIZE)/(2*PLANE_SIZE);
		// horizontal line
		set_stroke(`hsl(${120 + 180*p} 100% 50%)`);
		draw_line_transform([-PLANE_SIZE, x], [+PLANE_SIZE, x]);
	}
}

function clear_planes() {
	[Z_PLANE_CTX, W_PLANE_CTX].forEach(ctx => ctx.clearRect(-PLANE_SIZE, -PLANE_SIZE, 2*PLANE_SIZE, 2*PLANE_SIZE));
}

function draw_axes() {
	set_stroke("black");
	[Z_PLANE_CTX, W_PLANE_CTX].forEach(ctx => {
		draw_line(ctx, [[-PLANE_SIZE, 0], [+PLANE_SIZE, 0]]);
		draw_line(ctx, [[0, -PLANE_SIZE], [0, +PLANE_SIZE]]);
		// Have to undo transform to write text.
		ctx.save();
		ctx.resetTransform();
		ctx.font = "24px serif";
		ctx.fillText("x", CANVAS_SIZE - 20, CANVAS_SIZE/2 + 20);
		ctx.fillText("y", CANVAS_SIZE/2 + 20, 20);
		ctx.restore();
	});
}