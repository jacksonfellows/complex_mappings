// The complex number z = x + i*y is represented as the array [x, y].
const Z = (x,y) => [x,y];
const Re = z => z[0];
const Im = z => z[1];

// Operations on complex numbers.
const add = (z1, z2) => Z(Re(z1) + Re(z2), Im(z1) + Im(z2));
const sub = (z1, z2) => Z(Re(z1) - Re(z2), Im(z1) - Im(z2));
const mul = (z1, z2) => Z(Re(z1)*Re(z2) - Im(z1)*Im(z2), Re(z1)*Im(z2) + Im(z1)*Re(z2));
const conj = z => Z(Re(z), -Im(z));
const div = (z1, z2) => {
	let c = conj(z2);
	let num = mul(z1, c);
	let den = Re(mul(z2, c));
	return Z(Re(num) / den, Im(num) / den);
};

const sin = z => Z(Math.sin(Re(z))*Math.cosh(Im(z)), Math.cos(Re(z))*Math.sinh(Im(z)));
const cos = z => Z(Math.cos(Re(z))*Math.cosh(Im(z)), Math.sin(Re(z))*Math.sinh(Im(z)));

const exp = z => {
	let ex = Math.exp(Re(z));
	return Z(ex*Math.cos(Im(z)), ex*Math.sin(Im(z)));
};

var Z_PLANE_CTX, W_PLANE_CTX, CANVAS_SIZE;

let for_ctx = f => [Z_PLANE_CTX, W_PLANE_CTX].forEach(f);

var MIN = [-1.5, -1.5];
var MAX = [1.5, 1.5];

var PAN = [0, 0];

var CURRENT_TRANSFORM = z => z;

function update_transforms() {
	MIN[0] += PAN[0];
	MIN[1] += PAN[1];
	MAX[0] += PAN[0];
	MAX[1] += PAN[1];
	PAN[0] = 0;
	PAN[1] = 0;
	let d = sub(MAX, MIN);
	for_ctx(ctx => {
		ctx.resetTransform();
		ctx.scale(CANVAS_SIZE/d[0], -CANVAS_SIZE/d[1]);
		ctx.translate(-MIN[0], -MAX[1]);
	});
}

// Settings.
var GRAPH_TYPE, STEPS, MAX_EXTEND_ITERS, GRID_SPACING;

function pixel_to_plane(p) {
	let [x, y] = p;
	let dom_point = Z_PLANE_CTX.getTransform().inverse().transformPoint(new DOMPoint(x, y));
	return [dom_point.x, dom_point.y];
}

var DRAG_START;

function handle_pan_event(e) {
	let p = pixel_to_plane([e.clientX, e.clientY]);
	PAN[0] = DRAG_START[0] - p[0];
	PAN[1] = DRAG_START[1] - p[1];
}

window.onresize = size_change;

function size_change() {
	// Handle change in window size.
	CANVAS_SIZE = window.innerWidth / 2 - 10;
	for_ctx(ctx => {
		ctx.canvas.width = CANVAS_SIZE;
		ctx.canvas.height = CANVAS_SIZE;
	});
}

window.onload = () => {
	Z_PLANE_CTX = document.getElementById("z_plane").getContext("2d");
	W_PLANE_CTX = document.getElementById("w_plane").getContext("2d");

	size_change();
	settings_change();

	redraw();

	Z_PLANE_CTX.canvas.onmousedown = e => {
		DRAG_START = pixel_to_plane([e.clientX, e.clientY]);
		PREV_MIN = MIN;
		PREV_MAX = MAX;
		Z_PLANE_CTX.canvas.onmousemove = handle_pan_event;
	};
	Z_PLANE_CTX.canvas.onmouseup = _ => {Z_PLANE_CTX.canvas.onmousemove = undefined;};
	Z_PLANE_CTX.canvas.onmouseleave = _ => {Z_PLANE_CTX.canvas.onmousemove = undefined;};

	var F_INPUT = document.getElementById("f_input");
	var input_div = document.getElementById("input_div");
	F_INPUT.oninput = () => {
		try {
			CURRENT_TRANSFORM = parse_expr(F_INPUT.value);
			console.log("parsed expression!");
			input_div.className = "parse-succeeded";
		} catch (e) {
			console.log(`caught '${e}' in parsing`);
			input_div.className = "parse-failed";
		}
	};
};

function draw_line(ctx, points) {
	ctx.beginPath();
	points.forEach(p => ctx.lineTo(p[0], p[1]));
	ctx.save();
	ctx.resetTransform();
	ctx.lineWidth = 2;
	ctx.stroke();
	ctx.restore();
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

function in_plane(z) {
	let A = Math.max(Math.abs(MIN[0]), Math.abs(MAX[0]), Math.abs(MIN[1]), Math.abs(MAX[1]));
	return -A <= z[0] && z[0] <= A && -A <= z[1] && z[1] <= A;
}

function extend_end(z, v) {
	let [x, y] = z;
	for (let i = 0; i < MAX_EXTEND_ITERS; i++) {
		if (!in_plane(CURRENT_TRANSFORM([x, y]))) {
			break;
		}
		x += v[0];
		y += v[1];
		v[0] *= 2;
		v[1] *= 2;
	}
	return [x, y];
}

function expand_bounds(z1, z2) {
	return [extend_end(z1, sub(z1, z2)), extend_end(z2, sub(z2, z1))];
}

function draw_line_transform(z1, z2) {
	draw_line(Z_PLANE_CTX, [z1, z2]);
	let [z1_, z2_] = expand_bounds(z1, z2);
	draw_line(W_PLANE_CTX, interpolate_line(z1_, z2_, STEPS).map(CURRENT_TRANSFORM));
}

function set_stroke(c) {
	for_ctx(ctx => ctx.strokeStyle = c);
}

function draw_grid() {
	let A = Math.max(Math.abs(MIN[0]), Math.abs(MAX[0]), Math.abs(MIN[1]), Math.abs(MAX[1]));
	for (let x = 0; x <= A; x += GRID_SPACING) {
		let p = x/A;
		set_stroke(`hsl(${60*p} 100% 50%)`);
		draw_line_transform([x, MIN[1]], [x, MAX[1]]);
		set_stroke(`hsl(${-60*p} 100% 50%)`);
		draw_line_transform([-x, MIN[1]], [-x, MAX[1]]);
	}
	for (let y = 0; y <= A; y += GRID_SPACING) {
		let p = y/A;
		set_stroke(`hsl(${180 + 60*p} 100% 50%)`);
		draw_line_transform([MIN[0], y], [MAX[0], y]);
		set_stroke(`hsl(${180 - 60*p} 100% 50%)`);
		draw_line_transform([MIN[0], -y], [MAX[0], -y]);
	}
}

function draw_axes() {
	set_stroke("black");
	[[Z_PLANE_CTX, ["x", "y"]], [W_PLANE_CTX, ["u", "v"]]].forEach(([ctx, axis_labels]) => {
		draw_line(ctx, [[MIN[0], 0], [MAX[0], 0]]);
		draw_line(ctx, [[0, MIN[1]], [0, MAX[1]]]);
		// Have to undo transform to write text.
		// ctx.save();
		// ctx.resetTransform();
		// ctx.font = "24px serif";
		// ctx.fillText(axis_labels[0], CANVAS_SIZE - 20, CANVAS_SIZE/2 + 20);
		// ctx.fillText(axis_labels[1], CANVAS_SIZE/2 + 20, 20);
		// ctx.restore();
	});
}

function isdigit(c) {
	return "0" <= c && c <= "9";
}

function parse_expr(str) {
	let i = 0;
	function next_token() {
		if (str[i] == " ") {
			while (str[i] == " ") {i++;}
		}

		if (i >= str.length) {
			i++;
			return {			// end token
				lpb: 0,
			};
		} else if (str[i] == "z") {
			i++;
			return {
				nud: () => (z => z),
			};
		} else if (str[i] == "x") {
			i++;
			return {
				nud: () => (z => Z(Re(z), 0)),
			};
		} else if (str[i] == "y") {
			i++;
			return {
				nud: () => (z => Z(Im(z), 0)),
			};
		} else if (str[i] == "+") {
			i++;
			return {
				lbp: 10,
				led: left => {
					let right = parse_expr_1(10);
					return z => add(left(z), right(z));
				},
			};
		} else if (str[i] == "-") {
			i++;
			return {
				lbp: 10,
				nud: () => {
					let expr = parse_expr_1(30);
					return z => mul(Z(-1, 0), expr(z));
				},
				led: left => {
					let right = parse_expr_1(10);
					return z => sub(left(z), right(z));
				},
			};
		} else if (str[i] == "*") {
			i++;
			return {
				lbp: 20,
				led: left => {
					let right = parse_expr_1(20);
					return z => mul(left(z), right(z));
				},
			};
		} else if (str[i] == "/") {
			i++;
			return {
				lbp: 20,
				led: left => {
					let right = parse_expr_1(20);
					return z => div(left(z), right(z));
				},
			};
		} else if (str[i] == "(") {
			i++;
			return {
				lbp: 0,
				nud: () => {
					let expr = parse_expr_1(0);
					if (token != ")") {
						throw "expected closing )";
					}
					token = next_token();
					return expr;
				},
			};
		} else if (str[i] == ")") {
			i++;
			return ")";
		} else if (isdigit(str[i])) {
			let n = 0;
			while (isdigit(str[i])) {
				n = n * 10 + parseInt(str[i]);
				i++;
			}
			if (str[i] == ".") {
				i++;
				let n_decimals = 0;
				while (isdigit(str[i])) {
					n = n * 10 + parseInt(str[i]);
					n_decimals++;
					i++;
				}
				n /= 10 ** n_decimals;
			}
			return {
				nud: () => (z => Z(n, 0)),
			};
		} else if (str[i] == "s" && str[i + 1] == "i" && str[i + 2] == "n") {
			i += 3;
			return {
				nud: () => {
					let expr = parse_expr_1(25);
					return z => sin(expr(z));
				},
			};
		} else if (str[i] == "c" && str[i + 1] == "o" && str[i + 2] == "s") {
			i += 3;
			return {
				nud: () => {
					let expr = parse_expr_1(25);
					return z => cos(expr(z));
				},
			};
		} else if (str[i] == "i") {
			i++;
			return {
				nud: () => (z => Z(0, 1)),
			};
		} else if (str[i] == "e" && str[i + 1] == "x" && str[i + 2] == "p") {
			i += 3;
			return {
				nud: () => {
					let expr = parse_expr_1(25);
					return z => exp(expr(z));
				},
			};
		}
		throw "failed to consume token";
	}

	let token = next_token();

	function parse_expr_1(rbp) {
		let prev_token = token;
		token = next_token();
		let left = prev_token.nud();
		while (rbp < token.lbp) {
			prev_token = token;
			token = next_token();
			left = prev_token.led(left);
		}
		return left;
	}

	let expr = parse_expr_1(0);
	if (i <= str.length) {
		throw "could not parse all of input";
	}
	return expr;
}

function settings_change() {
	// Reload settings.
	GRAPH_TYPE = document.querySelector("input[name='graph-type']:checked").value;
	STEPS = Math.pow(10, document.getElementById("resolution").value);
	MAX_EXTEND_ITERS = parseInt(document.getElementById("iterations").value);
	GRID_SPACING = parseFloat(document.getElementById("grid-spacing").value);
}

function redraw() {
	if (Z_PLANE_CTX && W_PLANE_CTX) {
		// Update transforms.
		update_transforms();

		// Clear canvas.
		for_ctx(ctx => ctx.clearRect(MIN[0], MIN[1], MAX[0] - MIN[0], MAX[1] - MIN[1]));

		// Draw content.
		switch (GRAPH_TYPE) {
		case "grid":
			draw_grid();
			break;
		// case "circles":
		//	draw_circles();
		//	break;
		// case "radial":
		//	draw_radial_lines();
		}
		draw_axes();
	}

	requestAnimationFrame(redraw);
}

function interpolate_circle(r) {
	let points = [];
	for (let theta = 0; theta < 2*Math.PI; theta += 2*Math.PI/STEPS) {
		points.push([r*Math.cos(theta), r*Math.sin(theta)]);
	}
	return points;
}

function draw_circle_transform(r) {
	Z_PLANE_CTX.beginPath();
	Z_PLANE_CTX.arc(0, 0, r, 0, 2*Math.PI);
	Z_PLANE_CTX.stroke();

	draw_line(W_PLANE_CTX, interpolate_circle(r).map(CURRENT_TRANSFORM));
}

function draw_circles() {
	for (let r = 0; r < PLANE_SIZE; r += PLANE_SIZE/N_LINES) {
		let p = r/PLANE_SIZE;
		set_stroke(`hsl(${360 * p} 100% 50%)`);
		draw_circle_transform(r);
	}
}

function draw_radial_line_transform(theta) {
	let r = Math.sqrt(2)*PLANE_SIZE;
	let z1 = [r*Math.cos(theta), r*Math.sin(theta)];
	let z2 = [-r*Math.cos(theta), -r*Math.sin(theta)];
	draw_line_transform(z1, z2);
}

function draw_radial_lines() {
	for (let theta = 0; theta < Math.PI; theta += Math.PI/(2*N_LINES)) {
		let p = theta/Math.PI;
		set_stroke(`hsl(${360 * p} 100% 50%)`);
		draw_radial_line_transform(theta);
	}
}
